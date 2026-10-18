"""Gardens RFC local server.

Serves the website and stores member registrations in a SQLite database
(members.db, next to this file). Python standard library only.

  python server.py                 start the site on http://localhost:8080
  python server.py --port 9000     use another port
  python server.py --export        write members, contributions, subscribers and predictions to CSV
  python server.py --winner "2026-10-17 First team v Harlequins Rugby Club" 24-17
                                   list the closest Predict the Score guesses for a match

The website posts JSON to:
  POST /api/members         member registration
  POST /api/contributions   newsletter story, community activity or memorial memory (saved as "pending";
                            photos sent with a memory go into the memorial-uploads folder)
  POST /api/subscribe       newsletter email sign-up
  POST /api/predictions     Predict the Score entry
  POST /api/visit           visitor counter (adds one, returns the new count)
  POST /api/candles         Wall of Remembrance candles: {"name": ...} lights one for that person;
                            either way it returns the number lit for everyone on the wall
  GET  /api/content         the website content from the club's Google Sheet (when data.js has
                            backend.googleScriptUrl), like functions/api/content.js does online
The club's future back end only needs to accept the same requests.
"""
import argparse
import base64
import binascii
import csv
import json
import re
import secrets
import sqlite3
import sys
import urllib.request
from datetime import date, datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import build_gallery

ROOT = Path(__file__).resolve().parent
DB = ROOT / "members.db"
PRIVATE = {"members.db", "members.db-journal", "server.py", "build_gallery.py", "make_deploy.py",
           "start website (local test).bat", "prepare upload for cloudflare.bat", "setup-google-and-cloudflare.md"}  # plus every *-export.csv
EXPORTS = {"members": "members-export.csv", "contributions": "contributions-export.csv",
           "subscribers": "subscribers-export.csv", "predictions": "predictions-export.csv"}

FIELDS = {  # name: (required, max length)
    "first_name": (True, 60), "surname": (True, 60), "date_of_birth": (True, 10),
    "gender": (False, 20), "email": (True, 120), "phone": (True, 20),
    "address_line": (True, 120), "suburb": (False, 60), "town": (True, 60),
    "postal_code": (False, 4), "member_type": (True, 40), "team": (False, 60),
    "position": (False, 40), "emergency_name": (True, 80), "emergency_phone": (True, 20),
}
MEMBER_TYPES = {"Senior player", "Junior player", "Veteran player", "Supporter", "Coach or official", "Volunteer"}
CONTRIB_FIELDS = {  # name: (required for story, required for activity, max length)
    "name": (True, True, 80), "role": (True, True, 40), "email": (True, True, 120), "phone": (False, False, 20),
    "title": (True, True, 100), "body": (True, True, 2500),
    "date": (False, True, 10), "time": (False, False, 5), "venue": (False, True, 100), "category": (False, True, 20),
}
MEMORY_FIELDS = {"memorial": (True, 60), "name": (True, 80), "role": (True, 40), "email": (True, 120),
                 "phone": (False, 20), "body": (False, 2500)}  # name: (required, max length)
MAX_PHOTOS = 5
UPLOADS = ROOT / "memorial-uploads"  # photos sent with memories, waiting for approval (never served)
ROLES = {"Fan or supporter", "Club official", "Sponsor", "Player", "Parent", "Community organisation"}
CATEGORIES = {"Club", "Youth", "Charity", "Church", "Fundraiser", "Community"}
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE = re.compile(r"^\+?[0-9 ()-]{9,20}$")


def connect():
    con = sqlite3.connect(DB)
    con.execute(f"""CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        {", ".join(f"{k} TEXT" for k in FIELDS)},
        consent INTEGER NOT NULL,
        news_opt_in INTEGER NOT NULL DEFAULT 0,
        registered_at TEXT NOT NULL)""")
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS members_email ON members (lower(email))")
    con.execute(f"""CREATE TABLE IF NOT EXISTS contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
        {", ".join(f"{k} TEXT" for k in CONTRIB_FIELDS)},
        submitted_at TEXT NOT NULL)""")
    have = {row[1] for row in con.execute("PRAGMA table_info(contributions)")}
    for column in ("memorial", "photos"):  # added for memorial memories; older databases lack them
        if column not in have:
            con.execute(f"ALTER TABLE contributions ADD COLUMN {column} TEXT")
    con.execute("""CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL, subscribed_at TEXT NOT NULL)""")
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email ON subscribers (lower(email))")
    con.execute("""CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match TEXT NOT NULL, kickoff TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
        phone_digits TEXT NOT NULL, us INTEGER NOT NULL, them INTEGER NOT NULL, submitted_at TEXT NOT NULL)""")
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS predictions_one_each ON predictions (match, phone_digits)")
    con.execute("CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY CHECK (id = 1), count INTEGER NOT NULL)")
    con.execute("CREATE TABLE IF NOT EXISTS candles (name TEXT PRIMARY KEY, count INTEGER NOT NULL)")
    return con


def validate(data):
    clean = {}
    for name, (required, limit) in FIELDS.items():
        value = str(data.get(name) or "").strip()
        if required and not value:
            return None, f"Please fill in {name.replace('_', ' ')}."
        if len(value) > limit:
            return None, f"{name.replace('_', ' ').capitalize()} is too long."
        clean[name] = value
    if not EMAIL.match(clean["email"]):
        return None, "Please enter a valid email address."
    for name in ("phone", "emergency_phone"):
        if not PHONE.match(clean[name]):
            return None, "Please enter a valid cell number."
    if clean["postal_code"] and not clean["postal_code"].isdigit():
        return None, "Postal code should be 4 digits."
    if clean["member_type"] not in MEMBER_TYPES:
        return None, "Please choose a membership type."
    try:
        dob = date.fromisoformat(clean["date_of_birth"])
    except ValueError:
        return None, "Please enter a valid date of birth."
    if not date(1920, 1, 1) <= dob <= date.today():
        return None, "Please check the date of birth."
    if data.get("consent") is not True:
        return None, "Consent is required to register."
    clean["news_opt_in"] = 1 if data.get("news_opt_in") is True else 0
    return clean, None


def validate_contribution(data):
    kind = data.get("kind")
    if kind not in ("story", "activity"):
        return None, "Please choose a story or an activity."
    act = kind == "activity"
    clean = {"kind": kind}
    for name, (req_story, req_act, limit) in CONTRIB_FIELDS.items():
        value = str(data.get(name) or "").strip() if (act or name not in ("date", "time", "venue", "category")) else ""
        if (req_act if act else req_story) and not value:
            return None, f"Please fill in {name}."
        if len(value) > limit:
            return None, f"{name.capitalize()} is too long."
        clean[name] = value
    if not EMAIL.match(clean["email"]):
        return None, "Please enter a valid email address."
    if clean["phone"] and not PHONE.match(clean["phone"]):
        return None, "Please enter a valid cell number."
    if clean["role"] not in ROLES:
        return None, "Please choose who you are."
    if act:
        if clean["category"] not in CATEGORIES:
            return None, "Please choose a category."
        try:
            when = date.fromisoformat(clean["date"])
        except ValueError:
            return None, "Please enter a valid date."
        if when < date.today():
            return None, "The activity date has already passed."
        if clean["time"] and not re.fullmatch(r"[0-2][0-9]:[0-5][0-9]", clean["time"]):
            return None, "Please enter a valid time."
    if data.get("consent") is not True:
        return None, "Please give permission for the club to publish it."
    return clean, None


def validate_memory(data):
    """A memory and/or photos for a memorial page. Returns the fields and the photos as JPEG bytes."""
    clean = {"kind": "memory"}
    for name, (required, limit) in MEMORY_FIELDS.items():
        value = str(data.get(name) or "").strip()
        if required and not value:
            return None, None, f"Please fill in {name}."
        if len(value) > limit:
            return None, None, f"{name.capitalize()} is too long."
        clean[name] = value
    if not EMAIL.match(clean["email"]):
        return None, None, "Please enter a valid email address."
    if clean["phone"] and not PHONE.match(clean["phone"]):
        return None, None, "Please enter a valid cell number."
    if clean["role"] not in ROLES:
        return None, None, "Please choose who you are."
    photos = data.get("photos") or []
    if not isinstance(photos, list) or len(photos) > MAX_PHOTOS:
        return None, None, f"Please send up to {MAX_PHOTOS} photos at a time."
    images = []
    for photo in photos:
        match = re.fullmatch(r"data:image/jpeg;base64,([A-Za-z0-9+/=]+)", str(photo))
        try:
            raw = base64.b64decode(match.group(1), validate=True) if match else b""
        except binascii.Error:
            raw = b""
        if not raw.startswith(b"\xff\xd8"):
            return None, None, "One of the photos could not be read. Please try another."
        if len(raw) > 3 * 1024 * 1024:
            return None, None, "One of the photos is too large."
        images.append(raw)
    if not clean["body"] and not images:
        return None, None, "Please write a memory or add at least one photo."
    if data.get("consent") is not True:
        return None, None, "Please give permission for the club to publish it."
    clean["title"] = f"A memory of {clean['memorial']}"
    return clean, images, None


def validate_prediction(data):
    match = str(data.get("match") or "").strip()
    name = str(data.get("name") or "").strip()
    phone = str(data.get("phone") or "").strip()
    if not match or len(match) > 120:
        return None, "Please choose a match."
    try:
        kickoff = datetime.fromisoformat(str(data.get("kickoff") or "").replace("Z", "+00:00"))
    except ValueError:
        return None, "Please choose a match."
    if kickoff.tzinfo is None or datetime.now(timezone.utc) >= kickoff:
        return None, "Entries for this match closed at kick-off."
    us, them = data.get("us"), data.get("them")
    if not all(isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 150 for v in (us, them)):
        return None, "Please enter a score from 0 to 150."
    if not 2 <= len(name) <= 60:
        return None, "Please enter your name."
    if not PHONE.match(phone):
        return None, "Please enter a valid cell number."
    if data.get("consent") is not True:
        return None, "Please tick the box so the club can contact you if you win."
    return {"match": match, "kickoff": kickoff.isoformat(), "name": name, "phone": phone,
            "phone_digits": re.sub(r"\D", "", phone)[-9:], "us": us, "them": them}, None


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def insert(table, row):
    with connect() as con:
        cur = con.execute(f"INSERT INTO {table} ({', '.join(row)}) VALUES ({', '.join('?' * len(row))})", list(row.values()))
    return cur.lastrowid


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")  # always check for changed files while testing
        super().end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_content(self):
        """The Google Sheet's content tabs as a script, so local tests show what the live site shows."""
        body = "window.GARDENS_CONTENT = null;"
        m = re.search(r'googleScriptUrl:\s*"([^"]+)"', (ROOT / "assets" / "js" / "data.js").read_text(encoding="utf-8"))
        if m:
            url = m.group(1) + ("&" if "?" in m.group(1) else "?") + "content=1"
            try:
                with urllib.request.urlopen(url, timeout=10) as r:
                    out = json.loads(r.read().decode("utf-8"))
                if out.get("ok") and isinstance(out.get("content"), dict):
                    body = "window.GARDENS_CONTENT = " + json.dumps(out["content"]) + ";"
            except (OSError, ValueError) as e:
                print(f"Could not read the Google Sheet content ({e}); showing data.js only.")
        data = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/javascript; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/content":
            return self.send_content()
        # Never serve the database, exports or server code (checked on the decoded path)
        target = Path(self.translate_path(self.path)).resolve()
        name = target.name.lower()
        if (target.parent == ROOT and (name in PRIVATE or name.endswith("-export.csv")) or self.path.startswith("/api/")
                or target == UPLOADS or UPLOADS in target.parents):
            return self.send_error(404)
        if target == build_gallery.OUT:
            build_gallery.build()  # new photos in a folder show up on the next refresh
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if match and target.is_file() and any(match.groups()):
            return self.send_range(target, *match.groups())
        super().do_GET()

    do_HEAD = do_GET

    def send_range(self, target, first, last):
        """Partial responses, so videos can be skipped through (and play at all on iPhones)."""
        size = target.stat().st_size
        if first:
            start, end = int(first), min(int(last) if last else size - 1, size - 1)
        else:  # "bytes=-500" means the last 500 bytes
            start, end = max(size - int(last), 0), size - 1
        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(target)))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        if self.command == "HEAD":
            return
        with target.open("rb") as f:
            f.seek(start)
            left = end - start + 1
            try:
                while left > 0:
                    chunk = f.read(min(64 * 1024, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass  # the browser jumped elsewhere in the video and dropped this request

    def do_POST(self):
        route = {"/api/members": self.post_member, "/api/contributions": self.post_contribution,
                 "/api/subscribe": self.post_subscribe, "/api/predictions": self.post_prediction,
                 "/api/visit": self.post_visit, "/api/candles": self.post_candles}.get(self.path.split("?")[0])
        if not route:
            return self.send_error(404)
        try:
            length = int(self.headers.get("Content-Length", 0))
            limit = 25_000_000 if route == self.post_contribution else 10_000  # memories may carry photos
            if length > limit:
                return self.send_json(413, {"error": "Request too large."})
            data = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(data, dict):
                raise ValueError
        except ValueError:
            return self.send_json(400, {"error": "Invalid request."})
        if data.get("website"):  # spam trap, invisible to people
            return self.send_json(201, {"ok": True})
        route(data)

    def post_member(self, data):
        clean, error = validate(data)
        if error:
            return self.send_json(400, {"error": error})
        row = {k: clean[k] for k in FIELDS} | {"consent": 1, "news_opt_in": clean["news_opt_in"], "registered_at": now()}
        try:
            new_id = insert("members", row)
        except sqlite3.IntegrityError:
            return self.send_json(409, {"error": "This email address is already registered. Contact the club to update your details."})
        self.log_message("New member registered (id %s)", new_id)
        self.send_json(201, {"ok": True, "id": new_id})

    def post_contribution(self, data):
        if data.get("kind") == "memory":
            return self.post_memory(data)
        clean, error = validate_contribution(data)
        if error:
            return self.send_json(400, {"error": error})
        new_id = insert("contributions", clean | {"submitted_at": now()})
        self.log_message("New %s contribution waiting for review (id %s)", clean["kind"], new_id)
        self.send_json(201, {"ok": True, "id": new_id})

    def post_memory(self, data):
        clean, images, error = validate_memory(data)
        if error:
            return self.send_json(400, {"error": error})
        names = []
        if images:
            UPLOADS.mkdir(exist_ok=True)
            stamp = datetime.now().strftime("%Y-%m-%d %H%M%S")
            for n, raw in enumerate(images, 1):
                path = UPLOADS / f"{stamp}-{secrets.token_hex(3)}-{n}.jpg"
                path.write_bytes(raw)
                names.append(path.name)
        new_id = insert("contributions", clean | {"photos": ", ".join(names), "submitted_at": now()})
        self.log_message("New memory of %s waiting for review (id %s, %d photos in %s)",
                         clean["memorial"], new_id, len(names), UPLOADS.name)
        self.send_json(201, {"ok": True, "id": new_id})

    def post_subscribe(self, data):
        email = str(data.get("email") or "").strip()
        if len(email) > 120 or not EMAIL.match(email):
            return self.send_json(400, {"error": "Please enter a valid email address."})
        try:
            insert("subscribers", {"email": email, "subscribed_at": now()})
        except sqlite3.IntegrityError:
            pass  # already subscribed: same answer, so the list of subscribers is not revealed
        self.send_json(201, {"ok": True})


    def post_visit(self, data):
        with connect() as con:
            con.execute("INSERT INTO visits (id, count) VALUES (1, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1")
            (count,) = con.execute("SELECT count FROM visits WHERE id = 1").fetchone()
        self.send_json(200, {"ok": True, "count": count})

    def post_candles(self, data):
        name = str(data.get("name") or "").strip()
        with connect() as con:
            if name:
                known = con.execute("SELECT 1 FROM candles WHERE name = ?", (name,)).fetchone()
                (people,) = con.execute("SELECT count(*) FROM candles").fetchone()
                if len(name) > 60 or (not known and people >= 1000):
                    return self.send_json(400, {"error": "That name is not on the wall."})
                con.execute("INSERT INTO candles (name, count) VALUES (?, 1) "
                            "ON CONFLICT(name) DO UPDATE SET count = count + 1", (name,))
            counts = dict(con.execute("SELECT name, count FROM candles"))
        self.send_json(200, {"ok": True, "counts": counts})

    def post_prediction(self, data):
        clean, error = validate_prediction(data)
        if error:
            return self.send_json(400, {"error": error})
        try:
            new_id = insert("predictions", clean | {"submitted_at": now()})
        except sqlite3.IntegrityError:
            return self.send_json(409, {"error": "This cell number already has a prediction for this match. One guess each."})
        self.log_message("New prediction for %s (id %s)", clean["match"], new_id)
        self.send_json(201, {"ok": True})


def winner(match, result):
    """Closest guesses first: total points off, then the earliest entry."""
    us, them = (int(n) for n in re.split(r"\s*-\s*", result.strip()))
    with connect() as con:
        rows = con.execute("SELECT name, phone, us, them, submitted_at FROM predictions WHERE match = ?", (match,)).fetchall()
    if not rows:
        print(f"No predictions for {match!r}. Matches with entries:")
        with connect() as con:
            for (m,) in con.execute("SELECT DISTINCT match FROM predictions ORDER BY match"):
                print("  ", m)
        return
    rows.sort(key=lambda r: (abs(r[2] - us) + abs(r[3] - them), r[4]))
    print(f"{len(rows)} predictions for {match} (final score {us}-{them}). Closest first:")
    for name, phone, pu, pt, at in rows[:10]:
        print(f"  {pu:>3}-{pt:<3} off by {abs(pu - us) + abs(pt - them):<3} {name}  {phone}  ({at})")


def export():
    with connect() as con:
        for table, filename in EXPORTS.items():
            cur = con.execute(f"SELECT * FROM {table} ORDER BY id")
            rows = cur.fetchall()
            with (ROOT / filename).open("w", newline="", encoding="utf-8-sig") as f:
                w = csv.writer(f)
                w.writerow([d[0] for d in cur.description])
                w.writerows(rows)
            print(f"{len(rows):>4} {table:<14} -> {filename}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--export", action="store_true", help="write members, contributions, subscribers and predictions to CSV files and exit")
    ap.add_argument("--winner", nargs=2, metavar=("MATCH", "SCORE"), help='closest predictions for a match, e.g. --winner "2026-10-17 First team v Harlequins Rugby Club" 24-17')
    args = ap.parse_args()
    if args.winner:
        winner(*args.winner)
        sys.exit()
    if args.export:
        export()
        sys.exit()
    connect().close()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(ROOT)))
    print(f"Gardens RFC site on http://localhost:{args.port}  (data saved to {DB.name})")
    server.serve_forever()
