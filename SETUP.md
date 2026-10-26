# Video Autopilot: setup

> **The easy way is the desktop app.** Download it from the [README](README.md) and follow the steps on screen. This page is the manual way, for people who like the command line.

This repo makes **3 videos a day** with the Permeable Framework and posts them to **YouTube Shorts, Instagram Reels and TikTok**.
It runs on GitHub Actions, so nothing has to stay on your computer. Each person runs **their own copy**, with their own Claude, their own accounts and their own channel.

Each run goes like this. Claude reads the framework docs and your channel brief, researches the topic, writes the captions and narration, draws the scenes, previews them, renders the video and checks it. The video is then posted to every account you've connected.

---

## 1. Make your own copy (2 minutes)

1. On the repo's GitHub page, click **Use this template → Create a new repository**. Making it **private** is fine.
2. Clone it to your computer and install the GitHub CLI (https://cli.github.com), then run `gh auth login`.

## 2. Connect your Claude (required)

Run `python3 autopilot/connect.py claude` and pick one of these:
- **Claude subscription (Pro/Max)**: runs `claude setup-token` and saves the token. Video making counts toward your plan's usage limits.
- **API key** from console.anthropic.com: you pay per use. Expect very roughly $1–4 per video, depending on the model.

To pick a model, set the repo variable `CLAUDE_MODEL` (for example `claude-sonnet-5-5`) in **Settings → Secrets and variables → Actions → Variables**.

## 3. Test it before connecting anything else

Go to **Actions → Make videos → Run workflow**, tick **dry run** and run it. After 10–30 minutes, the finished MP4, its contact sheet and the captions are under **Artifacts** on the run page. Watch it before you turn on posting.

## 4. Connect your accounts (any you want)

Each platform needs a free developer app. This is a one-time chore, and it's what the platforms require for automatic posting. After that, run `python3 autopilot/connect.py youtube` (or `instagram`, or `tiktok`).

### YouTube Shorts
1. Go to https://console.cloud.google.com, create a project and enable **YouTube Data API v3**.
2. Under **OAuth consent screen**: choose External, add yourself as a test user, then **Publish app** so the login doesn't expire after 7 days.
3. Under **Credentials → Create OAuth client ID**, choose **Desktop app**, then copy the ID and secret into the wizard.
4. Note that until Google verifies your project (an "audit"), API uploads may be locked to **private**. Apply at https://support.google.com/youtube/contact/yt_api_form. Set the repo variable `YOUTUBE_PRIVACY` to `private` or `unlisted` if you'd rather review videos first.
5. The free quota (10,000 units a day) covers about 6 uploads a day, so 3 a day is fine.

### Instagram Reels
1. Your Instagram account must be **Professional** (Creator or Business). Switch it in the Instagram app's settings.
2. Go to https://developers.facebook.com, **Create app** and add the **Instagram** product ("API setup with Instagram login").
3. Add your Instagram account as a tester and accept the invite in Instagram.
4. Add a redirect URL. Any https page you control works, for example your repo's GitHub page.
5. Copy the Instagram app ID and secret into the wizard.
6. Tokens last 60 days. The autopilot refreshes the token each run, and saves the new one automatically if you add a `GH_ADMIN_TOKEN` secret (see below). Otherwise, run the wizard again every ~50 days.

### TikTok
1. Go to https://developers.tiktok.com, create an app, add **Login Kit** and the **Content Posting API**, and turn on **Direct Post**.
2. Add the scopes `user.info.basic`, `video.upload` and `video.publish`, plus an https redirect URI. Submit the app for review.
3. Copy the client key and secret into the wizard.
4. **Until TikTok audits your app, direct posts are private (only you can see them).** Two ways around this:
   - Set the repo variable `TIKTOK_MODE` = `inbox`. Videos land in your TikTok inbox as drafts, and you tap Post. This is recommended until the audit passes.
   - Or apply for the audit in the developer portal. After approval, posts go public.

### Optional: automatic token saving
Create a fine-grained GitHub token with **Secrets: read and write** on this repo only, and save it as the secret `GH_ADMIN_TOKEN`. The autopilot can then save refreshed Instagram and TikTok tokens by itself.

## 5. Steer your channel

- **`autopilot/channel.md`**: what your channel is about, its series, tone and rules. Claude reads this before every video.
- **`autopilot/topics.txt`**: a queue of ideas, one per line, used from the top. When it's empty, Claude picks ideas itself (continuing your series or starting new explainers).
- **`autopilot/history.jsonl`**: everything already made and posted. It's updated automatically, and Claude uses it to avoid repeats and to continue series.

## 6. Schedule and controls

| What | How |
|---|---|
| Posting times | Edit the three `cron:` lines in `.github/workflows/make-videos.yml` (times are UTC). |
| Pause everything | Set the repo variable `AUTOPILOT_PAUSED` = `true`. |
| Make without posting | Set the repo variable `DRY_RUN` = `true`. |
| Make one now | Actions → Make videos → Run workflow (you can type a topic). |
| Only some platforms | Type them in "post_to" when running by hand, e.g. `youtube,tiktok`. |
| Your own framework copy | `python3 autopilot/connect.py framework`: paste a Drive share link ("Anyone with the link") or a direct zip link. |

Run time: each video takes roughly 10–30 minutes. That fits easily in GitHub's free minutes for public repos; private repos get 2,000 free minutes a month, which is about 90 minutes a day, so it's tight for 3 videos a day. Make the repo public (your secrets stay hidden), or plan for a small overage.

## Troubleshooting

- **"No Claude connected"**: step 2 wasn't saved. Check **Settings → Secrets → Actions**.
- **One platform failed**: the others still post. The run page summary shows the error for each platform.
- **YouTube `invalid_grant`**: the consent screen is still in Testing mode. Publish it (step 4.2) and reconnect.
- **The video has a problem**: download the artifact, then add a line to `channel.md` about what to avoid next time.
