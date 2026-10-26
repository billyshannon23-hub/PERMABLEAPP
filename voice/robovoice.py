#!/usr/bin/env python3
"""
robovoice: a custom text-to-speech voice for the Permeable-style videos.

It is built from scratch, the way vintage computer voices were:
  text -> words -> phonemes (dictionary + spelling rules) -> timing and pitch
  -> a formant synthesizer (a buzzing source shaped by vocal-tract resonances)
  -> a robotic effects chain (ring modulation, metal tube, low-bit converter, small speaker).

Markup you can put in any line:
  *word* or *a few words*   emphasis (longer, louder, pitch step)
  [pause 400]               silence in milliseconds ([pause] = 400)
  [rate 0.8] ... [rate 1]   change the speaking rate from here on
  [pitch -3]                shift pitch in semitones from here on
  {RAINN|R EY1 N}           say the text on the left with the phonemes on the right
Punctuation also makes pauses: , ; : - . ! ? ...

Usage:
  python3 robovoice.py say "TEXT" -o out.wav [--preset calm] [--pitch 0] [--rate 1]
  python3 robovoice.py preview -o previews/          (one file per emotion preset)
  python3 robovoice.py phonemes "TEXT"               (show how each word will be said)
  python3 robovoice.py add-word WORD "PH ON EH M Z"  (save a pronunciation to user_lexicon.txt)
"""
import json, math, os, re, sys, wave
import numpy as np
from scipy.signal import lfilter, butter, sosfilt, resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 22050            # synthesis rate
OUT_SR = 44100        # delivery rate
FR = 0.005            # frame length, seconds

# --------------------------------------------------------------------------- presets
PRESETS = {
    # the default narrator: deep, even, steady
    'calm':      dict(f0=74, rate=0.97, contour='flat',  emph_st=2.0, decl=-1.0, sub=0.10, buzz=0.35,
                      ring=0.16, ring_hz=68, comb=0.38, comb_ms=4.5, drive=1.6, bits=8, crush_sr=11025,
                      hp=110, lp=4600, room=0.18, gain=1.0),
    # slower, lower, with a growl one octave down
    'ominous':   dict(f0=52, rate=0.84, contour='fall',  emph_st=-2.0, decl=-2.0, sub=0.55, buzz=0.45,
                      ring=0.26, ring_hz=41, comb=0.48, comb_ms=8.0, drive=2.0, bits=7, crush_sr=9000,
                      hp=70, lp=3300, room=0.32, gain=1.0),
    # higher and quicker, pitch jumps between syllables like a beeping machine
    'excited':   dict(f0=112, rate=1.17, contour='steps', emph_st=4.0, decl=1.0, sub=0.0, buzz=0.3,
                      ring=0.2, ring_hz=118, comb=0.3, comb_ms=3.2, drive=1.8, bits=8, crush_sr=12000,
                      hp=160, lp=5200, room=0.12, gain=1.0),
    # loud and clipped, two-tone like a public address alarm
    'emergency': dict(f0=96, rate=1.06, contour='twotone', emph_st=3.0, decl=0.0, sub=0.15, buzz=0.55,
                      ring=0.3, ring_hz=92, comb=0.35, comb_ms=5.5, drive=3.2, bits=6, crush_sr=10000,
                      hp=320, lp=3400, room=0.22, gain=1.0, alarm=True),
}

# timbres change what the voice is made of; presets change how it speaks. Any timbre works with any preset.
#   classic       one deep buzzing voice (version 1)
#   chord         three machine voices locked on fixed intervals, speaking as one
#   membrane      half buzz, half breath, pushed through a wet sweeping resonance
#   transmission  a narrow radio channel with stepped pitch, static and dropouts
TIMBRES = ['classic', 'chord', 'membrane', 'transmission']

# engines replace the sound source itself. 'classic' is version 1.
#   sinewave   three pure whistles tracing speech, no buzz anywhere
#   clockwork  a slow ticking escapement rings the mouth shapes and a small metal bar
#   organ      two ranks of pipes whose harmonics are shaped into words
#   harp       a whisper played into tuned strings that ring along with it
ENGINES = ['classic', 'sinewave', 'clockwork', 'organ', 'harp', 'deep']
ENGINE_FX = {
    'sinewave':  dict(ring=0, comb=0, bits=10, crush_sr=16000, drive=1.15, room=0.3, box=0, hp=90, lp=5200),
    'clockwork': dict(ring=0, comb=0.15, bits=8, crush_sr=11025, drive=1.3, room=0.14, box=0, hp=70, lp=5200),
    'organ':     dict(ring=0, comb=0, bits=12, crush_sr=20000, drive=1.1, room=0.5, box=0, hp=45, lp=6500),
    'harp':      dict(ring=0, comb=0, bits=11, crush_sr=18000, drive=1.1, room=0.38, box=0, hp=40, lp=7000),
}

# --------------------------------------------------------------------------- phonemes
# vowels: (F1, F2, F3, duration ms[, F1b, F2b, F3b for the glide of a diphthong])
V = {
    'IY': (300, 2150, 2950, 150), 'IH': (400, 1850, 2550, 125), 'EH': (540, 1700, 2500, 140),
    'AE': (650, 1650, 2450, 200), 'AA': (720, 1150, 2550, 195), 'AO': (590, 900, 2500, 200),
    'UH': (450, 1100, 2300, 140), 'UW': (330, 950, 2250, 165), 'AH': (620, 1220, 2550, 130),
    'AX': (500, 1420, 2420, 70),  'ER': (470, 1300, 1600, 170),
    'EY': (480, 1800, 2550, 185, 330, 2200, 2750), 'AY': (680, 1150, 2500, 220, 400, 1950, 2550),
    'AW': (660, 1150, 2450, 230, 420, 900, 2300),  'OY': (560, 900, 2450, 240, 380, 1900, 2500),
    'OW': (540, 1050, 2350, 185, 420, 850, 2250),
}
# consonants: kind, (F1,F2,F3 targets/loci), duration ms, extras
C = {
    'P': ('stop', (230, 900, 2100), 85, dict(burst=(1100, 1800, 0.35), voiced=False)),
    'B': ('stop', (230, 900, 2100), 70, dict(burst=(1100, 1800, 0.20), voiced=True)),
    'T': ('stop', (230, 1700, 2650), 75, dict(burst=(4300, 2800, 0.70), voiced=False)),
    'D': ('stop', (230, 1700, 2650), 60, dict(burst=(4000, 2500, 0.38), voiced=True)),
    'K': ('stop', (230, 1900, 2500), 80, dict(burst=(2300, 1200, 0.60), voiced=False)),
    'G': ('stop', (230, 1900, 2500), 70, dict(burst=(2200, 1200, 0.32), voiced=True)),
    'F': ('fric', (320, 1100, 2100), 100, dict(fc=5200, bw=5000, af=0.16, voiced=False)),
    'V': ('fric', (320, 1100, 2100), 65, dict(fc=4200, bw=4500, af=0.07, voiced=True)),
    'TH': ('fric', (320, 1400, 2600), 95, dict(fc=5400, bw=5000, af=0.15, voiced=False)),
    'DH': ('fric', (320, 1400, 2600), 50, dict(fc=4200, bw=4500, af=0.06, voiced=True)),
    'S': ('fric', (320, 1600, 2600), 110, dict(fc=4900, bw=2200, af=0.42, voiced=False)),
    'Z': ('fric', (320, 1600, 2600), 80, dict(fc=4800, bw=2200, af=0.22, voiced=True)),
    'SH': ('fric', (320, 1900, 2600), 115, dict(fc=2900, bw=1500, af=0.45, voiced=False)),
    'ZH': ('fric', (320, 1900, 2600), 75, dict(fc=3000, bw=1700, af=0.30, voiced=True)),
    'HH': ('asp', None, 65, dict()),
    'CH': ('affr', (320, 1900, 2600), 115, dict(fc=3100, bw=1700, af=0.55, voiced=False)),
    'JH': ('affr', (320, 1900, 2600), 95, dict(fc=3000, bw=1700, af=0.30, voiced=True)),
    'M': ('nasal', (280, 1050, 2200), 75, dict()),
    'N': ('nasal', (280, 1600, 2600), 65, dict()),
    'NG': ('nasal', (280, 2000, 2700), 80, dict()),
    'L': ('liquid', (360, 1050, 2750), 70, dict()),
    'R': ('liquid', (330, 1150, 1450), 70, dict()),
    'W': ('glide', (300, 680, 2200), 70, dict()),
    'Y': ('glide', (280, 2200, 3000), 60, dict()),
}
LETTERS = {'A': 'EY1', 'B': 'B IY1', 'C': 'S IY1', 'D': 'D IY1', 'E': 'IY1', 'F': 'EH1 F', 'G': 'JH IY1',
           'H': 'EY1 CH', 'I': 'AY1', 'J': 'JH EY1', 'K': 'K EY1', 'L': 'EH1 L', 'M': 'EH1 M', 'N': 'EH1 N',
           'O': 'OW1', 'P': 'P IY1', 'Q': 'K Y UW1', 'R': 'AA1 R', 'S': 'EH1 S', 'T': 'T IY1', 'U': 'Y UW1',
           'V': 'V IY1', 'W': 'D AH1 B AH0 L Y UW0', 'X': 'EH1 K S', 'Y': 'W AY1', 'Z': 'Z IY1'}
FUNCTION = set('A AN THE OF TO AND IN IS IT AS AT BY BUT OR ARE WAS BE FROM WITH ITS FOR ON THAT THAN THEM THEY YOUR YOU WE HE SHE HAS HAVE HAD CAN WILL WOULD COULD SHOULD DOES'.split())
DIGITS = 'ZERO ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE'.split()

# --------------------------------------------------------------------------- dictionaries
def load_lexicon():
    lex = {}
    for fn in ('lexicon.txt', 'user_lexicon.txt'):          # user entries override built-in ones
        p = os.path.join(HERE, fn)
        if not os.path.exists(p): continue
        for ln in open(p):
            ln = ln.strip()
            if not ln or ln.startswith('#'): continue
            w, *ph = ln.split()
            lex[w.upper()] = ph
    return lex

def load_abbrev():
    ab = {}
    p = os.path.join(HERE, 'abbreviations.txt')
    if os.path.exists(p):
        for ln in open(p):
            if '=' in ln and not ln.strip().startswith('#'):
                k, v = ln.split('=', 1); ab[k.strip().lower()] = v.strip()
    return ab

LEX = load_lexicon(); ABBR = load_abbrev()

# --------------------------------------------------------------------------- numbers
ONES = DIGITS + 'TEN ELEVEN TWELVE THIRTEEN FOURTEEN FIFTEEN SIXTEEN SEVENTEEN EIGHTEEN NINETEEN'.split()
TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
def num_words(n):
    n = int(n)
    if n < 20: return [ONES[n]]
    if n < 100: return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n < 1000: return [ONES[n // 100], 'HUNDRED'] + (num_words(n % 100) if n % 100 else [])
    if n < 1_000_000:
        if 1100 <= n < 10000 and n % 100 and (n // 100) % 10:   # years: 1987 -> nineteen eighty seven
            return num_words(n // 100) + num_words(n % 100)
        return num_words(n // 1000) + ['THOUSAND'] + (num_words(n % 1000) if n % 1000 else [])
    return num_words(n // 1_000_000) + ['MILLION'] + (num_words(n % 1_000_000) if n % 1_000_000 else [])

# --------------------------------------------------------------------------- spelling rules (fallback for unknown words)
RULES = [  # (pattern, phonemes) tried longest first at each position
    ('TION', 'SH AH0 N'), ('SION', 'ZH AH0 N'), ('OUGH', 'AO'), ('EIGH', 'EY'), ('IGH', 'AY'), ('TCH', 'CH'),
    ('SCH', 'S K'), ('QU', 'K W'), ('PH', 'F'), ('SH', 'SH'), ('CH', 'CH'), ('TH', 'TH'), ('CK', 'K'),
    ('NG', 'NG'), ('WH', 'W'), ('KN', 'N'), ('WR', 'R'), ('GH', ''), ('EE', 'IY'), ('EA', 'IY'), ('OO', 'UW'),
    ('OU', 'AW'), ('OW', 'OW'), ('OI', 'OY'), ('OY', 'OY'), ('AI', 'EY'), ('AY', 'EY'), ('AU', 'AO'),
    ('AW', 'AO'), ('EY', 'EY'), ('IE', 'IY'), ('EW', 'UW'), ('UE', 'UW'), ('AR', 'AA R'), ('OR', 'AO R'),
    ('ER', 'ER'), ('IR', 'ER'), ('UR', 'ER'), ('CE', 'S EH'), ('CI', 'S IH'), ('CY', 'S IY'), ('GE', 'JH EH'),
    ('GI', 'JH IH'), ('X', 'K S'), ('C', 'K'), ('Q', 'K'), ('J', 'JH'), ('Y', 'IY'),
    ('A', 'AE'), ('E', 'EH'), ('I', 'IH'), ('O', 'AA'), ('U', 'AH'),
    ('B', 'B'), ('D', 'D'), ('F', 'F'), ('G', 'G'), ('H', 'HH'), ('K', 'K'), ('L', 'L'), ('M', 'M'), ('N', 'N'),
    ('P', 'P'), ('R', 'R'), ('S', 'S'), ('T', 'T'), ('V', 'V'), ('W', 'W'), ('Z', 'Z'),
]
LONG = {'A': 'EY', 'E': 'IY', 'I': 'AY', 'O': 'OW', 'U': 'UW'}
VOWEL_PH = set(V) | {'AX'}

def rules_g2p(w):
    w = re.sub('[^A-Z]', '', w.upper())
    out = []; i = 0
    silent_e = len(w) > 2 and w.endswith('E') and w[-2] not in 'AEIOU' and any(c in 'AEIOUY' for c in w[:-2])
    end = len(w) - 1 if silent_e else len(w)
    while i < end:
        # magic e: vowel + one consonant + final e -> long vowel
        if silent_e and i == end - 2 and w[i] in LONG and w[i + 1] not in 'AEIOU':
            out.append(LONG[w[i]]); i += 1; continue
        if w[i] == 'Y' and i == 0: out.append('Y'); i += 1; continue
        if w[i] == 'S' and 0 < i < end - 1 and w[i - 1] in 'AEIOU' and w[i + 1] in 'AEIOU':
            out.append('Z'); i += 1; continue
        for pat, ph in RULES:
            if w.startswith(pat, i) and i + len(pat) <= end:
                out += ph.split(); i += len(pat); break
        else: i += 1
    # collapse doubled consonants, assign stress: first vowel stressed, others reduced
    res = []
    for p in out:
        if res and res[-1] == p and p not in VOWEL_PH: continue
        res.append(p)
    first = True; final = []
    for p in res:
        if p in VOWEL_PH:
            if first: final.append(p + '1'); first = False
            else: final.append(('AH' if p in ('AE', 'EH', 'AA', 'AH', 'UH') else p) + '0')
        else: final.append(p)
    return final

def g2p(word):
    w = word.upper().strip("'")
    if w in LEX: return list(LEX[w])
    if w.endswith("'S"):
        base = g2p(w[:-2]); return base + (['S'] if base and base[-1] in ('P', 'T', 'K', 'F', 'TH') else ['Z'])
    if len(w) == 1 and w in LETTERS: return LETTERS[w].split()
    # endings on known stems
    for suf in ('S', 'ES', 'ED', 'D', 'ING', 'LY', 'ER', 'ERS'):
        if w.endswith(suf) and len(w) > len(suf) + 1:
            stem = w[:-len(suf)]
            for st in (stem, stem + 'E', stem[:-1] if len(stem) > 2 and stem[-1] == stem[-2] else None,
                       stem[:-1] + 'Y' if stem.endswith('I') else None):
                if st and st in LEX:
                    b = list(LEX[st]); last = b[-1].rstrip('012')
                    if suf in ('S', 'ES'):
                        add = ['IH0', 'Z'] if last in ('S', 'Z', 'SH', 'ZH', 'CH', 'JH') else (['S'] if last in ('P', 'T', 'K', 'F', 'TH') else ['Z'])
                        if st.endswith('Y') and not stem.endswith('Y'): b = b
                        return b + add
                    if suf in ('ED', 'D'):
                        return b + (['IH0', 'D'] if last in ('T', 'D') else (['T'] if last in ('P', 'K', 'F', 'S', 'SH', 'CH', 'TH') else ['D']))
                    if suf == 'ING': return b + ['IH0', 'NG']
                    if suf == 'LY': return b + ['L', 'IY0']
                    if suf == 'ER': return b + ['ER0']
                    if suf == 'ERS': return b + ['ER0', 'Z']
    # endings on unknown stems: ripped -> rip + T, plates -> plate + S
    for suf in ('ED', 'ES', 'S', 'ING'):
        stem = w[:-len(suf)]
        if w.endswith(suf) and len(stem) >= 3 and stem[-1] not in 'AEIOUS' and re.search('[AEIOUY]', stem):
            if stem[-1] == stem[-2]: stem = stem[:-1]
            b = rules_g2p(stem) if suf != 'ES' else rules_g2p(stem + 'E'); last = b[-1].rstrip('012')
            if suf == 'ING': return b + ['IH0', 'NG']
            if suf == 'ED': return b + (['IH0', 'D'] if last in ('T', 'D') else (['T'] if last in ('P', 'K', 'F', 'S', 'SH', 'CH', 'TH') else ['D']))
            return b + (['IH0', 'Z'] if last in ('S', 'Z', 'SH', 'ZH', 'CH', 'JH') else (['S'] if last in ('P', 'T', 'K', 'F', 'TH') else ['Z']))
    if not re.search('[AEIOUY]', w) and len(w) <= 5:      # an acronym with no vowels: spell it
        return sum((LETTERS[c].split() for c in w if c in LETTERS), [])
    return rules_g2p(w)

# --------------------------------------------------------------------------- text -> spoken items
PAUSES = {',': 190, ';': 280, ':': 280, '-': 160, '—': 240, '.': 380, '!': 380, '?': 400, '…': 520}

def normalize(text):
    """returns a list of items: ('w', word, emph, display) | ('ph', phones, emph, display) | ('pause', ms)
       | ('rate', x) | ('pitch', st) | ('q',) question end"""
    items = []
    # markup tokens are cut out first so the rest can be cleaned freely
    parts = re.split(r'(\[pause(?:\s+\d+)?\]|\[rate\s+[\d.]+\]|\[pitch\s+[-+]?[\d.]+\]|\{[^}|]+\|[^}]+\})', text)
    emph = False
    for part in parts:
        if not part: continue
        m = re.fullmatch(r'\[pause(?:\s+(\d+))?\]', part)
        if m: items.append(('pause', int(m.group(1) or 400))); continue
        m = re.fullmatch(r'\[rate\s+([\d.]+)\]', part)
        if m: items.append(('rate', float(m.group(1)))); continue
        m = re.fullmatch(r'\[pitch\s+([-+]?[\d.]+)\]', part)
        if m: items.append(('pitch', float(m.group(1)))); continue
        m = re.fullmatch(r'\{([^}|]+)\|([^}]+)\}', part)
        if m: items.append(('ph', m.group(2).split(), emph, m.group(1))); continue
        s = part.replace('...', ' … ')
        # web addresses: rainn.org -> rainn dot org
        s = re.sub(r'([A-Za-z0-9])\.(org|com|net|gov|edu|io)\b', lambda mm: mm.group(1) + ' dot ' + mm.group(2), s, flags=re.I)
        # phone numbers and digit groups joined by dashes: read digit by digit
        s = re.sub(r'\b\d+(?:-\d+){2,}\b', lambda mm: ' , '.join(' '.join(DIGITS[int(c)] for c in g) for g in mm.group(0).split('-')), s)
        s = re.sub(r'(\d+)\.(\d+)', lambda mm: mm.group(1) + ' point ' + ' '.join(DIGITS[int(c)] for c in mm.group(2)), s)
        s = re.sub(r'(\d),(\d{3})', r'\1\2', s)
        s = re.sub(r'(\d+)\s*%', r'\1 percent', s)
        toks = re.findall(r"\*|[A-Za-z0-9°][A-Za-z0-9'°.]*|[,;:!?…—]|\s-\s|\.", s)
        for tk in toks:
            tk = tk.strip()
            if tk == '*': emph = not emph; continue
            if tk in PAUSES: items.append(('pause', PAUSES[tk])); continue
            if tk == '?': items.append(('q',)); continue
            low = tk.lower().rstrip('.') if tk.lower() not in ABBR else tk.lower()
            if low in ABBR:
                rep = ABBR[low]
                if rep.startswith('#'):
                    for c in rep[1:]: items.append(('ph', LETTERS[c.upper()].split(), emph, c))
                else:
                    for w in rep.split(): items.append(('w', w, emph, w))
                continue
            core = tk.rstrip('.')
            if re.fullmatch(r'\d+', core):
                for w in num_words(core): items.append(('w', w, emph, w))
            elif core:
                items.append(('w', core, emph, core))
            if tk.endswith('.') and len(tk) > 1: items.append(('pause', PAUSES['.']))
    if text.strip().endswith('?'): items.append(('q',))
    return items

# --------------------------------------------------------------------------- prosody: phonemes with timing and pitch
def plan(text, P, rate=1.0, pitch=0.0):
    items = normalize(text)
    segs = []; words = []; cur_rate = rate * P['rate']; cur_pitch = pitch; wi = 0; question = False
    for it in items:
        k = it[0]
        if k == 'rate': cur_rate = it[1] * P['rate']; continue
        if k == 'pitch': cur_pitch = pitch + it[1]; continue
        if k == 'q': question = True; continue
        if k == 'pause':
            if segs and segs[-1]['ph'] == '_': segs[-1]['dur'] += it[1] / 1000 / max(cur_rate, 0.3)
            else: segs.append(dict(ph='_', dur=it[1] / 1000 / max(cur_rate, 0.3), word=-1))
            continue
        phones = g2p(it[1]) if k == 'w' else it[1]
        func = k == 'w' and it[1].upper() in FUNCTION and not it[2]
        words.append(dict(text=it[3], emph=it[2], seg0=len(segs)))
        for p in phones:
            base = p.rstrip('012'); st = int(p[-1]) if p[-1] in '012' else None
            if func and st is not None: st = 0
            if base == 'AH' and st == 0: base = 'AX'
            if base not in V and base not in C: continue
            if base in V:
                d = V[base][3] / 1000 * (1.0 if st == 1 else 0.8 if st == 2 else 0.55)
            else:
                d = C[base][2] / 1000
            if it[2] and (st == 1 or (st is not None and len(phones) < 4)): d *= 1.35
            segs.append(dict(ph=base, st=st, dur=d / cur_rate, word=wi, emph=it[2], pitch=cur_pitch, func=func))
        words[-1]['seg1'] = len(segs); wi += 1
    # cluster shortening and lengthening before pauses
    for i, s in enumerate(segs):
        if s['ph'] == '_' or s['ph'] in V: continue
        nb = [segs[j]['ph'] for j in (i - 1, i + 1) if 0 <= j < len(segs)]
        if any(n in C for n in nb): s['dur'] *= 0.8
    for i, s in enumerate(segs):
        if s['ph'] == '_' or i + 1 < len(segs) and segs[i + 1]['ph'] != '_': continue
        # walk back to the last vowel of the phrase
        j = i
        while j >= 0 and segs[j]['ph'] != '_' and segs[j]['ph'] not in V: segs[j]['dur'] *= 1.15; j -= 1
        if j >= 0 and segs[j]['ph'] in V: segs[j]['dur'] *= 1.4
    return segs, words, question

# --------------------------------------------------------------------------- formant synthesizer
def resonator(F, BW, sr=SR):
    C_ = -math.exp(-2 * math.pi * BW / sr); B_ = 2 * math.exp(-math.pi * BW / sr) * math.cos(2 * math.pi * F / sr)
    return 1 - B_ - C_, B_, C_

def synth_raw(segs, words, question, P, seed=7):
    rng = np.random.default_rng(seed)
    total = sum(s['dur'] for s in segs) + 0.12
    nF = int(total / FR) + 2
    t_f = np.arange(nF) * FR
    # keypoints for formant tracks
    kp_t, kp_f = [], []
    AV = np.zeros(nF); AH = np.zeros(nF); AF = np.zeros(nF); FC = np.full(nF, 4000.0); FB = np.full(nF, 3000.0)
    BWs = np.tile(np.array([60.0, 80.0, 120.0]), (nF, 1)); NAS = np.zeros(nF)
    ST = np.zeros(nF)                       # pitch offset in semitones per frame
    seg_t = []; t = 0.06
    def fr(a): return int(round(a / FR))
    for i, s in enumerate(segs):
        seg_t.append(t); d = s['dur']; a, b = fr(t), fr(t + d); ph = s['ph']
        nxt = segs[i + 1]['ph'] if i + 1 < len(segs) else '_'
        prv = segs[i - 1]['ph'] if i > 0 else '_'
        if ph == '_': t += d; continue
        if ph in V:
            v = V[ph]; tr = min(0.3 * d, 0.035)
            if len(v) > 4:   # diphthong glides from one target to another
                kp_t += [t + 0.22 * d, t + 0.88 * d]; kp_f += [v[:3], v[4:7]]
            else:
                kp_t += [t + tr, t + d - tr]; kp_f += [v[:3], v[:3]]
            AV[a:b] = 0.8 if ph == 'AX' else 1.0
        else:
            kind, loc, _, ex = C[ph]
            if kind in ('stop', 'affr'):
                clo = d * (0.55 if kind == 'affr' else 0.75); rel = t + clo
                kp_t += [t + clo * 0.5]; kp_f += [loc]
                if ex.get('voiced'): AV[a:fr(rel)] = 0.14
                if kind == 'stop':
                    fcb, bwb, amp = ex['burst']; bb = fr(rel)
                    AF[bb:bb + 2] = amp; FC[bb:bb + 2] = fcb; FB[bb:bb + 2] = bwb
                    if not ex['voiced']:
                        asp = 0.0 if prv == 'S' else (0.05 if nxt in V else 0.02)
                        if nxt in V or nxt in ('L', 'R', 'W', 'Y'):
                            AH[bb + 2:fr(t + d) + fr(asp)] = 0.55
                    else:
                        AV[bb:b] = 0.6
                else:  # affricate: closure then frication
                    AF[fr(rel):b] = ex['af']; FC[fr(rel):b] = ex['fc']; FB[fr(rel):b] = ex['bw']
                    if ex['voiced']: AV[fr(rel):b] = 0.5
            elif kind == 'fric':
                kp_t += [t + d * 0.5]; kp_f += [loc]
                AF[a:b] = ex['af']; FC[a:b] = ex['fc']; FB[a:b] = ex['bw']
                if ex['voiced']: AV[a:b] = 0.55
            elif kind == 'asp':
                AH[a:b] = 0.7
            elif kind == 'nasal':
                kp_t += [t + d * 0.25, t + d * 0.75]; kp_f += [loc, loc]
                AV[a:b] = 0.55; NAS[a:b] = 1
            else:  # liquids and glides
                kp_t += [t + d * 0.3, t + d * 0.7]; kp_f += [loc, loc]
                AV[a:b] = 0.75
        # pitch: emphasis steps, preset contour
        off = s.get('pitch', 0.0)
        if s.get('emph') and s.get('st') == 1: off += P['emph_st']
        ST[a:b] = off
        t += d
    if not kp_t: kp_t, kp_f = [0.0], [(500, 1400, 2400)]
    kp_t = np.array(kp_t); kp_f = np.array(kp_f, float)
    o = np.argsort(kp_t, kind='stable'); kp_t, kp_f = kp_t[o], kp_f[o]
    F = np.stack([np.interp(t_f, kp_t, kp_f[:, k]) for k in range(3)], 1)
    # nasals: a low, wide first resonance and damped upper formants
    F[NAS > 0, 0] = 270; BWs[NAS > 0] = [140, 260, 320]
    # contour presets act on stressed vowels word by word
    word_of_frame = np.full(nF, -1)
    for i, s in enumerate(segs):
        if s['ph'] != '_': word_of_frame[fr(seg_t[i]):fr(seg_t[i] + s['dur'])] = s['word']
    nw = max(1, len(words))
    con = np.zeros(nF)
    if P['contour'] == 'steps':
        steps = np.array([0, 3, 5, 2, 7, 4, 0, 5])
        for i, s in enumerate(segs):
            if s['ph'] in V: con[fr(seg_t[i]):fr(seg_t[i] + s['dur'])] = steps[(i * 3 + s['word']) % len(steps)]
    elif P['contour'] == 'twotone':
        con = np.where(word_of_frame % 2 == 1, 4.0, 0.0)
    elif P['contour'] == 'fall':
        con = -2.0 * np.clip(word_of_frame / nw, 0, 1)
    con += P['decl'] * np.clip(t_f / max(total, 0.1), 0, 1)
    if question: con += 4.0 * np.clip((t_f - (total - 0.5)) / 0.4, 0, 1)
    ST = ST + con
    # smooth amplitude tracks a little so nothing clicks (but keep the machine edges crisp)
    k = np.array([0.25, 0.5, 0.25])
    AV = np.convolve(AV, k, 'same'); AH = np.convolve(AH, k, 'same')
    # sample-rate tracks
    n = int(nF * FR * SR); ts = np.arange(n) / SR
    up = lambda a: np.interp(ts, t_f, a)
    if P.get('timbre') == 'transmission':
        steps = [0, 2, -1, 3, 0, -2, 1]
        for i, s_ in enumerate(segs):
            if s_['ph'] in V: ST[fr(seg_t[i]):fr(seg_t[i] + s_['dur'])] += steps[(i * 5 + s_['word'] * 3) % len(steps)]
    f0 = P['f0'] * 2 ** (up(ST) / 12)
    ph = np.cumsum(f0 / SR); frac = ph % 1.0; cyc = np.floor(ph)
    # glottal pulse (Rosenberg), differentiated: a hard buzzing edge each cycle
    op, cl = 0.42, 0.16
    g = np.where(frac < op, 0.5 * (1 - np.cos(np.pi * frac / op)),
                 np.where(frac < op + cl, np.cos(np.pi * (frac - op) / (2 * cl)), 0.0))
    src = np.diff(g, prepend=0) * 18
    src += P['buzz'] * (2 * frac - 1) * 0.35                 # a little raw sawtooth: the electric hum
    src *= 1 - P['sub'] * (cyc % 2)                          # every other pulse quieter: a growl an octave down
    noise = rng.standard_normal(n)
    tb = P.get('timbre', 'classic')
    if tb == 'chord':
        # several machines speaking at once on fixed intervals: root, a fifth above, an octave below
        def pulse(f):
            fr_ = np.cumsum(f / SR) % 1.0
            gg = np.where(fr_ < op, 0.5 * (1 - np.cos(np.pi * fr_ / op)), np.where(fr_ < op + cl, np.cos(np.pi * (fr_ - op) / (2 * cl)), 0.0))
            return np.diff(gg, prepend=0) * 18
        src = src + pulse(f0 * 1.4983) * 0.6 + pulse(f0 * 0.5) * 0.7 + pulse(f0 * 1.0035) * 0.35
    elif tb == 'membrane':
        # half buzz, half breath: a voice pushed through something wet
        breath = sosfilt(butter(2, [250, 2600], 'band', fs=SR, output='sos'), noise) * 3.2
        src = src * 0.55 + breath
    exc = src * up(AV) + noise * up(AH) * 0.35
    hop = int(FR * SR)
    def cascade(x, bwmul=1.0):
        """the vocal tract: three moving resonances, then two fixed upper ones"""
        out = x.copy()
        for kf in range(3):
            y = np.zeros(n); zi = np.zeros(2)
            for fi in range(nF):
                s0, s1 = fi * hop, min(n, (fi + 1) * hop)
                if s0 >= n: break
                A_, B_, C_ = resonator(F[fi, kf], BWs[fi, kf] * bwmul)
                y[s0:s1], zi = lfilter([A_], [1, -B_, -C_], out[s0:s1], zi=zi)
            out = y
        for Fk, Bk in ((3300, 250), (3850, 320)):
            A_, B_, C_ = resonator(Fk, Bk); out = lfilter([A_], [1, -B_, -C_], out)
        return out
    def norm(x): return x / (np.percentile(np.abs(x), 99.5) + 1e-9)
    eng = P.get('engine', 'classic')
    if eng == 'sinewave':
        # no buzz at all: three pure whistles that trace the resonances of speech, updated in small digital steps
        hold = int(0.012 * SR); out = np.zeros(n)
        lvl = np.clip(up(AV) + 0.6 * up(AH), 0, 1.2)
        for k, amp in ((0, 1.0), (1, 0.6), (2, 0.32)):
            fk = up(F[:, k]); fk = fk[(np.arange(n) // hold) * hold]
            out += amp * np.sin(2 * np.pi * np.cumsum(fk) / SR)
        out = out * lvl
    elif eng == 'clockwork':
        # the source is a slow ticking escapement instead of a buzz: every tick rings the mouth shape like a struck box
        rate_ = P['f0'] * 0.42 * 2 ** (up(ST) / 12)
        tk = np.diff(np.floor(np.cumsum(rate_ / SR)), prepend=0) > 0
        clicks = tk * np.where(np.cumsum(tk) % 2, 1.0, -0.8) * 40
        body = cascade(clicks * up(AV) + noise * up(AH) * 0.35, bwmul=0.45)
        metal = np.zeros(n)
        for fm, dec in ((430, 0.09), (1185, 0.06), (2330, 0.035), (3710, 0.02)):   # an inharmonic metal bar
            A_, B_, C_ = resonator(fm, 1 / (math.pi * dec)); metal += lfilter([A_], [1, -B_, -C_], clicks * up(AV))
        out = norm(body) + norm(metal) * 0.22
    elif eng == 'organ':
        # additive pipes: two ranks of pure harmonics whose loudness follows the shape of each sound
        out = np.zeros(n); lvl = up(AV)
        for mul, rank_gain in ((1.0, 1.0), (1.5, 0.45)):
            fb = f0 * mul; H = int(5000 / (P['f0'] * mul * 1.3))
            phase = 2 * np.pi * np.cumsum(fb) / SR
            for h in range(1, H + 1):
                fh = h * P['f0'] * mul * 2 ** (ST / 12)            # per frame, for the envelope
                w = 2 * np.pi * np.clip(fh, 0, SR * 0.45) / SR
                mag = np.ones(nF)
                for k in range(3):
                    Cc = -np.exp(-2 * np.pi * BWs[:, k] / SR); Bb = 2 * np.exp(-np.pi * BWs[:, k] / SR) * np.cos(2 * np.pi * F[:, k] / SR)
                    mag *= np.abs((1 - Bb - Cc) / (1 - Bb * np.exp(-1j * w) - Cc * np.exp(-2j * w)))
                mag /= h ** 0.6                                    # gentle roll-off like a flue pipe
                out += rank_gain * up(mag) * np.sin(h * phase)
        out = norm(out * lvl) + norm(cascade(noise * (up(AH) + 0.08 * lvl))) * 0.35
    elif eng == 'harp':
        # a whisper that never buzzes, played into a set of tuned strings that ring along with it
        wh = norm(cascade(noise * (up(AV) * 0.8 + up(AH) * 0.4)))
        strings = np.zeros(n)
        for ratio in (1, 1.5, 2, 3, 4, 6):
            fz = P['f0'] * 0.75 * ratio * 2 ** (P.get('pitch_st', 0) / 12); D = SR / fz; d0 = int(D)
            a = np.zeros(d0 + 2); a[0] = 1; a[d0] = -0.4965; a[d0 + 1] = -0.4965
            strings += lfilter([1], a, wh * 0.04) / ratio ** 0.3
        out = wh * 0.5 + norm(strings) * 1.25
    else:
        out = cascade(exc)
    # frication: shaped noise added in parallel
    fn = noise * up(AF); fy = np.zeros(n); zi = np.zeros(2)
    for fi in range(nF):
        s0, s1 = fi * hop, min(n, (fi + 1) * hop)
        if s0 >= n: break
        A_, B_, C_ = resonator(min(FC[fi], SR * 0.45), FB[fi])
        w = 2 * math.pi * min(FC[fi], SR * 0.45) / SR
        H = abs(A_ / (1 - B_ * np.exp(-1j * w) - C_ * np.exp(-2j * w)))
        fy[s0:s1], zi = lfilter([A_ / H], [1, -B_, -C_], fn[s0:s1], zi=zi)
    out = norm(out) + fy * (0.55 if eng in ('sinewave', 'organ') else 0.8)
    # word timings (relative to the start of the audio)
    wt = []
    for w in words:
        if w['seg0'] < len(segs) and w.get('seg1', w['seg0']) > w['seg0']:
            wt.append(dict(text=w['text'], t0=seg_t[w['seg0']], t1=seg_t[w['seg1'] - 1] + segs[w['seg1'] - 1]['dur']))
    return out, wt

# --------------------------------------------------------------------------- the robot
def robotize(x, P, sr=SR):
    n = len(x); t = np.arange(n) / sr
    x = x * ((1 - P['ring']) + P['ring'] * np.sin(2 * np.pi * P['ring_hz'] * t))     # ring modulation: metal
    d = max(1, int(P['comb_ms'] * sr / 1000))
    a = np.zeros(d + 1); a[0] = 1; a[d] = -P['comb']
    x = lfilter([1], a, x)                                                       # short tube resonance
    x = x / (np.max(np.abs(x)) + 1e-9)
    x = np.tanh(P['drive'] * x) / np.tanh(P['drive'])                            # overdriven amplifier
    x = sosfilt(butter(2, P['crush_sr'] * 0.46, 'low', fs=sr, output='sos'), x)   # converter filter (leaky on purpose)
    step = sr / P['crush_sr']; idx = (np.floor(np.arange(n) / step) * step).astype(int)
    x = x[np.clip(idx, 0, n - 1)]                                                # low sample-rate converter
    q = 2 ** (P['bits'] - 1); x = np.round(x * q) / q                            # few bits
    x = sosfilt(butter(2, P['hp'], 'high', fs=sr, output='sos'), x)              # small speaker
    x = sosfilt(butter(4, P['lp'], 'low', fs=sr, output='sos'), x)
    if P.get('box', 1): x = sosfilt(butter(2, [900, 2400], 'band', fs=sr, output='sos'), x) * 0.6 + x  # boxy midrange
    tb = P.get('timbre', 'classic')
    rng = np.random.default_rng(11)
    if tb == 'membrane':
        # a slowly sweeping wet comb and a bubbling wobble in the level
        dl = (0.0022 + 0.0016 * np.sin(2 * np.pi * 0.37 * t)) * sr
        idx = np.clip(np.arange(n) - dl, 0, n - 1); i0 = idx.astype(int); fr_ = idx - i0
        dly = x[i0] * (1 - fr_) + x[np.clip(i0 + 1, 0, n - 1)] * fr_
        x = x + 0.75 * dly
        wob = np.interp(t, np.arange(0, t[-1] + 0.2, 0.11), rng.uniform(0.7, 1.0, len(np.arange(0, t[-1] + 0.2, 0.11))))
        x = x * wob * (0.85 + 0.15 * np.sin(2 * np.pi * 7.3 * t))
        x = sosfilt(butter(2, [180, 3200], 'band', fs=sr, output='sos'), x) * 1.4
    elif tb == 'transmission':
        # a narrow radio channel: static underneath, a faint carrier whistle, the signal briefly dropping out
        x = sosfilt(butter(3, [380, 2900], 'band', fs=sr, output='sos'), x)
        x = x / (np.max(np.abs(x)) + 1e-9)
        drop = np.ones(n)
        for _ in range(int(t[-1] * 0.8)):
            c = rng.integers(0, n); w = int(rng.uniform(0.015, 0.04) * sr); drop[c:c + w] = 0.15
        drop = np.convolve(drop, np.ones(64) / 64, 'same')
        crackle = (rng.random(n) < 0.0015) * rng.uniform(-1, 1, n)
        hiss = sosfilt(butter(2, [1500, 4000], 'band', fs=sr, output='sos'), rng.standard_normal(n)) * 0.05
        whistle = np.sin(2 * np.pi * np.cumsum(1250 + 40 * np.sin(2 * np.pi * 0.2 * t)) / sr) * 0.02
        x = x * drop + crackle * 0.35 + hiss + whistle
    if P['room'] > 0:                                                            # a hard metal room
        r = np.zeros(n + int(0.6 * sr)); r[:n] = x
        for dl, g in ((0.029, 0.5), (0.037, 0.42), (0.053, 0.33), (0.071, 0.25)):
            k = int(dl * sr); y = lfilter([1], np.r_[1, np.zeros(k - 1), -g], np.r_[x, np.zeros(len(r) - n)])
            r += y * P['room'] * 0.5
        x = r
    return x / (np.max(np.abs(x)) + 1e-9) * 0.9

def alarm_tone(dur=0.9, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    f = np.where((t * 2.5) % 1 < 0.5, 880, 660)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / sr)) * 0.5
    x *= np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
    return sosfilt(butter(2, [400, 3000], 'band', fs=sr, output='sos'), x)

# --------------------------------------------------------------------------- the deep engine
def synth_deep(text, P, rate, pitch, seed):
    """pronunciation and rhythm from flite's dictionary; sound rebuilt from our own source (deepvoice.py)"""
    import deepvoice as dv
    chunks = []; cur = []; emph = []; r = rate * P['rate']; p = pitch
    def close(pause):
        nonlocal cur, emph
        chunks.append((' '.join(cur), pause, r, p, emph)); cur = []; emph = []
    for it in normalize(text):
        k = it[0]
        if k == 'pause': close(it[1] / 1000 / max(r, 0.3))
        elif k == 'rate': close(0); r = it[1] * P['rate']
        elif k == 'pitch': close(0); p = pitch + it[1]
        elif k in ('w', 'ph'):
            word = it[3] if k == 'ph' else it[1]
            if k == 'ph' and len(word) > 1: dv.add_word(word, it[1])
            cur.append(word)
            if it[2]: emph.append(re.sub("[^a-z0-9']", '', word.lower()))
    if cur: close(0.0)
    x, voicing, words, em, ends, pst = dv.articulate(chunks, stretch=P['stretch'])
    y, vo, words = dv.resynth(x, voicing, words, em, ends, pst, P, seed=seed)
    vo = resample_poly(vo, 441, 320)
    y = resample_poly(y, 441, 320)                      # 16 kHz -> 22.05 kHz
    # clarity: the source audio stops at 8 kHz, so rebuild the top octave for s, t, f and ch,
    # following how much hiss each moment already has between 3.5 and 7.5 kHz
    rng = np.random.default_rng(seed + 1)
    band = sosfilt(butter(4, [3500, 7500], 'band', fs=SR, output='sos'), y)
    env = np.convolve(np.abs(band), np.ones(220) / 220, 'same') * np.clip(1 - np.convolve(vo, np.ones(100) / 100, 'same')[:len(y)], 0, 1)
    air = sosfilt(butter(4, [6500, 10500], 'band', fs=SR, output='sos'), rng.standard_normal(len(y)))
    y = y + air * env * 2.2
    # presence: lift the 2-4 kHz region where consonants and vowel colour live
    y = y + sosfilt(butter(2, [1800, 4200], 'band', fs=SR, output='sos'), y) * 0.9
    y = y + sosfilt(butter(2, [55, 240], 'band', fs=SR, output='sos'), y) * 1.15   # chest: keep the depth under the clarity
    y = robotize(y, P)
    return y, [dict(text=w['text'], t0=w['t0'], t1=w['t1']) for w in words]

# --------------------------------------------------------------------------- public API
def load_profile():
    p = os.path.join(HERE, 'voice.json')
    return json.load(open(p)) if os.path.exists(p) else dict(preset='calm', pitch=0.0, rate=1.0, seed=7)

def synth(text, preset=None, pitch=None, rate=None, seed=None, alarm=None, timbre=None, engine=None):
    """Returns (audio float32 at 44.1 kHz, word timings [{text,t0,t1}], duration seconds).
       Unset arguments come from voice.json, so every video uses the same voice."""
    prof = load_profile()
    preset = preset or prof['preset']; P = dict(PRESETS[preset])
    P['timbre'] = timbre or prof.get('timbre', 'classic')
    P['engine'] = engine or prof.get('engine', 'classic'); P.update(ENGINE_FX.get(P['engine'], {}))
    if P['engine'] == 'deep':
        import deepvoice as _dv
        if not _dv.available():
            global _WARNED
            if not globals().get('_WARNED'):
                print("  ! Flite not found, so the 'deep' narrator falls back to the 'classic' voice. See docs/SETUP.md.")
                _WARNED = True
            P['engine'] = 'classic'; P.update(ENGINE_FX.get('classic', {}))
    if P['engine'] == 'deep':
        P['f0'] = max(44.0, P['f0'] * 0.8); P['ring'] *= 0.15; P['comb'] *= 0.2; P['bits'] += 2; P['room'] = min(P['room'], 0.07); P['drive'] = min(P['drive'], 1.6)
        P['crush_sr'] = max(P['crush_sr'], 12000); P['box'] = 0; P['drive'] = min(P['drive'], 2.2)
        if P['hp'] < 300: P['hp'] = 40
        P['lp'] = 10500; P['crush_sr'] = 22050; P['bits'] = max(P['bits'], 10)
        for k_, v_ in dict(intonation=0.5, throat=0.97, snap=True, stutter=False, stretch=1.17).items():
            P.setdefault(k_, v_)
    pitch = prof.get('pitch', 0.0) if pitch is None else pitch
    rate = prof.get('rate', 1.0) if rate is None else rate
    seed = prof.get('seed', 7) if seed is None else seed
    if P['engine'] == 'deep':
        y, wt = synth_deep(text, P, rate, pitch, seed)
    else:
        segs, words, q = plan(text, P, rate=rate, pitch=pitch)
        raw, wt = synth_raw(segs, words, q, P, seed=seed)
        y = robotize(raw, P)
    lead = 0.0
    if (P.get('alarm') if alarm is None else alarm):
        al = alarm_tone(); lead = len(al) / SR + 0.12
        y = np.r_[al * 0.55, np.zeros(int(0.12 * SR)), y]
        for w in wt: w['t0'] += lead; w['t1'] += lead
    y = resample_poly(y, OUT_SR // SR, 1).astype(np.float32)
    # trim trailing silence (keep the room tail short)
    env = np.abs(y); last = np.nonzero(env > 0.01)[0]
    end = min(len(y), (last[-1] if len(last) else len(y)) + int(0.25 * OUT_SR)); y = y[:end]
    return y * P['gain'], wt, len(y) / OUT_SR

def write_wav(path, y, sr=OUT_SR):
    y = np.clip(y, -1, 1); st = np.stack([y, y], 1) if y.ndim == 1 else y
    w = wave.open(path, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((st * 32767).astype(np.int16).tobytes()); w.close()

# --------------------------------------------------------------------------- command line
def main(argv):
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('say'); s.add_argument('text'); s.add_argument('-o', '--out', default='say.wav')
    s.add_argument('--preset', choices=PRESETS); s.add_argument('--pitch', type=float, help='semitones, e.g. -3 deeper')
    s.add_argument('--rate', type=float, help='speaking rate, 1 = normal'); s.add_argument('--timbre', choices=TIMBRES); s.add_argument('--engine', choices=ENGINES); s.add_argument('--no-alarm', action='store_true')
    p = sub.add_parser('preview'); p.add_argument('-o', '--out', default='previews'); p.add_argument('--timbres', action='store_true', help='compare timbres instead of presets'); p.add_argument('--engines', action='store_true', help='compare engines')
    p.add_argument('--text', default='The body treats the ink as an *invader*. [pause 300] Macrophages swallow it, but they cannot break it down.')
    ph = sub.add_parser('phonemes'); ph.add_argument('text')
    aw = sub.add_parser('add-word'); aw.add_argument('word'); aw.add_argument('phonemes')
    a = ap.parse_args(argv)
    if a.cmd == 'say':
        y, wt, d = synth(a.text, a.preset, a.pitch, a.rate, alarm=False if a.no_alarm else None, timbre=a.timbre, engine=a.engine)
        write_wav(a.out, y); print(f'{a.out}  {d:.2f}s')
    elif a.cmd == 'preview':
        os.makedirs(a.out, exist_ok=True)
        for name in (ENGINES if a.engines else TIMBRES if a.timbres else PRESETS):
            y, wt, d = synth(a.text, engine=name) if a.engines else synth(a.text, timbre=name) if a.timbres else synth(a.text, name); fn = os.path.join(a.out, f'voice_{name}.wav'); write_wav(fn, y)
            print(f'{fn}  {d:.2f}s')
    elif a.cmd == 'phonemes':
        for it in normalize(a.text):
            if it[0] == 'w': print(f'{it[1]:>16}  {" ".join(g2p(it[1]))}' + ('  (emphasis)' if it[2] else '') + ('' if it[1].upper() in LEX else '  [rules]'))
            elif it[0] == 'ph': print(f'{it[3]:>16}  {" ".join(it[1])}')
            elif it[0] == 'pause': print(f'{"":>16}  ({it[1]} ms pause)')
    elif a.cmd == 'add-word':
        with open(os.path.join(HERE, 'user_lexicon.txt'), 'a') as f: f.write(f'{a.word.upper()} {a.phonemes.upper()}\n')
        print('saved', a.word.upper(), a.phonemes.upper())

if __name__ == '__main__':
    main(sys.argv[1:])
