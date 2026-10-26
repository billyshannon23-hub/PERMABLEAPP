"""TikTok via the Content Posting API.

TIKTOK_MODE=direct (default): posts straight to the profile. Until TikTok audits your app,
  direct posts are forced to private (SELF_ONLY); after the audit they can be public.
TIKTOK_MODE=inbox: sends the video to your TikTok inbox/drafts; you tap Post in the app.
"""
import math, os, time
import requests
from .common import persist_secret

API = "https://open.tiktokapis.com/v2"


def _access_token():
    r = requests.post(f"{API}/oauth/token/", headers={"Content-Type": "application/x-www-form-urlencoded"}, data={
        "client_key": os.environ["TIKTOK_CLIENT_KEY"], "client_secret": os.environ["TIKTOK_CLIENT_SECRET"],
        "grant_type": "refresh_token", "refresh_token": os.environ["TIKTOK_REFRESH_TOKEN"]}, timeout=30)
    r.raise_for_status()
    j = r.json()
    if "access_token" not in j:
        raise RuntimeError(f"TikTok token refresh failed: {j}")
    if j.get("refresh_token") and j["refresh_token"] != os.environ["TIKTOK_REFRESH_TOKEN"]:
        persist_secret("TIKTOK_REFRESH_TOKEN", j["refresh_token"])
    return j["access_token"]


def _check(r):
    j = r.json()
    if j.get("error", {}).get("code", "ok") != "ok":
        raise RuntimeError(f"TikTok: {j['error']}")
    return j["data"]


def post(mp4, meta):
    tok = _access_token()
    H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8"}
    size = mp4.stat().st_size
    chunk = size if size <= 64_000_000 else 10_000_000
    count = 1 if chunk == size else size // chunk  # TikTok: last chunk absorbs the remainder
    source = {"source": "FILE_UPLOAD", "video_size": size, "chunk_size": chunk, "total_chunk_count": count}
    mode = os.environ.get("TIKTOK_MODE", "direct")

    if mode == "inbox":
        d = _check(requests.post(f"{API}/post/publish/inbox/video/init/", headers=H,
                                 json={"source_info": source}, timeout=60))
    else:
        info = _check(requests.post(f"{API}/post/publish/creator_info/query/", headers=H, timeout=30))
        opts = info.get("privacy_level_options", ["SELF_ONLY"])
        want = os.environ.get("TIKTOK_PRIVACY", "PUBLIC_TO_EVERYONE")
        privacy = want if want in opts else ("SELF_ONLY" if "SELF_ONLY" in opts else opts[0])
        d = _check(requests.post(f"{API}/post/publish/video/init/", headers=H, json={
            "post_info": {"title": meta["tiktok_caption"][:2200], "privacy_level": privacy,
                          "disable_duet": False, "disable_comment": False, "disable_stitch": False,
                          "is_aigc": True},
            "source_info": source}, timeout=60))

    with open(mp4, "rb") as f:
        for i in range(count):
            start = i * chunk
            end = size - 1 if i == count - 1 else start + chunk - 1
            f.seek(start)
            body = f.read(end - start + 1)
            r = requests.put(d["upload_url"], data=body, headers={
                "Content-Type": "video/mp4", "Content-Length": str(len(body)),
                "Content-Range": f"bytes {start}-{end}/{size}"}, timeout=900)
            r.raise_for_status()

    for _ in range(60):
        s = _check(requests.post(f"{API}/post/publish/status/fetch/", headers=H,
                                 json={"publish_id": d["publish_id"]}, timeout=30))
        st = s.get("status")
        if st in ("PUBLISH_COMPLETE", "SEND_TO_USER_INBOX"):
            return f"{st} ({d['publish_id']})"
        if st == "FAILED":
            raise RuntimeError(f"TikTok failed: {s.get('fail_reason')}")
        time.sleep(10)
    return f"still processing ({d['publish_id']})"
