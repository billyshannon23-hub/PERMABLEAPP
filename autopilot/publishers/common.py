import os, subprocess


def persist_secret(name, value):
    """Save a refreshed token back to the repo's GitHub secrets, if GH_ADMIN_TOKEN is provided.
    Without it, the old token keeps working until it expires (see SETUP.md)."""
    pat = os.environ.get("GH_ADMIN_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not (pat and repo and value):
        return False
    r = subprocess.run(["gh", "secret", "set", name, "--repo", repo, "--body", value],
                       env={**os.environ, "GH_TOKEN": pat}, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"[autopilot] could not save {name}: {r.stderr.strip()}")
    return r.returncode == 0
