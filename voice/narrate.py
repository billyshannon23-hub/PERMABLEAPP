#!/usr/bin/env python3
"""
narrate: add the robot narrator to a finished video project.

  python3 narrate.py PROJECT_DIR [--preset calm] [--out ../out/name.mp4]
  (usually run for you by: python3 tools/kit.py make PROJECT)

PROJECT_DIR holds sim.html, meta.json (from a capture) and score.wav.
What it does:
  1. speaks every caption (or the line from PROJECT_DIR/narration.json, if there is one)
  2. fits each line into its caption's time slot: speeds up a little if needed, and if it still
     doesn't fit, pushes the next caption later instead of talking over it
  3. writes voice_timing.json: when each caption starts and when each word is spoken
  4. re-captures the frames with that timing injected, so captions type out in step with the voice
  5. ducks the music under the voice, mixes, and encodes the mp4

narration.json (optional):
  {"preset": "calm", "lines": ["spoken text for caption 0 (markup allowed)", null, ...]}
  null (or a missing line) means: say the caption as written.
"""
import argparse, asyncio, base64, json, os, re, subprocess, sys, wave
import numpy as np
from scipy.signal import resample_poly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import robovoice as rv

def read_wav(p):
    w = wave.open(p); sr = w.getframerate(); ch = w.getnchannels()
    y = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    y = y.reshape(-1, ch)
    if ch == 1: y = np.repeat(y, 2, 1)
    if sr != rv.OUT_SR: y = resample_poly(y, rv.OUT_SR, sr, axis=0)
    return y

def words_of(s): return [w for w in re.findall(r"[A-Za-z0-9']+", s)]

def reveal_map(caption, wt):
    """caption character positions against speech time: each caption word is typed while it is spoken"""
    toks = [(m.start(), m.end(), re.sub("[^a-z0-9]", "", m.group().lower())) for m in re.finditer(r"[A-Za-z0-9'.\-]+", caption)]
    spoken = [re.sub("[^a-z0-9]", "", w['text'].lower()) for w in wt]
    pts = [(0.0, 0)]; j = 0; L = len(caption)
    for a, b, tk in toks:
        k = next((x for x in range(j, min(len(wt), j + 6)) if spoken[x] == tk), None)
        if k is None: continue
        t0, t1 = wt[k]['t0'], wt[k]['t1']
        if t0 > pts[-1][0]: pts.append((t0, max(pts[-1][1], a)))
        pts.append((max(t1, pts[-1][0] + 0.01), b)); j = k + 1
    if len(pts) < 3 or pts[-1][1] < L * 0.6:      # text differs from what is said: type in proportion instead
        T = wt[-1]['t1'] if wt else 1.0; s0 = wt[0]['t0'] if wt else 0
        return [[0.0, 0], [s0, 0], [T, L]]
    end_t = wt[-1]['t1'] if wt else pts[-1][0]
    pts.append((max(end_t, pts[-1][0]) + 0.05, L))
    return [[round(t, 3), int(c)] for t, c in pts]

async def capture(project, timing, warp=None, N=None):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script('window.__VT=' + json.dumps(timing) + ';' + ('window.__TW=' + json.dumps(warp) + ';' if warp else ''))
        await pg.goto('file://' + os.path.abspath(os.path.join(project, 'sim.html'))); await pg.wait_for_timeout(300)
        N = N or await pg.evaluate('__R.N'); fd = os.path.join(project, 'fv'); os.system(f'rm -rf "{fd}"; mkdir -p "{fd}"')
        for k in range(0, N, 24):
            res = await pg.evaluate('(a)=>a.map(f=>__R.frame(f))', list(range(k, min(N, k + 24))))
            for i, u in enumerate(res): open(os.path.join(fd, f'f{k + i:05d}.png'), 'wb').write(base64.b64decode(u.split(',')[1]))
            if errs: break
        await b.close()
        if errs: raise SystemExit('capture error: ' + errs[0])
    return fd

def warp_audio(x, knots, n, nfft=2048, hs=512):
    """stretch the music to follow the video's slow-downs without changing its pitch (phase vocoder)"""
    kv = np.array([k[0] for k in knots]); ks = np.array([k[1] for k in knots])
    sr = rv.OUT_SR; win = np.hanning(nfft); m = n // hs + 2
    tv = np.arange(m) * hs / sr
    ts = np.interp(tv, kv, ks, right=None); ts = np.where(tv > kv[-1], ks[-1] + (tv - kv[-1]), ts)
    pos = ts * sr
    xp = np.r_[x, np.zeros((nfft * 2, x.shape[1]), np.float32)]
    out = np.zeros((m * hs + nfft, x.shape[1])); wsum = np.zeros(m * hs + nfft)
    k = np.arange(nfft // 2 + 1); omega = 2 * np.pi * k / nfft
    for c in range(x.shape[1]):
        acc = None; prev = None; prev_p = None
        for j in range(m):
            p = int(pos[j])
            if p + nfft >= len(xp): break
            X = np.fft.rfft(xp[p:p + nfft, c] * win)
            if prev is None: acc = np.angle(X)
            else:
                dp = max(1, p - prev_p)
                dphi = np.angle(X) - np.angle(prev) - omega * dp
                dphi = (dphi + np.pi) % (2 * np.pi) - np.pi
                acc = acc + (omega + dphi / dp) * hs
            prev, prev_p = X, p
            fr = np.fft.irfft(np.abs(X) * np.exp(1j * acc)) * win
            out[j * hs:j * hs + nfft, c] += fr
            if c == 0: wsum[j * hs:j * hs + nfft] += win ** 2
    out = out / np.maximum(wsum, 1e-3)[:, None]
    return out[:n].astype(np.float32)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('project'); ap.add_argument('--preset'); ap.add_argument('--out')
    ap.add_argument('--max-speed', type=float, default=1.1); ap.add_argument('--duck', type=float, default=0.55)
    ap.add_argument('--voice-gain', type=float, default=0.62); ap.add_argument('--no-render', action='store_true')
    a = ap.parse_args(); P = a.project
    meta = json.load(open(os.path.join(P, 'meta.json'))); DUR = meta['N'] / 24; caps = meta['caps']
    script = json.load(open(os.path.join(P, 'narration.json'))) if os.path.exists(os.path.join(P, 'narration.json')) else {}
    preset = a.preset or script.get('preset'); lines = script.get('lines', [])
    vpitch = script.get('pitch'); vrate = script.get('rate', 1.0)
    timing = []; clips = []; prev_end = 0.0; knots = [[0.0, 0.0]]
    for i, (t, cap) in enumerate(caps):
        say = lines[i] if i < len(lines) and lines[i] else cap.capitalize()
        # keep the original spacing between captions, unless the previous line is still being spoken:
        # then the video slows down here instead of the voice speeding up
        start = t if i == 0 else max(timing[-1]['start'] + (t - caps[i - 1][0]), prev_end + 0.25)
        gap = (caps[i + 1][0] - t) if i + 1 < len(caps) else (DUR - t)
        y, wt, d = rv.synth(say, preset=preset, pitch=vpitch, rate=vrate); rate = 1.0
        if d > gap - 0.25 and a.max_speed > 1.0:
            rate = min(a.max_speed, d / max(0.5, gap - 0.25)); y, wt, d = rv.synth(say, preset=preset, pitch=vpitch, rate=rate * vrate)
        if start > t + 1e-3: print(f'  · caption {i} waits {start - t:.2f}s for the voice (the video slows down before it)')
        if start - knots[-1][0] > 1e-3: knots.append([round(start, 3), t])
        timing.append(dict(start=round(start, 3), dur=round(d, 3), rate=round(rate, 3), say=say, reveal=reveal_map(cap, wt)))
        clips.append((start, y)); prev_end = start + d
        print(f'  {i:2d} {start:6.2f}s  {d:4.2f}s  x{rate:.2f}  {say[:60]}')
    DUR_V = max(timing[-1]['start'] + (DUR - caps[-1][0]), prev_end + 0.8)
    knots.append([round(DUR_V, 3), DUR])
    print(f'  video length {DUR:.1f}s -> {DUR_V:.1f}s')
    json.dump(timing, open(os.path.join(P, 'voice_timing.json'), 'w'), indent=1)
    json.dump(knots, open(os.path.join(P, 'voice_warp.json'), 'w'))
    # mix: voice in the center, music ducked under it
    n = int(rv.OUT_SR * DUR_V); vo = np.zeros(n, np.float32)
    for st, y in clips:
        i0 = int(st * rv.OUT_SR); k = min(len(y), n - i0)
        if k > 0: vo[i0:i0 + k] += y[:k]
    env = np.abs(vo); win = int(0.03 * rv.OUT_SR)
    env = np.convolve(env, np.ones(win) / win, 'same'); g = np.clip(env / 0.08, 0, 1)
    # slow release so the music doesn't pump between words
    rel = np.exp(-1 / (0.45 * rv.OUT_SR))
    from scipy.signal import lfilter
    g2 = np.maximum(g, lfilter([1 - rel], [1, -rel], g) * 1.6).clip(0, 1)
    sc_p = os.path.join(P, 'score.wav'); mus = read_wav(sc_p) if os.path.exists(sc_p) else np.zeros((n, 2), np.float32)
    mus = warp_audio(mus, knots, n)
    mix = mus * (1 - a.duck * g2)[:, None] + (vo * a.voice_gain)[:, None]
    mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix /= max(1.0, np.abs(mix).max() / 0.97)
    rv.write_wav(os.path.join(P, 'narrated.wav'), mix)
    rv.write_wav(os.path.join(P, 'voice_only.wav'), vo / (np.abs(vo).max() + 1e-9) * 0.9)
    if a.no_render: print('timing and audio written'); return
    fd = asyncio.run(capture(P, timing, knots, int(round(DUR_V * 24))))
    out = a.out or os.path.join(P, 'narrated.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '24', '-i', os.path.join(fd, 'f%05d.png'),
                    '-i', os.path.join(P, 'narrated.wav'), '-vf', 'scale=1080:1920:flags=neighbor', '-c:v', 'libx264',
                    '-crf', '16', '-tune', 'grain', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k',
                    '-shortest', out], check=True)
    print('wrote', out)

if __name__ == '__main__':
    main()
