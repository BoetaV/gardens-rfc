"""Gardens RFC: record an advert as a video file.

  python _record_advert.py           the Score Energy Drink advert (score-energy-30s.mp4)
  python _record_advert.py gardens   the Gardens RFC club video (gardens-rfc-40s.mp4)
  python _record_advert.py charles   the Oom Charles memorial video (oom-charles-30s.mp4)

Plays _make-<name>-advert.html once in a hidden Chrome (or Edge) window and saves the
video and a poster picture (.jpg) in assets/video/ads/. Takes as long as the video plus
a few seconds. Open the _make-...-advert.html page in a browser to preview it first.

The Gardens video gets the supporters singing (from assets/video/fans-grandstand.mp4) as
its sound. The Score advert and the Oom Charles memorial stay silent. Adding sound needs the imageio-ffmpeg package
(pip install imageio-ffmpeg); without it the video is saved silent.
"""
import http.server
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "assets" / "video" / "ads"
BROWSERS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]
# Sound laid under each video: (source file, start second). Videos not listed stay silent.
SOUNDTRACKS = {
    "gardens": ("assets/video/fans-grandstand.mp4", 0),
}
VIDEOS = {"score": "score-energy-30s.mp4", "gardens": "gardens-rfc-40s.mp4", "charles": "oom-charles-30s.mp4"}
finished = threading.Event()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if url.path == "/save":
            name = Path(urllib.parse.parse_qs(url.query)["name"][0]).name
            OUT.mkdir(parents=True, exist_ok=True)
            (OUT / name).write_bytes(body)
            print(f"Saved {OUT / name} ({len(body) // 1024} KB)")
        elif url.path == "/done":
            finished.set()
        self.send_response(204)
        self.end_headers()


def finish(name):
    """Add the soundtrack (if any) and move the index to the front of the file, so
    browsers know the video's length before it has fully downloaded."""
    video = OUT / VIDEOS.get(name, "")
    if not video.is_file():
        return
    try:
        import imageio_ffmpeg
    except ImportError:
        print("imageio-ffmpeg is not installed, so the video is left as recorded (no sound).")
        return
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    tmp = video.with_suffix(".tmp.mp4")
    cmd = [ffmpeg, "-y", "-loglevel", "error", "-i", str(video)]
    sound = SOUNDTRACKS.get(name)
    if sound:
        length = float(subprocess.run([ffmpeg, "-i", str(video)], capture_output=True, text=True)
                       .stderr.split("Duration: ")[1].split(",")[0].split(":")[-1]) or 40
        cmd += ["-ss", str(sound[1]), "-i", str(ROOT / sound[0]), "-map", "0:v", "-map", "1:a",
                "-af", f"afade=in:d=0.8,afade=out:st={length - 2.5:.2f}:d=2.5",
                "-c:a", "aac", "-b:a", "96k", "-shortest"]
    cmd += ["-c:v", "copy", "-movflags", "+faststart", str(tmp)]
    subprocess.run(cmd, check=True)
    tmp.replace(video)
    print(f"Finished {video.name}" + (" with sound" if sound else " (silent)"))


def main():
    browser = next((b for b in BROWSERS if os.path.exists(b)), None) or shutil.which("chrome")
    if not browser:
        sys.exit("Chrome or Edge is needed to record the advert.")
    name = sys.argv[1] if len(sys.argv) > 1 else "score"
    page = f"_make-{name}-advert.html"
    if not (ROOT / page).exists():
        sys.exit(f"There is no {page} in this folder.")
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    profile = tempfile.mkdtemp(prefix="gardens-advert-")
    proc = subprocess.Popen([
        browser, "--headless=new", "--window-size=1000,600", f"--user-data-dir={profile}",
        "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
        f"http://127.0.0.1:{server.server_address[1]}/{page}?record",
    ])
    print(f"Recording {page}...")
    ok = finished.wait(120)
    proc.terminate()
    server.shutdown()
    shutil.rmtree(profile, ignore_errors=True)
    if not ok:
        sys.exit(f"Recording did not finish. Open {page} in Chrome to check it plays.")
    finish(name)


if __name__ == "__main__":
    main()
