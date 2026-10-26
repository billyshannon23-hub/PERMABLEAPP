#!/usr/bin/env python3
"""
Permeable Framework: make 1-bit science explainer videos in the style of Permeable.

  python3 tools/kit.py new heart               start a project in projects/heart (from the starter template)
  python3 tools/kit.py new heart --from yawning   ...or copy one of the examples instead
  python3 tools/kit.py check heart             look for common mistakes (missing lines, characters the font can't draw)
  python3 tools/kit.py preview heart --at 1,4,8,12   render a few frames into projects/heart/preview.png
  python3 tools/kit.py make heart              build, capture, score, narrate, encode -> out/heart.mp4
  python3 tools/kit.py sheet heart             contact sheet of the finished video -> out/heart_sheet.png

  Single steps, if you want them:  build, capture, score, narrate
  After editing the character studio:  sync-character

A project is a folder with: project.json, scene.js, caps.js, narration.json, score.py.
See docs/WORKFLOW.md for the whole process and docs/SCENE_API.md for what you can draw with.
"""
import argparse, asyncio, base64, io, json, os, re, shutil, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, 'engine')
HTML_HEAD = ('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#000">\n'
             '<canvas id="c" width="360" height="640"></canvas>\n<script>\n')
HTML_TAIL = '\n</script></body></html>\n'
FONT_OK = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?'-:/+")


def say(*a): print('  ' + ' '.join(str(x) for x in a))


def project_dir(name):
    """a path, or a name looked up in projects/ then examples/"""
    for c in (name, os.path.join(ROOT, 'projects', name), os.path.join(ROOT, 'examples', name)):
        if os.path.isfile(os.path.join(c, 'scene.js')):
            return os.path.abspath(c)
    sys.exit(f"no project called '{name}' (looked in projects/ and examples/)")


def read(p): return open(p, encoding='utf-8').read()


# ------------------------------------------------------------------------------------------------ character
def sync_character(quiet=False):
    """cut the drawing code out of character/studio.html into engine/bellhead.js, so videos and studio match"""
    src = os.path.join(ROOT, 'character', 'studio.html')
    L = read(src).split('\n')
    a = next(i for i, l in enumerate(L) if l.startswith("const INK='rgb(6,6,9)'"))
    b = next(i for i, l in enumerate(L) if l.startswith('// ---------------------------------------------------------------- state and UI'))
    body = '\n'.join(L[a:b])
    exports = ['drawGuy', 'drawHead', 'drawLying', 'bodyPts', 'POSES', 'EXPR', 'CLOTHES', 'HATS', 'GLASSES', 'NECK', 'EXTRAS', 'HAIR', 'HELD', 'JOBS',
               'TONE', 'handBall', 'drawHeld', 'wobPath', 'wobCtx', 'stroke', 'INK']
    exports = [e for e in exports if re.search(r'(function|const|let)\s+' + e + r'\b', body)]
    mod = ('/* ============ BELLHEAD: the series character ============\n'
           '   Generated from character/studio.html by `kit.py sync-character`. Do not edit here; edit the studio and re-sync.\n'
           '   Use it as BH.drawGuy(ctx, x, y, scale, options). See docs/CHARACTER.md. */\n'
           'const BH=(()=>{\n' + body + '\nreturn {' + ','.join(exports) + ',setSeed:v=>{seedT=v},setYawn:v=>{YAWNK=v}};\n})();\n')
    open(os.path.join(ENGINE, 'bellhead.js'), 'w', encoding='utf-8').write(mod)
    if not quiet: say('wrote engine/bellhead.js from the studio')


# ------------------------------------------------------------------------------------------------ build
def build(P):
    cfg = json.load(open(os.path.join(P, 'project.json')))
    parts = [read(os.path.join(ENGINE, 'core.js'))]
    if cfg.get('character'):
        bh = os.path.join(ENGINE, 'bellhead.js'); st = os.path.join(ROOT, 'character', 'studio.html')
        if not os.path.exists(bh) or os.path.getmtime(st) > os.path.getmtime(bh): sync_character(quiet=True)
        parts.append(read(bh))
    if cfg.get('lib'): parts.append(read(os.path.join(ENGINE, 'lib.js')))
    parts += [read(os.path.join(P, 'scene.js')), read(os.path.join(ENGINE, 'render.js')), read(os.path.join(P, 'caps.js')), read(os.path.join(ENGINE, 'tail.js'))]
    open(os.path.join(P, 'sim.html'), 'w', encoding='utf-8').write(HTML_HEAD + '\n'.join(parts) + HTML_TAIL)
    say('built', os.path.relpath(os.path.join(P, 'sim.html'), ROOT))


async def _page(P):
    from playwright.async_api import async_playwright
    pw = await async_playwright().start(); b = await pw.chromium.launch(); pg = await b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
    await pg.goto('file://' + os.path.join(P, 'sim.html')); await pg.wait_for_timeout(300)
    if errs: await b.close(); await pw.stop(); sys.exit('the page has an error: ' + errs[0])
    return pw, b, pg, errs


def capture(P):
    async def run():
        pw, b, pg, errs = await _page(P)
        N = await pg.evaluate('__R.N'); fd = os.path.join(P, 'f'); shutil.rmtree(fd, ignore_errors=True); os.makedirs(fd); t0 = time.time()
        for k in range(0, N, 24):
            res = await pg.evaluate('(a)=>a.map(f=>__R.frame(f))', list(range(k, min(N, k + 24))))
            for i, u in enumerate(res): open(os.path.join(fd, f'f{k + i:05d}.png'), 'wb').write(base64.b64decode(u.split(',')[1]))
            if errs: sys.exit('error while rendering: ' + errs[0])
        json.dump({'N': N, 'ev': await pg.evaluate('__R.events()'), 'caps': await pg.evaluate('__R.CAPS')}, open(os.path.join(P, 'meta.json'), 'w'))
        await b.close(); await pw.stop(); say(f'captured {N} frames in {round(time.time() - t0)}s')
    asyncio.run(run())


def preview(P, times, out=None):
    from PIL import Image
    async def run():
        pw, b, pg, errs = await _page(P)
        ims = []
        for t in times:
            u = await pg.evaluate(f'__R.frame({int(t * 24)})'); ims.append(Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))))
            if errs: sys.exit(f'error at {t}s: ' + errs[0])
        await b.close(); await pw.stop()
        w, h = ims[0].size; cols = min(6, len(ims)); rows = (len(ims) + cols - 1) // cols
        G = Image.new('RGB', (cols * w, rows * h), (60, 0, 0))
        for i, im in enumerate(ims): G.paste(im, ((i % cols) * w, (i // cols) * h))
        fn = out or os.path.join(P, 'preview.png'); G.save(fn); say('wrote', os.path.relpath(fn, ROOT))
    asyncio.run(run())


def score(P):
    subprocess.run([sys.executable, 'score.py'], cwd=P, check=True)


def narrate(P, out):
    subprocess.run([sys.executable, os.path.join(ROOT, 'voice', 'narrate.py'), P, '--out', out], check=True)


def sheet(P, mp4=None):
    name = os.path.basename(P); mp4 = mp4 or os.path.join(ROOT, 'out', name + '.mp4'); fn = os.path.join(ROOT, 'out', name + '_sheet.png')
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], capture_output=True, text=True).stdout)
    step = dur / 20
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', f'fps=1/{step:.3f},scale=270:480:flags=neighbor,tile=10x2', '-frames:v', '1', fn], check=True)
    say('wrote', os.path.relpath(fn, ROOT))


# ------------------------------------------------------------------------------------------------ check
def check(P):
    caps = read(os.path.join(P, 'caps.js')); nar = json.load(open(os.path.join(P, 'narration.json')))
    texts = re.findall(r"\[\s*([\d.]+)\s*,\s*'((?:[^'\\]|\\.)*)'\s*\]", caps.split('const CAP_END')[0])
    lines = nar.get('lines', []); ok = True
    say(f'{len(texts)} captions, {len(lines)} narration lines')
    if len(texts) != len(lines): say('! caption and narration counts differ: each caption needs one spoken line (or null)'); ok = False
    last = -1
    for i, (t, txt) in enumerate(texts):
        t = float(t); txt = txt.replace("\\'", "'")
        if t <= last: say(f'! caption {i} starts before the one above it'); ok = False
        last = t
        bad = sorted(set(c for c in txt.upper() if c not in FONT_OK))
        if bad: say(f"! caption {i} uses characters the pixel font can't draw: {' '.join(bad)}"); ok = False
        if txt != txt.upper(): say(f'! caption {i} should be written in capitals (the font only has capitals)')
    for m in re.finditer(r"\[[\d.]+\s*,\s*[\d.]+\s*,\s*'([^']*)'", caps.split('const LABELS')[-1] if 'const LABELS' in caps else ''):
        bad = sorted(set(c for c in m.group(1).upper() if c not in FONT_OK))
        if bad: say(f"! label '{m.group(1)}' uses characters the font can't draw: {' '.join(bad)}"); ok = False
    for i, l in enumerate(lines):
        if l and re.search(r'\d', re.sub(r'\{[^}]*\}|\[[^\]]*\]', '', l)): say(f'· narration line {i} has digits; write numbers as words so they are read the way you want')
    say('looks good' if ok else 'fix the lines marked !')
    return ok


# ------------------------------------------------------------------------------------------------ new
def new(name, frm):
    dst = os.path.join(ROOT, 'projects', name)
    if os.path.exists(dst): sys.exit(f'projects/{name} already exists')
    src = os.path.join(ROOT, 'templates', 'basic') if frm in (None, 'basic') else project_dir(frm)
    os.makedirs(dst)
    for f in ('project.json', 'scene.js', 'caps.js', 'narration.json', 'score.py'):
        shutil.copy(os.path.join(src, f), dst)
    say(f'made projects/{name} from {os.path.relpath(src, ROOT)}')
    say(f'next: edit scene.js and caps.js, then: python3 tools/kit.py preview {name} --at 1,5,10')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('new'); s.add_argument('name'); s.add_argument('--from', dest='frm')
    for c in ('build', 'capture', 'score', 'check'): sub.add_parser(c).add_argument('project')
    s = sub.add_parser('preview'); s.add_argument('project'); s.add_argument('--at', default='1,4,8,12,16,20'); s.add_argument('--out')
    s = sub.add_parser('narrate'); s.add_argument('project'); s.add_argument('--out')
    s = sub.add_parser('make'); s.add_argument('project'); s.add_argument('--out'); s.add_argument('--skip-capture', action='store_true')
    s = sub.add_parser('sheet'); s.add_argument('project'); s.add_argument('--video')
    sub.add_parser('sync-character')
    a = ap.parse_args()
    if a.cmd == 'new': return new(a.name, a.frm)
    if a.cmd == 'sync-character': return sync_character()
    P = project_dir(a.project); name = os.path.basename(P)
    out = getattr(a, 'out', None) or os.path.join(ROOT, 'out', name + '.mp4'); os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
    if a.cmd == 'build': build(P)
    elif a.cmd == 'check': check(P)
    elif a.cmd == 'preview': build(P); preview(P, [float(x) for x in a.at.split(',')], a.out)
    elif a.cmd == 'capture': build(P); capture(P)
    elif a.cmd == 'score': score(P)
    elif a.cmd == 'narrate': narrate(P, out)
    elif a.cmd == 'sheet': sheet(P, a.video)
    elif a.cmd == 'make':
        print('1/4 build + capture'); build(P)
        if not a.skip_capture: capture(P)
        print('2/4 score'); score(P)
        print('3/4 narrate + encode'); narrate(P, out)
        print('4/4 contact sheet'); sheet(P, out)
        print('done:', os.path.relpath(out, ROOT))


if __name__ == '__main__':
    main()
