"""Each publisher turns on automatically when its secrets are present."""
import os


def _has(*names):
    return all(os.environ.get(n) for n in names)


def enabled_publishers():
    pubs = []
    if _has("YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"):
        from .youtube import post
        pubs.append(("youtube", post))
    if _has("INSTAGRAM_USER_ID", "INSTAGRAM_TOKEN"):
        from .instagram import post
        pubs.append(("instagram", post))
    if _has("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REFRESH_TOKEN"):
        from .tiktok import post
        pubs.append(("tiktok", post))
    only = os.environ.get("POST_TO", "").strip()
    if only:
        keep = {p.strip().lower() for p in only.split(",")}
        pubs = [p for p in pubs if p[0] in keep]
    return pubs
