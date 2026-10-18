"""Gardens RFC: prepare the folder to upload to Cloudflare Pages.

  python make_deploy.py

Makes a fresh "deploy" folder holding only the public website (index.html and
assets). Everything private stays behind: members.db, exports, server.py, the
zip file, the original videos folder and the Google script.
Then drag the "deploy" folder onto Cloudflare Pages (see SETUP-GOOGLE-AND-CLOUDFLARE.md).
"""
import re
import shutil
from pathlib import Path

import build_gallery

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "deploy"
PUBLIC = sorted(p.name for p in ROOT.glob("*.html") if not p.name.startswith("_")) + ["assets"]
MAX_FILE = 25 * 1024 * 1024  # Cloudflare Pages limit per file


def main():
    folders = build_gallery.build()  # make sure every album lists its latest photos
    # Update the folder in place rather than deleting it: OneDrive or an open Explorer
    # window often locks folders on Windows, which would stop a full delete.
    OUT.mkdir(exist_ok=True)
    wanted = set()
    for name in PUBLIC:
        src = ROOT / name
        if src.is_dir():
            shutil.copytree(src, OUT / name, dirs_exist_ok=True)
            wanted.update((OUT / name / f.relative_to(src)).resolve() for f in src.rglob("*") if f.is_file())
        else:
            shutil.copy2(src, OUT / name)
            wanted.add((OUT / name).resolve())
    for f in [f for f in OUT.rglob("*") if f.is_file()]:
        if f.resolve() not in wanted:
            f.unlink()  # left over from an earlier upload (a removed photo, an old page)
    for d in sorted((d for d in OUT.rglob("*") if d.is_dir()), key=lambda d: len(d.parts), reverse=True):
        try:
            d.rmdir()  # only succeeds when empty
        except OSError:
            pass

    files = [f for f in OUT.rglob("*") if f.is_file()]
    total = sum(f.stat().st_size for f in files)
    print(f"Ready: {len(files)} files, {total / 1024 / 1024:.1f} MB in {OUT}")
    print("Photos per folder: " + ", ".join(f"{k} {len(v)}" for k, v in folders.items()))

    problems = []
    for f in files:
        if f.stat().st_size > MAX_FILE:
            problems.append(f"{f.relative_to(OUT)} is {f.stat().st_size / 1024 / 1024:.1f} MB; Cloudflare Pages allows 25 MB per file.")
    data = (ROOT / "assets" / "js" / "data.js").read_text(encoding="utf-8")
    if re.search(r'googleScriptUrl:\s*""', data):
        problems.append("backend.googleScriptUrl in data.js is empty, so the online forms will not save anything yet.")
    for p in problems:
        print("WARNING: " + p)
    if not problems:
        print("No problems found. Upload the deploy folder to Cloudflare Pages.")


if __name__ == "__main__":
    main()
