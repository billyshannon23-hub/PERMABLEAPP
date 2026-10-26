# Bellhead, the character

Bellhead is a round head on a bell-shaped body, with two round hands floating beside him and no arms. He has a little three-hair tuft, a wobbly outline, and he breathes and blinks.

## Designing a look

Open `character/studio.html` in a browser. Pick a view, expression, pose, job, hair, clothes, hat, glasses, neckwear, extras and held item. The model sheet at the bottom shows every outfit.

If you change the studio's code, run `python3 tools/kit.py sync-character` so the videos use the same drawing.

## Drawing him in a scene

```js
charLayer(g => {
  guy(g, 90, 186, 1.0, {clothes:'labcoat', glasses:'round', expr:'content', breath:breathAt(t), blink:blinkAt(t), t});
});
```

- **`x, y`** is the bottom middle of his body. At scale 1 he is about 120 units tall, so 0.5 to 1.3 is the useful range.
- **`t`** keeps his line wobble moving.
- **`breath`** (−1 to 1) moves him gently. `breathAt(t)` gives a calm rhythm.
- **`blink`** closes his eyes. `blinkAt(t)` blinks now and then.
- Draw several characters, and anything else that needs the cream outline, inside the same `charLayer` call.

### Extras (last argument)

| | |
|---|---|
| `{mirror:true}` | Faces left. Most useful with `view:'q'`. |
| `{rot:-1.4, pivot:[x, y]}` | Tips him over around a point, for falls. |
| `{jolt:0..1}` | A sudden twitch, like a hiccup. |
| `{yawn:0..1}` | A yawn. Use `yawnK(t, start, length)` to animate it. |
| `{chimp:true}` | A chimp version: ears and a fur cap. |

## Options

| Option | Values |
|---|---|
| `view` | `front`, `q` (three-quarter, facing right), `side` (facing right), `back` |
| `expr` | neutral, content, smug, worried, surprised, sad, thinking, laughing, annoyed, asleep, yawn |
| `pose` | relaxed, tuck (no hands), steeple, wave, point, shrug, think, crossed, hips, thumbs, peace, facepalm, clipboard, mug, sleep |
| `hair` | none, tuft |
| `hairTone` | dark, mid, light |
| `clothes` | none, tshirt, hoodie, sweater, suit, labcoat, overalls, scrubs, chef, police, firefighter, astronaut, apron, vest, jersey, trench, pajamas, tank, robe, royal, fur |
| `hat` | none, beanie, cap, tophat, party, hardhat, chef, police, pilot, fire, cowboy, crown, beret, grad, wizard, sailor, fedora, straw, helmet (space), surgical, pirate, headband, furhat |
| `glasses` | none, round, square, sun |
| `neck` | none, bowtie, scarf, tie, stethoscope, lanyard (ID badge), whistle, medal |
| `extras` | an object of flags: mustache, beard, freckles, blush, bandaid, eyepatch, headphones, headset, pencil, earring, e.g. `{beard:true}` |
| `held` | none, wrench, spatula, brush, wand, magnifier, mic, flower, book, balloon, axe |

**Jobs** (ready-made outfits, in the studio and in `BH.JOBS`): chef, doctor, nurse, scientist, police, firefighter, astronaut, pilot, barista, waiter, office, support, mechanic, builder, farmer, artist, detective, athlete, coach, singer, DJ, student, graduate, sailor, cowboy, pirate, king, wizard, iceman, sleepy, party.

To use a job in a scene:

```js
const look = BH.JOBS.find(j => j[0] === 'DETECTIVE')[1];
guy(g, x, y, s, {...look, t});
```

## Custom poses

Hand positions are measured from the base of his body, in body units. x is left and right, and y is up when negative. Some positions for reference:
- hands down at his sides: `[-35,-11]` and `[35,-11]`
- by his face: about `[30,-90]`
- above his head: about `[34,-108]`

```js
pose('_reach', [-35,-11], [40,-80]);          // left hand down, right hand out and up
guy(g, x, y, s, {pose:'_reach', t});
```

A held item goes in his right hand (`sd: 1`). If that hand is hidden in three-quarter view, it moves to the other hand.

## Rules of thumb

- Keep characters inside the safe area. His feet usually sit on `ground(186)`.
- Hands are floating balls. Gestures are about where the hands are, not finger shapes.
- Animals in character scenes should be Bellhead-style too. Use `{chimp:true}`, or follow the same recipe: the same body, plus a few shapes added on top.
