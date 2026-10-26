# Making a video, start to finish

A typical video runs 45 to 70 seconds, has 10 to 13 captions and three to eight scenes. Expect an afternoon for your first one and an hour or two once you know the tools.

## 1. Pick the topic and research it

- Choose one question a viewer would actually ask, like "why do we yawn?" or "what is a goosebump?"
- Find two or three good sources: a university or museum page, a science news outlet, the original paper's abstract. Write down the facts and where each came from.
- Mark anything that is debated. The video must say "may", "one idea is" or "still debated" for those parts.

## 2. Write the script

Write one short sentence per caption, 10 to 13 sentences in total. Each should take three to six seconds to say.

- Teach plainly. Don't use jokes, "POV:" hooks or clickbait.
- Lead with the hook fact, explain the mechanism, then end on the bigger picture or a useful takeaway.
- Numbers go in captions as digits ("68 YEARS") and in narration as words ("sixty-eight years").

## 3. Plan the scenes

For each caption, decide what is on screen. Good tools:
- **A cutaway**: an x-ray window into the character's body, like the chest and head in the hiccups video.
- **A diagram**: a skin cross-section, a heart, a brain.
- **Inset bubbles**: a round close-up with a dotted pointer, like the vocal cords or the cells of the heart's pacemaker.
- **Labels**: short text with a pointer to the thing being named.
- **Big numbers**: counters for years, beats or hiccups.
- **The character**: reacting, demonstrating, or in a costume for the role.

Group captions into scenes and write them down as `SC = {name: [start, end]}`.

## 4. Start the project

```
python3 tools/kit.py new myvideo
python3 tools/kit.py new myvideo --from goosebumps   # or start from the example closest to your idea
```

## 5. Write `caps.js` and `narration.json`

`caps.js` holds the captions, in capitals, each with its start time, plus `CAP_END`, `TOTAL` and any `LABELS`. `narration.json` holds one spoken line per caption, in the same order.

You don't need perfect timings. Give each caption roughly two seconds plus 0.07 seconds per character. When narrating, the framework fits the voice to the captions and slows the video slightly wherever a line runs long.

Run `kit.py check myvideo` to catch mistakes.

## 6. Draw the scenes in `scene.js`

Work one scene at a time and preview often:

```
python3 tools/kit.py preview myvideo --at 2,5,8,11
```

Open `projects/myvideo/preview.png` to look at the frames. See [SCENE_API](SCENE_API.md) for the building blocks. The examples are the best reference: find a scene that does something similar and copy its approach.

## 7. Sound

Push events from your scene, for example `EV.push(['pop', t])`. Map them to sounds in `score.py`, and pick a mood. See [SOUND](SOUND.md).

## 8. Make it

```
python3 tools/kit.py make myvideo
```

This writes `out/myvideo.mp4` and `out/myvideo_sheet.png`, a grid of 20 frames.

## 9. Check it

Go through [CHECKLIST](CHECKLIST.md): look at the contact sheet, watch the video with sound, and re-check every fact against your sources. Fix things, then run `make` again.

## 10. Post it

Write a plain description of two sentences plus five hashtags, one of which is `#ai`. The checklist has the format.
