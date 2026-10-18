"""Gardens RFC: list the photos in each image folder for the website.

A website cannot look inside a folder by itself, so this writes the list of
photos to assets/js/photos.js. Gallery albums are linked to folders in data.js
(for example  folder: "Oom Charles"), so new photos dropped into a folder show
up in that album.

  python build_gallery.py

server.py runs this automatically on every page load, and make_deploy.py runs it
before preparing the Cloudflare upload, so you rarely need to run it yourself.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IMG = ROOT / "assets" / "img"
OUT = ROOT / "assets" / "js" / "photos.js"
PHOTO_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
SKIP = {"sponsors", "video"}  # folders that are not gallery albums


def build():
    folders = {}
    for d in sorted(p for p in IMG.iterdir() if p.is_dir() and p.name not in SKIP):
        files = sorted(f.name for f in d.iterdir() if f.is_file() and f.suffix.lower() in PHOTO_TYPES)
        folders[d.name] = files
    text = ("/* Made by build_gallery.py from the folders in assets/img. Do not edit by hand. */\n"
            "window.GARDENS_PHOTOS = " + json.dumps(folders, indent=2, ensure_ascii=False) + ";\n")
    if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
        OUT.write_text(text, encoding="utf-8")
    return folders


if __name__ == "__main__":
    for name, files in build().items():
        print(f"{len(files):>4}  {name}")
    print(f"Written to {OUT.relative_to(ROOT)}")
