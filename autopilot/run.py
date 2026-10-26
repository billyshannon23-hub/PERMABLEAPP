#!/usr/bin/env python3
"""Autopilot: make one video with the Permeable Framework and post it.

    python3 autopilot/run.py                    # next topic, make, post to every connected account
    python3 autopilot/run.py --topic "Why do cats purr?"
    python3 autopilot/run.py --dry-run          # make the video, but don't post
    python3 autopilot/run.py --post-only NAME   # post an already-made video (out/NAME.mp4 + projects/NAME/post.json)

Claude does the creative work through Claude Code (headless), following the framework's own
docs/USING_WITH_CLAUDE.md workflow, including previews and the checklist.
Authentication: CLAUDE_CODE_OAUTH_TOKEN (Claude Pro/Max subscription) or ANTHROPIC_API_KEY.
"""
import argparse, datetime as dt, json, os, re, shutil, subprocess, sys, urllib.request, zipfile, io
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AP = ROOT / "autopilot"
sys.path.insert(0, str(AP))
from publishers import enabled_publishers  # noqa: E402

HISTORY = AP / "history.jsonl"
TOPICS = AP / "topics.txt"


def log(*a):
    print("[autopilot]", *a, flush=True)


# ---------- framework ----------
def maybe_fetch_framework():
    """If FRAMEWORK_ZIP_URL is set, replace the bundled framework with that zip (your own copy)."""
    url = os.environ.get("FRAMEWORK_ZIP_URL", "").strip()
    if not url:
        return
    m = re.search(r"drive\.google\.com/file/d/([^/]+)", url)
    if m:  # turn a Drive share link into a direct download
        url = f"https://drive.google.com/uc?export=download&confirm=t&id={m.group(1)}"
    log("downloading framework from FRAMEWORK_ZIP_URL")
    data = urllib.request.urlopen(url, timeout=120).read()
    z = zipfile.ZipFile(io.BytesIO(data))
    names = z.namelist()
    prefix = names[0].split("/")[0] + "/" if all(n.startswith(names[0].split("/")[0] + "/") for n in names) else ""
    for d in ["engine", "voice", "tools", "templates", "examples", "docs", "character"]:
        shutil.rmtree(ROOT / d, ignore_errors=True)
    for n in names:
        rel = n[len(prefix):]
        if not rel or rel.startswith(("projects/", "out/", "autopilot/", ".github/")) or n.endswith("/"):
            continue
        dest = (ROOT / rel).resolve()
        if ROOT not in dest.parents:
            continue  # ignore unsafe paths
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(z.read(n))
    log("framework installed from zip")


# ---------- topics ----------
def history():
    if not HISTORY.exists():
        return []
    return [json.loads(l) for l in HISTORY.read_text().splitlines() if l.strip()]


def next_topic():
    """The top idea on the list (not removed yet: that only happens once its video is made)."""
    if not TOPICS.exists():
        return None
    for l in TOPICS.read_text().splitlines():
        if l.strip() and not l.lstrip().startswith("#"):
            return l.strip()
    return None


def cross_off(topic):
    if not topic or not TOPICS.exists():
        return
    lines = TOPICS.read_text().splitlines()
    for i, l in enumerate(lines):
        if l.strip() == topic:
            TOPICS.write_text("\n".join(lines[:i] + lines[i + 1:]) + "\n")
            return


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40] or "video"


# ---------- generation ----------
PROMPT = """You are running unattended as a video autopilot inside the Permeable Framework (current folder).
Nobody can answer questions, so make every decision yourself.

1. Read README.md, every file in docs/, autopilot/channel.md (the channel brief: follow it), and
   autopilot/history.jsonl (videos already posted; never repeat one, and use it to continue story series:
   the latest part of a series is the one to continue).
2. Topic for this video: {topic}
3. Make the video following docs/USING_WITH_CLAUDE.md "Prompt to start a video", steps 1-6.
   Create it with: python3 tools/kit.py new {name}   (the project folder must be projects/{name}).
   Start from the closest example with --from if that helps. Preview each scene and look at preview.png.
   Run `python3 tools/kit.py check {name}` then `python3 tools/kit.py make {name}`, look at out/{name}_sheet.png,
   fix problems from docs/CHECKLIST.md and remake. Keep the video between 30 and 75 seconds.
4. Finally write projects/{name}/post.json with exactly these keys:
   {{"title": "short video title, under 90 characters",
     "series": "series name or null", "part": number or null,
     "summary": "one sentence describing what happens/what it teaches (used to continue series later)",
     "tiktok_caption": "hooky caption with 4-6 hashtags including #ai, under 2000 chars",
     "instagram_caption": "1-2 sentences plus exactly five hashtags including #ai",
     "youtube_title": "under 90 characters, ends with #shorts",
     "youtube_description": "2-3 sentences, then the sources as links",
     "tags": ["5-10", "plain", "tags"],
     "sources": ["urls"]}}
Do not post anything anywhere. Do not edit files outside projects/{name}, voice/user_lexicon.txt and out/.
"""


def claude_connected():
    return bool(os.environ.get("CLAUDE_CODE_OAUTH_TOKEN") or os.environ.get("ANTHROPIC_API_KEY"))


def generate(topic, name):
    prompt = PROMPT.format(topic=topic, name=name)
    cmd = ["claude", "-p", prompt, "--dangerously-skip-permissions",
           "--max-turns", os.environ.get("CLAUDE_MAX_TURNS", "150"), "--output-format", "text"]
    if os.environ.get("CLAUDE_MODEL"):
        cmd += ["--model", os.environ["CLAUDE_MODEL"]]
    log(f"Claude is making '{name}': {topic}")
    r = subprocess.run(cmd, cwd=ROOT, timeout=int(os.environ.get("GEN_TIMEOUT", "4500")))
    if r.returncode != 0:
        sys.exit(f"Claude Code exited with {r.returncode}")


def load_outputs(name):
    mp4 = ROOT / "out" / f"{name}.mp4"
    post = ROOT / "projects" / name / "post.json"
    if not mp4.exists():
        sys.exit(f"missing {mp4}: the video was not made")
    if not post.exists():
        sys.exit(f"missing {post}")
    meta = json.loads(post.read_text())
    for k in ["title", "tiktok_caption", "instagram_caption", "youtube_title", "youtube_description"]:
        meta.setdefault(k, meta.get("title", name))
    return mp4, meta


def check_video(mp4):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height",
                          "-of", "json", str(mp4)], capture_output=True, text=True).stdout
    info = json.loads(out)
    dur = float(info["format"]["duration"])
    st = [s for s in info["streams"] if "width" in s][0]
    log(f"video {st['width']}x{st['height']}, {dur:.1f}s")
    if dur > 90:
        log("warning: over 90s; Instagram Reels/YouTube Shorts may treat it as a regular video")
    return dur


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--post-only")
    a = ap.parse_args()
    dry = a.dry_run or os.environ.get("DRY_RUN", "").lower() in ("1", "true", "yes")

    if a.post_only:
        name, topic = a.post_only, None
    else:
        if not claude_connected():
            print("::warning::Skipped: Claude isn't connected yet. Open the Video Autopilot app and finish setup.")
            log("Claude isn't connected yet, so no video was made. Finish setup in the Video Autopilot app.")
            return
        maybe_fetch_framework()
        listed = None if a.topic else next_topic()
        topic = a.topic or listed or "Your choice: pick the best next video for this channel based on the " \
            "'What this channel is about' section of channel.md (continue a running series if there is one)"
        name = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).strftime("%Y%m%d-%H%M") + "-" + slug(topic)
        generate(topic, name)
        load_outputs(name)  # stops here if the video wasn't made, leaving the idea on the list
        cross_off(listed)

    mp4, meta = load_outputs(name)
    check_video(mp4)

    results = {}
    if dry:
        log("dry run: not posting")
    else:
        pubs = enabled_publishers()
        if not pubs:
            log("no accounts connected; nothing posted (see SETUP.md)")
        for pname, fn in pubs:
            try:
                results[pname] = fn(mp4, meta)
                log(f"posted to {pname}: {results[pname]}")
            except Exception as e:  # one platform failing shouldn't stop the others
                results[pname] = f"FAILED: {e}"
                log(f"{pname} failed: {e}")

    rec = {"date": dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).isoformat(timespec="minutes") + "Z", "name": name, "topic": topic,
           "title": meta.get("title"), "series": meta.get("series"), "part": meta.get("part"),
           "summary": meta.get("summary"), "posted": results}
    with HISTORY.open("a") as f:
        f.write(json.dumps(rec) + "\n")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as f:
            f.write(f"## {meta.get('title')}\n\n" + "\n".join(f"- **{k}**: {v}" for k, v in results.items()) +
                    f"\n\n**TikTok caption**\n\n```\n{meta['tiktok_caption']}\n```\n")
    print(f"::notice::{name}")
    if results and all(str(v).startswith("FAILED") for v in results.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()
