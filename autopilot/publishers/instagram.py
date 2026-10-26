"""Instagram Reels via the Instagram API with Instagram Login (professional account required).
Uses resumable upload, so the video doesn't need to be hosted anywhere."""
import os, time
import requests
from .common import persist_secret

API = "https://graph.instagram.com/" + os.environ.get("INSTAGRAM_API_VERSION", "v23.0")


def _refresh(tok):
    """Long-lived tokens last 60 days; refreshing gives a fresh 60 days."""
    try:
        r = requests.get("https://graph.instagram.com/refresh_access_token",
                         params={"grant_type": "ig_refresh_token", "access_token": tok}, timeout=30)
        if r.ok and r.json().get("access_token"):
            new = r.json()["access_token"]
            persist_secret("INSTAGRAM_TOKEN", new)
            return new
    except requests.RequestException:
        pass
    return tok


def post(mp4, meta):
    uid = os.environ["INSTAGRAM_USER_ID"]
    tok = _refresh(os.environ["INSTAGRAM_TOKEN"])
    c = requests.post(f"{API}/{uid}/media", params={
        "media_type": "REELS", "upload_type": "resumable", "caption": meta["instagram_caption"][:2200],
        "share_to_feed": "true", "access_token": tok}, timeout=60)
    c.raise_for_status()
    cid = c.json()["id"]
    uri = c.json().get("uri") or f"https://rupload.facebook.com/ig-api-upload/{API.rsplit('/', 1)[1]}/{cid}"
    data = mp4.read_bytes()
    u = requests.post(uri, data=data, headers={
        "Authorization": f"OAuth {tok}", "offset": "0", "file_size": str(len(data))}, timeout=900)
    u.raise_for_status()
    for _ in range(60):  # wait for Instagram to process the video (up to ~10 min)
        s = requests.get(f"{API}/{cid}", params={"fields": "status_code,status", "access_token": tok}, timeout=30).json()
        if s.get("status_code") == "FINISHED":
            break
        if s.get("status_code") == "ERROR":
            raise RuntimeError(f"Instagram processing error: {s}")
        time.sleep(10)
    else:
        raise RuntimeError("Instagram processing timed out")
    p = requests.post(f"{API}/{uid}/media_publish", params={"creation_id": cid, "access_token": tok}, timeout=60)
    p.raise_for_status()
    mid = p.json()["id"]
    link = requests.get(f"{API}/{mid}", params={"fields": "permalink", "access_token": tok}, timeout=30).json()
    return link.get("permalink", mid)
