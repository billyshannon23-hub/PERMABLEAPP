# Writing scenes

A project's `scene.js` is ordinary JavaScript that draws one frame at a time onto a canvas. The framework glues it together with the engine:

```
engine/core.js     -> canvas, helpers, soft bodies, skin cross-section
engine/bellhead.js -> the character         (if "character": true in project.json)
engine/lib.js      -> scene helpers         (if "lib": true; the template uses it)
your scene.js
engine/render.js   -> dither, pixel font
your caps.js
engine/tail.js     -> captions, labels, voice sync, frame loop
```

## The world

- The world is **180 × 320 units**. x runs left to right, y top to bottom. It is drawn at 2× and dithered, then scaled to 1080×1920.
- `ctx` is the canvas context, in world units. `ctx.setTransform(1,0,0,1,0,0)` means "plain world coordinates".
- **Safe area**: keep important drawings between y 36 and 196. Captions sit at about y 190–240.
- **Time**: `t` is scene time in seconds and matches the caption times in `caps.js`. During narration the framework may stretch the video between captions to fit the voice. Your scene still sees the same `t`, so you don't have to change anything.

## What your scene.js must define

| Name | What |
|---|---|
| `physics(t, dt)` | Runs at a steady 72 steps per second, in order, before each frame. Move things and push sound events here. With lib, start it with `_dt=dt;` so `at()` works. |
| `drawWorld(t)` | Draws the whole frame for time `t`. With lib: `begin(t)` first, `finish(t, SC, fadeOutTime)` last. |
| `cam(t)` | Returns the camera. lib provides it. |
| `OVTEXT`, `POPS`, `CAM` | Text, pops and the camera, all read by the tail. lib provides them. |

And `caps.js` defines `CAPS`, `CAP_END`, `TOTAL` and `LABELS`. See the comments in the template.

**Randomness**: use `R()` or `rnd(a, b)`, never `Math.random()`. They are seeded, so every render is identical.

## Colour and tone

| | |
|---|---|
| `cr(v)` | A shade from 0 (ink) to 1 (cream). After dithering, about 0.1 reads as near-black, 0.5 as a mid pattern and 0.9 as near-solid cream. |
| `C_CREAM`, `C_INK` | The two colours. |
| `C_RED` | Villains only (see STYLE). It is the one colour that survives the dither. |

## Easing and timing (core)

| | |
|---|---|
| `seg(t, a, b)` | 0 before `a`, 1 after `b`, linear in between. |
| `ss(x)` | Smoothstep, for easing. |
| `lerp(a, b, k)`, `clamp(v, lo, hi)` | The usual. |
| `win_(t, a, b, c, d)` (lib) | Fades in from `a` to `b` and out from `c` to `d`. Use it for anything that appears and goes. |
| `at(t, x)` (lib) | True once, on the step where time passes `x`. Use it for events. |
| `inSc(SC, name, t)` (lib) | Is that scene on? |

## Drawing helpers (lib)

| | |
|---|---|
| `charLayer(g => {...})` | Draws characters, and anything that should get the thin cream outline, onto their own layer. Do it in **one** call per frame, using `g` instead of `ctx`. |
| `guy(g, x, y, scale, options, extras)` | Draws the character. See [CHARACTER](CHARACTER.md). |
| `lying(g, x, y, scale, options)` | The character lying on his back, head to the left. |
| `pose(name, [lx,ly], [rx,ry])` | Makes a custom pose from two hand positions. |
| `inset(x, y, r, alpha, draw, tx, ty)` | A round close-up bubble. `draw(cx, cy, r)` paints inside it, already clipped. `tx, ty` adds a dotted pointer. |
| `ground(y)` | A floor line. |
| `text(txt, x, y, scale, {dim, left})` | Big crisp text drawn after the dither: counters, years, headings. |
| `pop(wx, wy, age, 'HIC!')` | A word popping out next to something. `age` is seconds since it happened. |
| `along(points, u)` | The point a fraction `u` of the way along a polyline. Use it for signals travelling down nerves. |
| `useCam({z, x, y, sx, sy})` | Zooms the camera: world point (x, y) lands mid-screen, scaled by z. |
| `begin(t)` / `finish(t, SC, fadeOut)` | Clears the frame, then adds the vignette, dips to black between scenes and the fade in and out. |

## Labels (caps.js)

```
[from, to, 'TEXT', () => [worldX, worldY] or null, [screenX, screenY]]
```

The label types itself out and draws a dotted pointer to the world point, following the camera. Keep label text short, in capitals and inside the safe area.

## Ready-made subjects (core)

- **Skin cross-section**: `drawSkin(t, chains, options, lineScale)` with `mkChains()`. It includes the dermis texture, fat, follicles (`FOLL`), a vessel and a sweat gland. See `examples/goosebumps` for zooming, moving hairs and adding your own parts through `options.inDermis`.
- **Soft bodies**: `mkBody`, `stepBody`, `collide`, `splice`, `bodyPath` and `fillBody` are the squishy cells from the game Permeable. Use them for cells, droplets and blobs.

## Patterns worth copying from the examples

| Want | Look at |
|---|---|
| An x-ray window into the body (chest, head, belly) | `hiccups`: `chestXray`, `headXray`. `otzi`: `gut`. |
| A signal travelling along a nerve, then something reacting | `hiccups`: `nerves`. `goosebumps`: `nerve`. |
| A counter, or years ticking by | `hiccups`: `years`, `count`. `otzi`: `years`. |
| A scanner revealing something | `otzi`: `xray`. |
| A crowd reacting one after another | `yawning`: `spread`, `family`. |
| A character falling or lying | `hiccups`: `farm`. `otzi`: `lying`. |
| Simple animals in the style | `goosebumps`: `cat`. `yawning`: `animals`, chimps. |
| Bacteria or viruses (red) | `otzi`: H. pylori in `gut`. |
