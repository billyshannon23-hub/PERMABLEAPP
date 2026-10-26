# Music and sound effects

Each project's `score.py` generates the soundtrack from scratch. It writes a soft pad of chords, a sub-bass, an airy layer, a light plucked pattern, occasional bells, and sound effects at the moments your scene marks.

## Marking moments in the scene

In `physics(t, dt)`, push an event when something happens:

```js
function physics(t, dt){ _dt = dt;
  if (at(t, 7.25)) EV.push(['thud', t]);
  for (const b of BEATS) if (at(t, b)) EV.push(['beat', t]);
}
```

You can add extra values, for example `EV.push(['yawn', t, 6.5])` for a yawn's length.

## Turning events into sounds (score.py)

```python
SOUNDS={
    'beat':   lambda e: thump(e[1],0.22),
    'pop':    lambda e: bubble(e[1],0.06,rng.uniform(-.4,.4)),
    'yawn':   lambda e: yawnsnd(e[1],e[2],0.05),
}
```

`e[1]` is the time and `e[2]` onward are your extra values. The second argument of each sound is its gain. Effects usually sit between 0.03 and 0.3, so they stay under the voice.

### The sound library

| Sound | What it is |
|---|---|
| `bubble` | A small wet pop. |
| `tick` | A tiny click. |
| `bell(freq, ...)` | Soft glass with a long tail. |
| `chime` | A sparkle of high bells. |
| `swell(at, dur, notes, gain)` | A soft rising chord. |
| `ks(freq, ...)` | A plucked string. |
| `thud` | A low impact. |
| `thump` | A heartbeat. |
| `whoosh` | Moving air. |
| `whirr` | A small motor. |
| `creak` | A rope or wood creak. |
| `crackle` | Ice or static. |
| `hiss` | An animal hiss. |
| `scan` | A rising scanner tone. |
| `squish` | A wriggle. |
| `hic` | A hiccup. |
| `yawnsnd` | A yawn. |
| `rise` | Things standing up. |
| `tear` | A tear dropping. |

To add your own, write a function in the same style. Make the sound as a numpy array, then call `put(array, time, gain, rev=..., pan=...)`.

## Mood

Set `CHORDS` to one of:
- `CH_BRIGHT`: curious and light. Most videos use this.
- `CH_CALM`: gentle and warm.
- `CH_COLD`: minor and wintry, for serious or historical topics like the Ötzi video.

## Big moments

Add `swell(time, length, notes, gain)` under the turning points of the story, such as the reveal or the last line.

## Levels

The mix section normalises the music, and narration ducks it automatically. You rarely need to touch levels. If an effect sticks out, halve its gain.
