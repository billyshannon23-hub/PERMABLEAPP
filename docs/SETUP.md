# Setup

The framework needs four things:
- **Python 3.10+** with numpy, scipy, Pillow and Playwright.
- **Chromium**, installed through Playwright. It draws the frames.
- **ffmpeg**. It encodes the video.
- **Flite** speech libraries (optional, but recommended). The narrator uses them for pronunciation. Without them, the narrator falls back to its older "classic" voice, which sounds different but still works.

## Linux (Debian / Ubuntu)

```
sudo apt install python3-pip ffmpeg libflite1
pip install -r requirements.txt
python3 -m playwright install --with-deps chromium
```

## macOS

```
brew install python ffmpeg flite
pip3 install -r requirements.txt
python3 -m playwright install chromium
```

The narrator looks for Flite's shared libraries (`libflite.so.1` and friends) in the usual folders. Homebrew's Flite may not provide them in that form. If the narrator prints `Flite not found`, you can either:
- accept the classic voice, or
- use Docker (below), which matches the voice used in the series exactly.

## Windows

Use WSL (Ubuntu) and follow the Linux steps, or use Docker.

## Docker (any system, same result everywhere)

```
docker build -t permeable-framework .
docker run --rm -v "$PWD/projects:/kit/projects" -v "$PWD/out:/kit/out" permeable-framework new heart
docker run --rm -v "$PWD/projects:/kit/projects" -v "$PWD/out:/kit/out" permeable-framework make heart
```

Your projects and finished videos stay in the `projects/` and `out/` folders on your machine.

## Check it works

```
python3 tools/kit.py make templates/basic
```

This should finish in a minute or two and write `out/basic.mp4` and `out/basic_sheet.png`.

If Flite is in an unusual folder, point to it:

```
FLITE_LIBDIR=/path/to/lib python3 tools/kit.py make heart
```
