# Video Autopilot (Permeable Framework)

**Makes 3 narrated videos a day with the Permeable Framework and posts them to YouTube Shorts, Instagram Reels and TikTok.**

## ⬇️ Get the app

| Windows | Mac |
|---|---|
| [**Download Video-Autopilot-Setup.exe**](https://github.com/billyshannon23-hub/PERMABLEAPP/releases/download/app/Video-Autopilot-Setup.exe) | [**Download Video-Autopilot-Mac.dmg**](https://github.com/billyshannon23-hub/PERMABLEAPP/releases/download/app/Video-Autopilot-Mac.dmg) |

Open it and follow the steps on screen. You never need a command prompt.

- **Windows:** if a blue "Windows protected your PC" box appears, click **More info → Run anyway**. The app isn't from the Microsoft Store, so Windows asks first.
- **Mac:** drag the app to Applications. The first time you open it, macOS blocks it; go to **System Settings → Privacy & Security** and click **Open Anyway**.

**Co-workers:** ask the person who set this up for the **team-keys.json** file, then choose **Import team keys** in the app.
Everyone gets their own copy, uses their own Claude, and posts to their own accounts.

Power users can still do everything by hand: see [SETUP.md](SETUP.md).

---

# Permeable Framework

Make short, vertical (9:16) science explainer videos in the 1-bit cream-and-ink style of the game Permeable. Each video has typed captions, a robot narrator, generated music and an optional cartoon character, Bellhead.

You write three small text files: what to draw, the captions and what the narrator says. One command turns them into a finished 1080×1920 MP4 for TikTok, Reels or Shorts.

```
python3 tools/kit.py new heart          # start a project from the template
python3 tools/kit.py preview heart      # look at a few frames while you work
python3 tools/kit.py make heart         # out/heart.mp4, plus a contact sheet to check it
```

---

## What's in the box

| Folder | What it is |
|---|---|
| `tools/kit.py` | The one command you use for everything. |
| `templates/basic/` | The starter project: a 15-second heartbeat explainer that uses every main feature. |
| `examples/` | Four finished videos you can copy from: `hiccups`, `otzi`, `goosebumps`, `yawning`. |
| `projects/` | Your videos go here. |
| `out/` | Finished MP4s and contact sheets. |
| `engine/` | The shared drawing engine. You normally don't edit this. |
| `character/studio.html` | The Bellhead character studio. Open it in a browser to design looks. |
| `voice/` | The narrator: a custom robot voice, its pronunciation dictionary and the narration step. |
| `docs/` | All the instructions. |

## The docs, in reading order

1. **[SETUP](docs/SETUP.md)**: install on Linux, macOS or Windows, or run it all in Docker.
2. **[WORKFLOW](docs/WORKFLOW.md)**: making a video from idea to upload, step by step.
3. **[STYLE](docs/STYLE.md)**: the look and tone rules that keep the series consistent.
4. **[SCENE_API](docs/SCENE_API.md)**: what you can draw with, and how a scene file is put together.
5. **[CHARACTER](docs/CHARACTER.md)**: Bellhead's options, poses, expressions, outfits and props.
6. **[VOICE](docs/VOICE.md)**: the narrator, its markup and fixing pronunciations.
7. **[SOUND](docs/SOUND.md)**: the music and sound effects.
8. **[CHECKLIST](docs/CHECKLIST.md)**: fact-checking, the final review and the posting text.
9. **[USING_WITH_CLAUDE](docs/USING_WITH_CLAUDE.md)**: how to have an AI assistant build videos with the framework.

## Commands

| Command | What it does |
|---|---|
| `kit.py new NAME [--from EXAMPLE]` | Makes `projects/NAME` from the template, or from an example. |
| `kit.py check NAME` | Catches common mistakes, like a caption without a narration line or characters the font can't draw. |
| `kit.py preview NAME --at 1,5,9` | Renders those moments into `preview.png` in the project. This is the fastest loop. |
| `kit.py make NAME` | Builds, captures every frame, scores, narrates, encodes and makes a contact sheet. |
| `kit.py sheet NAME` | Makes a contact sheet of the finished video in `out/`. |
| `kit.py build / capture / score / narrate NAME` | Runs the single steps of `make`. |
| `kit.py sync-character` | Copies changes from `character/studio.html` into the video engine. |

`NAME` can be a project in `projects/`, an example in `examples/`, or a path to any project folder.

## Try it

After setup, render the starter, then an example:

```
python3 tools/kit.py make templates/basic
python3 tools/kit.py make yawning
```
