"""YouTube Shorts via the YouTube Data API v3 (resumable upload). A vertical video under 3 minutes is a Short."""
import json, os
import requests


def _access_token():
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": os.environ["YOUTUBE_CLIENT_ID"],
        "client_secret": os.environ["YOUTUBE_CLIENT_SECRET"],
        "refresh_token": os.environ["YOUTUBE_REFRESH_TOKEN"],
        "grant_type": "refresh_token"}, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def post(mp4, meta):
    tok = _access_token()
    size = mp4.stat().st_size
    body = {
        "snippet": {
            "title": meta["youtube_title"][:100],
            "description": meta["youtube_description"][:4900],
            "tags": meta.get("tags", [])[:15],
            "categoryId": os.environ.get("YOUTUBE_CATEGORY", "27"),  # 27 = Education
        },
        "status": {
            "privacyStatus": os.environ.get("YOUTUBE_PRIVACY", "public"),
            "selfDeclaredMadeForKids": False,
            "containsSyntheticMedia": True,  # AI-made content disclosure
        },
    }
    init = requests.post(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json",
                 "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)},
        data=json.dumps(body), timeout=60)
    init.raise_for_status()
    with open(mp4, "rb") as f:
        up = requests.put(init.headers["Location"], data=f,
                          headers={"Authorization": f"Bearer {tok}", "Content-Type": "video/mp4",
                                   "Content-Length": str(size)}, timeout=900)
    up.raise_for_status()
    vid = up.json()["id"]
    return f"https://youtube.com/shorts/{vid}"
