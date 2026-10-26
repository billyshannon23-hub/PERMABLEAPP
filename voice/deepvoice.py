"""
deepvoice: the 'deep' engine for robovoice.

Flite (installed on this machine) is used only for the parts of speech that are about language:
the full CMU pronunciation dictionary (~130k words), trained spelling rules for unknown words,
and natural phrase rhythm. Its sound is then thrown away. We keep only the shape of the mouth,
frame by frame (an LPC spectral envelope), and rebuild the voice from our own parts:

  - a very low source (~50 Hz) with most of the intonation pressed flat
  - a bigger throat: every resonance moved down, as if the speaker were huge
  - a whisper layered under the voice, speaking the same words
  - a slow rattle (vocal fry) as each phrase runs out of air
  - mouth shapes updated in coarse steps, like a vintage LPC speech chip
"""
import ctypes as C, os, re, tempfile
import numpy as np
from scipy.linalg import solve_toeplitz
from scipy.signal import lfilter, medfilt, resample_poly

# where the Flite libraries live. Set FLITE_LIBDIR to override; otherwise the usual places are searched.
def _find_libdir():
    cands = [os.environ.get('FLITE_LIBDIR', ''), '/usr/lib/x86_64-linux-gnu/', '/usr/lib/aarch64-linux-gnu/', '/usr/lib/', '/usr/local/lib/', '/opt/homebrew/lib/']
    for d in cands:
        if d and os.path.exists(os.path.join(d, 'libflite.so.1')):
            return d.rstrip('/') + '/'
    return None
LIBDIR = _find_libdir() or '/usr/lib/x86_64-linux-gnu/'

def available():
    """True when the Flite libraries can be loaded (the 'deep' narrator needs them)"""
    try:
        _flite(); return True
    except Exception:
        return False
FSR = 16000
_fl = None; _voices = {}

class _Wave(C.Structure):
    _fields_ = [('type', C.c_char_p), ('sample_rate', C.c_int), ('num_samples', C.c_int),
                ('num_channels', C.c_int), ('samples', C.POINTER(C.c_short))]

def _flite(voice='kal16'):
    """load flite once; 'rms' is a deep American male recording, used only for articulation"""
    global _fl
    if _fl is None:
        for n in ('libflite.so.1', 'libflite_usenglish.so.1', 'libflite_cmulex.so.1'):
            C.CDLL(LIBDIR + n, mode=C.RTLD_GLOBAL)
        _fl = C.CDLL(LIBDIR + 'libflite.so.1'); _fl.flite_init()
        sig = [('flite_synth_text', C.c_void_p, [C.c_char_p, C.c_void_p]), ('utt_wave', C.POINTER(_Wave), [C.c_void_p]),
               ('utt_relation', C.c_void_p, [C.c_void_p, C.c_char_p]), ('relation_head', C.c_void_p, [C.c_void_p]),
               ('item_next', C.c_void_p, [C.c_void_p]), ('ffeature_string', C.c_char_p, [C.c_void_p, C.c_char_p]),
               ('ffeature_float', C.c_float, [C.c_void_p, C.c_char_p]), ('delete_utterance', None, [C.c_void_p]),
               ('flite_feat_set_float', None, [C.c_void_p, C.c_char_p, C.c_float])]
        for name, r, a in sig:
            f = getattr(_fl, name); f.restype = r; f.argtypes = a
    if voice not in _voices:
        lib = C.CDLL(LIBDIR + f'libflite_cmu_us_{voice}.so.1', mode=C.RTLD_GLOBAL)
        reg = getattr(lib, f'register_cmu_us_{voice}'); reg.restype = C.c_void_p; reg.argtypes = [C.c_char_p]
        v = reg(None); _voices[voice] = v
        _add_lexicon(v)
    return _fl, _voices[voice]

ARPA_V = {'AA', 'AE', 'AH', 'AO', 'AW', 'AX', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'}

def _add_lexicon(v):
    """our own pronunciations (user_lexicon.txt and overrides.txt) take priority over flite's dictionary"""
    here = os.path.dirname(os.path.abspath(__file__)); lines = []
    for fn in ('overrides.txt', 'user_lexicon.txt'):
        p = os.path.join(here, fn)
        if not os.path.exists(p): continue
        for ln in open(p):
            ln = ln.strip()
            if not ln or ln.startswith('#'): continue
            w, *ph = ln.split()
            ph = [(x.lower() if x[-1].isdigit() else x.lower()) for x in ph]
            ph = [('ah0' if x.startswith('ax') else x[:-1] + '0' if x.endswith('2') else x) for x in ph]
            lines.append(f'{w.lower()} : {" ".join(ph)}')
    if not lines: return
    try:
        f = getattr(_fl, 'flite_voice_add_lex_addenda'); f.restype = C.c_int; f.argtypes = [C.c_void_p, C.c_char_p]
        tf = tempfile.NamedTemporaryFile('w', suffix='.lex', delete=False); tf.write('\n'.join(lines) + '\n'); tf.close()
        f(v, tf.name.encode())
    except AttributeError:
        pass

def add_word(word, phones):
    """teach flite one pronunciation at run time ({word|PH ON EH M Z} markup)"""
    fl, v = _flite()
    f = getattr(fl, 'flite_voice_add_lex_addenda', None)
    if f is None: return
    f.restype = C.c_int; f.argtypes = [C.c_void_p, C.c_char_p]
    ph = ' '.join(('ah0' if x.lower().startswith('ax') else x.lower()[:-1] + '0' if x.endswith('2') else x.lower()) for x in phones)
    tf = tempfile.NamedTemporaryFile('w', suffix='.lex', delete=False); tf.write(f'{word.lower()} : {ph}\n'); tf.close()
    f(v, tf.name.encode())

VOICED = set('aa ae ah ao aw ax axr ay eh er ey ih iy ow oy uh uw b d g v dh z zh jh m n ng l r w y el em en'.split())
HALF = set('v dh z zh jh b d g'.split())

def articulate(chunks, stretch=1.0, voice='kal16'):
    """chunks: [(text, pause_after_s, rate, pitch_st, [emph words lower])]
       returns 16 kHz audio, per-sample voicing, word timings, emphasis spans, phrase ends, pitch offsets"""
    fl, v = _flite(voice)
    audio = []; voicing = []; words = []; emph = []; ends = []; pst = []; t = 0.0
    lead = np.zeros(int(0.05 * FSR)); audio.append(lead); voicing.append(lead); pst.append(lead); t += len(lead) / FSR
    for text, pause, rate, pitch_st, emph_words in chunks:
        if text.strip():
            fl.flite_feat_set_float(C.cast(C.c_void_p(v), C.POINTER(C.c_void_p))[1], b'duration_stretch', float(stretch / max(rate, 0.3)))  # voice->features
            u = fl.flite_synth_text(text.encode(), v)
            w = fl.utt_wave(u).contents
            y = np.ctypeslib.as_array(w.samples, (w.num_samples,)).astype(np.float32) / 32768
            segs = []; it = fl.relation_head(fl.utt_relation(u, b'Segment')); prev = 0.0
            while it:
                name = fl.ffeature_string(it, b'name').decode(); end = fl.ffeature_float(it, b'end')
                wd = fl.ffeature_string(it, b'R:SylStructure.parent.parent.name').decode()
                segs.append((name, prev, end, wd)); prev = end; it = fl.item_next(it)
            fl.delete_utterance(u)
            # trim flite's own leading/trailing silence; our pauses decide the spacing
            s0 = segs[0][2] if segs and segs[0][0] == 'pau' else 0.0
            s1 = segs[-1][1] if segs and segs[-1][0] == 'pau' else len(y) / FSR
            s0 = max(0.0, s0 - 0.02); s1 = min(len(y) / FSR, s1 + 0.06)
            y = y[int(s0 * FSR):int(s1 * FSR)]
            vc = np.zeros(len(y), np.float32)
            cur = None; ew = list(emph_words)
            for name, a, b, wd in segs:
                if name == 'pau': continue
                a_, b_ = int((a - s0) * FSR), int((b - s0) * FSR)
                vc[max(0, a_):max(0, b_)] = 1.0 if name in VOICED - HALF else (0.55 if name in HALF else 0.0)
                if wd != '0':
                    if cur is None or cur['_w'] != wd or cur['_end'] < a - 1e-4:
                        cur = dict(text=wd, t0=t + a - s0, t1=t + b - s0, _w=wd, _end=b); words.append(cur)
                        if ew and wd == ew[0]: emph.append(cur); ew.pop(0)
                        elif wd in ew: emph.append(cur); ew.remove(wd)
                    else:
                        cur['t1'] = t + b - s0; cur['_end'] = b
            audio.append(y); voicing.append(vc); pst.append(np.full(len(y), pitch_st, np.float32))
            t += len(y) / FSR; ends.append(t)
        if pause > 0:
            z = np.zeros(int(pause * FSR), np.float32); audio.append(z); voicing.append(z); pst.append(z); t += pause
    tail = np.zeros(int(0.1 * FSR), np.float32); audio.append(tail); voicing.append(tail); pst.append(tail)
    for w in words: w.pop('_w', None); w.pop('_end', None)
    return np.concatenate(audio), np.concatenate(voicing), words, emph, ends, np.concatenate(pst)

# --------------------------------------------------------------------------- analysis / resynthesis
NFFT, HOP, ORDER = 1024, 128, 18

def _frames(x):
    xp = np.r_[np.zeros(NFFT // 2), x, np.zeros(NFFT)]
    m = 1 + (len(x)) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(m)[:, None]
    return xp[idx]

def _ola(F, n):
    win = np.hanning(NFFT); out = np.zeros(n + 2 * NFFT); wsum = np.zeros_like(out)
    for i, fr in enumerate(F):
        out[i * HOP:i * HOP + NFFT] += fr * win; wsum[i * HOP:i * HOP + NFFT] += win ** 2
    out = out / np.maximum(wsum, 1e-6)
    return out[NFFT // 2:NFFT // 2 + n]

def envelopes(x):
    """LPC spectral envelope for each frame (mouth shape), and frame loudness"""
    pre = lfilter([1, -0.92], [1], x)
    F = _frames(pre) * np.hanning(NFFT)
    env = np.zeros((len(F), NFFT // 2 + 1)); gain = np.zeros(len(F))
    w = np.exp(-1j * np.outer(np.arange(NFFT // 2 + 1) * np.pi / (NFFT // 2), np.arange(ORDER + 1)))
    for i, fr in enumerate(F):
        r = np.correlate(fr, fr, 'full')[NFFT - 1:NFFT + ORDER]
        gain[i] = np.sqrt(r[0] / NFFT)
        if r[0] < 1e-9: env[i] = 1e-6; continue
        r[0] *= 1.0001; r *= np.exp(-0.5 * (2 * np.pi * 40 * np.arange(ORDER + 1) / FSR) ** 2)  # lag window
        a = solve_toeplitz(r[:ORDER], -r[1:ORDER + 1])
        A = np.abs(w @ np.r_[1, a]); env[i] = 1 / np.maximum(A, 1e-4)
    return env, gain

def pitch_track(x):
    """rough fundamental frequency per frame (for the small amount of intonation we keep)"""
    F = _frames(x)[:, :640] * np.hanning(640); f0 = np.zeros(len(F))
    lo, hi = int(FSR / 260), int(FSR / 60)
    for i, fr in enumerate(F):
        r = np.correlate(fr, fr, 'full')[639:]
        if r[0] < 1e-6: continue
        k = lo + np.argmax(r[lo:hi]);
        if r[k] / r[0] > 0.35: f0[i] = FSR / k
    v = f0 > 0
    if v.sum() > 3:
        f0[~v] = np.interp(np.nonzero(~v)[0], np.nonzero(v)[0], f0[v])
    else:
        f0[:] = 110
    return medfilt(f0, 7)

def _levinson(r, order):
    a = solve_toeplitz(r[:order], -r[1:order + 1]); E = r[0] + np.dot(a, r[1:order + 1])
    return np.r_[1, a], max(E, 1e-12)

def resynth(x, voicing, words, emph, ends, pst, P, seed=7):
    """Rebuild the voice in the time domain, like an LPC speech chip: our own excitation through
    an all-pole mouth filter that changes every 8 ms. Returns audio, voicing, and adjusted word times."""
    rng = np.random.default_rng(seed)
    n = len(x); m = 1 + n // HOP; tf = np.arange(m) * HOP / FSR
    # ---- analysis: mouth shape per frame (on a 32 ms window, so consonants stay sharp)
    W = 512; pre = lfilter([1, -0.92], [1], x)
    xp = np.r_[np.zeros(W // 2), pre, np.zeros(W)]
    win = np.hanning(W); k_warp = P.get('throat', 0.93); nb = 1024
    coefs = np.zeros((m, ORDER + 1)); gains = np.zeros(m)
    wgrid = np.exp(-1j * np.outer(np.arange(nb // 2 + 1) * np.pi / (nb // 2), np.arange(ORDER + 1)))
    for i in range(m):
        fr = xp[i * HOP:i * HOP + W] * win
        r = np.correlate(fr, fr, 'full')[W - 1:W + ORDER].copy()
        if r[0] < 1e-8: coefs[i] = np.r_[1, np.zeros(ORDER)]; continue
        r[0] *= 1.0001; r *= np.exp(-0.5 * (2 * np.pi * 50 * np.arange(ORDER + 1) / FSR) ** 2)
        a, E = _levinson(r, ORDER)
        if abs(k_warp - 1) > 1e-3:
            # move every resonance: rebuild the power spectrum on a stretched axis and refit the filter
            Pw = E / np.abs(wgrid @ a) ** 2
            bins = np.arange(nb // 2 + 1); Pw = np.interp(bins * k_warp, bins, Pw)
            rw = np.fft.irfft(Pw)[:ORDER + 1]; rw[0] *= 1.0001
            a, E = _levinson(rw, ORDER)
        coefs[i] = a; gains[i] = np.sqrt(E / W)
    # ---- pitch: deep, words snapped to a few fixed notes (a machine that can only hold three pitches)
    f0_in = pitch_track(x); med = np.median(f0_in[f0_in > 0]) if np.any(f0_in > 0) else 110
    st = P.get('intonation', 0.5) * 12 * np.log2(np.maximum(f0_in, 40) / med)
    notes = np.array(P.get('notes', [-3, 0, 2]))
    if P.get('snap', True):
        for w in words:
            k = (tf >= w['t0']) & (tf <= w['t1'])
            if k.any(): st[k] = notes[np.argmin(np.abs(notes - np.mean(st[k])))]
    st += np.interp(tf, np.arange(n) / FSR, pst)
    steps = [0, 3, 5, 2, 7, 4]
    for i_, w in enumerate(words):
        k = (tf >= w['t0']) & (tf <= w['t1'])
        if w in emph: st[k] += P.get('emph_st', 2.0)
        if P.get('contour') == 'twotone' and i_ % 2: st[k] += 4
        if P.get('contour') == 'steps': st[k] += steps[i_ % len(steps)]
    st += P.get('decl', 0) * tf / max(tf[-1], 0.1)
    f0s = P['f0'] * 2 ** (np.interp(np.arange(n) / FSR, tf, st) / 12)
    # ---- excitation: a hard glottal edge for voiced sounds, clean noise for the rest (no breath on vowels)
    ph = np.cumsum(f0s / FSR); frac = ph % 1; cyc = np.floor(ph)
    op, cl = 0.36, 0.10
    g = np.where(frac < op, 0.5 * (1 - np.cos(np.pi * frac / op)), np.where(frac < op + cl, np.cos(np.pi * (frac - op) / (2 * cl)), 0.0))
    soft = np.diff(g, prepend=0); soft /= np.sqrt(np.mean(soft ** 2)) + 1e-9
    imp = (np.diff(cyc, prepend=0) > 0).astype(float); imp = np.convolve(imp, [0.25, 0.5, 0.25], 'same')
    imp /= np.sqrt(np.mean(imp ** 2)) + 1e-9
    pulse = 0.75 * imp + 0.35 * soft                      # a flat, bright click train: every harmonic gets through the mouth filter
    pulse *= 1 - P.get('sub', 0.3) * 0.6 * (cyc % 2)
    pulse /= np.sqrt(np.mean(pulse ** 2)) + 1e-9
    v = np.convolve(voicing, np.ones(48) / 48, 'same')
    exc = np.sqrt(np.clip(v, 0, 1)) * pulse + np.sqrt(np.clip(1 - v, 0, 1)) * rng.standard_normal(n) * 1.5   # consonants a little louder: they carry the words
    # ---- the mouth filter, switched every frame with its state carried over
    out = np.zeros(n); zi = np.zeros(ORDER)
    for i in range(m):
        s0, s1 = i * HOP, min(n, (i + 1) * HOP)
        if s0 >= n: break
        out[s0:s1], zi = lfilter([gains[i]], coefs[i], exc[s0:s1], zi=zi)
    out = lfilter([1], [1, -0.5], out)
    out = out / (np.percentile(np.abs(out), 99.7) + 1e-9)
    # ---- signature: a digital stutter (the start of a stressed word repeats, like a skipping buffer)
    vout = voicing.copy(); words = [dict(w) for w in words]
    targets = [w for w in words if any(w['text'] == e['text'] and abs(w['t0'] - e['t0']) < 1e-6 for e in emph)]
    if P.get('stutter', True):
        firsts = [words[0]] if words else []
        for e in ends[:-1]:
            nxt = [w for w in words if w['t0'] > e + 0.05]
            if nxt: firsts.append(nxt[0])
        targets += [w for w in firsts if w not in targets][:2]
    shift = 0.0; pieces = []; vpieces = []; last = 0
    for w in sorted(targets, key=lambda w: w['t0']):
        a = int(w['t0'] * FSR); L = int(0.045 * FSR)
        if a + L >= n: continue
        grain = out[a:a + L] * np.r_[np.ones(L - 40), np.linspace(1, 0, 40)]
        grain = np.round(grain * 24) / 24                      # the repeat is lower resolution, like a cheap buffer
        pieces += [out[last:a], grain * 0.85, np.zeros(int(0.012 * FSR))]
        vpieces += [vout[last:a], np.zeros(L), np.zeros(int(0.012 * FSR))]
        last = a; ins = (L + int(0.012 * FSR)) / FSR
        for ww in words:
            if ww['t0'] >= w['t0'] - 1e-6: ww['t0'] += ins; ww['t1'] += ins
        shift += ins
    pieces.append(out[last:]); vpieces.append(vout[last:])
    return np.concatenate(pieces), np.concatenate(vpieces), words
