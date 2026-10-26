#!/usr/bin/env python3
"""Connect wizard: link YOUR Claude and YOUR social accounts to YOUR copy of this repo.

Run on your own computer, inside your copy of the repo:
    python3 autopilot/connect.py            # walks through everything
    python3 autopilot/connect.py tiktok     # just one: claude | youtube | instagram | tiktok | framework

It saves each token as a GitHub Actions secret on your repo (needs the GitHub CLI `gh`, logged in).
If gh isn't available, it prints the values so you can paste them in Settings -> Secrets -> Actions.
"""
import json, secrets, shutil, subprocess, sys, urllib.parse, webbrowser

try:
    import requests
except ImportError:
    sys.exit("pip install requests   (then run again)")

HAVE_GH = shutil.which("gh") is not None


def ask(q, default=None):
    v = input(f"{q}{f' [{default}]' if default else ''}: ").strip()
    return v or default


def save(name, value):
    if not value:
        return
    if HAVE_GH and subprocess.run(["gh", "secret", "set", name, "--body", value]).returncode == 0:
        print(f"  saved secret {name}")
    else:
        print(f"  add this secret by hand -> {name} = {value}")


def code_from_paste(auth_url, redirect):
    print("\n1. A browser window opens (or open this link yourself):\n  ", auth_url)
    webbrowser.open(auth_url)
    print(f"2. Approve. You'll land on {redirect} (it may show an error page; that's fine).")
    url = ask("3. Paste the FULL address from the browser bar here")
    q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    if "code" not in q:
        sys.exit(f"No code in that address: {url}")
    return q["code"][0]


def claude():
    print("\n== Claude ==\nEither your Claude subscription (Pro/Max) or an API key.")
    if ask("Use your Claude subscription? (y/n)", "y").lower().startswith("y"):
        print("Running `claude setup-token`. Log in, then copy the token it prints.")
        if shutil.which("claude"):
            subprocess.run(["claude", "setup-token"])
        else:
            print("Claude Code isn't installed here: npm install -g @anthropic-ai/claude-code, then run `claude setup-token`.")
        save("CLAUDE_CODE_OAUTH_TOKEN", ask("Paste the token (starts with sk-ant-oat)"))
    else:
        save("ANTHROPIC_API_KEY", ask("Paste your API key from console.anthropic.com"))


def youtube():
    print("\n== YouTube Shorts ==\nNeeds a Google Cloud OAuth client (type: Desktop app) with YouTube Data API v3 enabled. See SETUP.md.")
    cid, cs = ask("Client ID"), ask("Client secret")
    redirect = "http://localhost"
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": redirect, "response_type": "code", "access_type": "offline",
        "prompt": "consent", "scope": "https://www.googleapis.com/auth/youtube.upload"})
    code = code_from_paste(url, redirect)
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "code": code, "client_id": cid, "client_secret": cs, "redirect_uri": redirect,
        "grant_type": "authorization_code"}).json()
    if "refresh_token" not in r:
        sys.exit(f"Google said: {r}")
    save("YOUTUBE_CLIENT_ID", cid); save("YOUTUBE_CLIENT_SECRET", cs); save("YOUTUBE_REFRESH_TOKEN", r["refresh_token"])


def instagram():
    print("\n== Instagram Reels ==\nNeeds a Meta app with 'Instagram API with Instagram Login' and a Professional (Creator/Business) Instagram account. See SETUP.md.")
    cid, cs = ask("Instagram app ID"), ask("Instagram app secret")
    redirect = ask("Redirect URL you registered in the app (must be https)")
    url = "https://www.instagram.com/oauth/authorize?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": redirect, "response_type": "code",
        "scope": "instagram_business_basic,instagram_business_content_publish"})
    code = code_from_paste(url, redirect).split("#")[0]
    short = requests.post("https://api.instagram.com/oauth/access_token", data={
        "client_id": cid, "client_secret": cs, "grant_type": "authorization_code",
        "redirect_uri": redirect, "code": code}).json()
    if "access_token" not in short:
        sys.exit(f"Instagram said: {short}")
    long = requests.get("https://graph.instagram.com/access_token", params={
        "grant_type": "ig_exchange_token", "client_secret": cs, "access_token": short["access_token"]}).json()
    tok = long.get("access_token") or sys.exit(f"Instagram said: {long}")
    me = requests.get("https://graph.instagram.com/me", params={"fields": "user_id,username", "access_token": tok}).json()
    print(f"  connected @{me.get('username')}")
    save("INSTAGRAM_USER_ID", str(me.get("user_id") or short.get("user_id"))); save("INSTAGRAM_TOKEN", tok)


def tiktok():
    print("\n== TikTok ==\nNeeds a TikTok developer app with Login Kit + Content Posting API "
          "(scopes video.publish, video.upload). See SETUP.md.")
    ck, cs = ask("Client key"), ask("Client secret")
    redirect = ask("Redirect URI you registered in the app (must be https)")
    url = "https://www.tiktok.com/v2/auth/authorize/?" + urllib.parse.urlencode({
        "client_key": ck, "redirect_uri": redirect, "response_type": "code", "state": secrets.token_hex(8),
        "scope": "user.info.basic,video.publish,video.upload"})
    code = code_from_paste(url, redirect)
    r = requests.post("https://open.tiktokapis.com/v2/oauth/token/", data={
        "client_key": ck, "client_secret": cs, "code": code, "grant_type": "authorization_code",
        "redirect_uri": redirect}, headers={"Content-Type": "application/x-www-form-urlencoded"}).json()
    if "refresh_token" not in r:
        sys.exit(f"TikTok said: {r}")
    save("TIKTOK_CLIENT_KEY", ck); save("TIKTOK_CLIENT_SECRET", cs); save("TIKTOK_REFRESH_TOKEN", r["refresh_token"])
    if ask("Has TikTok audited your app yet? (y/n)", "n").lower().startswith("n"):
        print("  Until it's audited, direct posts are private. Set the repo variable TIKTOK_MODE=inbox to get them "
              "as drafts in your TikTok app instead (one tap to post).")


def framework():
    print("\n== Framework ==\nThe framework is already bundled. To use your own copy instead, give a direct "
          "download link or a Google Drive share link (set to 'Anyone with the link').")
    save("FRAMEWORK_ZIP_URL", ask("Link (leave blank to keep the bundled one)", ""))


STEPS = {"claude": claude, "youtube": youtube, "instagram": instagram, "tiktok": tiktok, "framework": framework}

if __name__ == "__main__":
    if not HAVE_GH:
        print("Tip: install the GitHub CLI and run `gh auth login` so tokens are saved automatically.")
    pick = sys.argv[1:] or list(STEPS)
    for s in pick:
        if len(sys.argv) > 1 or ask(f"\nSet up {s}? (y/n)", "y").lower().startswith("y"):
            STEPS[s]()
    print("\nDone. Run the 'Make videos' workflow from the Actions tab to test (tick 'dry run' first).")
