import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from time import time
from flask import send_from_directory

VOTE_COOLDOWN = {}


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "db.sqlite3")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

ALLOWED_IMAGE_EXT = {"png", "jpg", "jpeg", "webp"}
ALLOWED_FILE_EXT = {"png", "jpg", "jpeg", "webp", "pdf", "txt"}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB

app = Flask(__name__, static_folder="../frontend", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
CORS(app)

os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.route("/")
def home():
    return app.send_static_file("index.html")


@app.get("/favicon.ico")
def favicon():
    # Nicht wichtig für das Projekt, aber verhindert 404-Spam im Terminal.
    return ("", 204)


def db():
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON;")
    return con


def init_db():
    with db() as con:
        schema_path = os.path.join(BASE_DIR, "schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            con.executescript(f.read())
        ensure_column(con, "posts", "author_token", "TEXT")
        ensure_column(con, "comments", "author_token", "TEXT")
        con.execute("""
            CREATE TABLE IF NOT EXISTS post_votes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              post_id INTEGER NOT NULL,
              voter_token TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
              UNIQUE(post_id, voter_token)
            )
        """)


def now_iso():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def ensure_column(con, table: str, column: str, definition: str):
    columns = [row["name"] for row in con.execute(f"PRAGMA table_info({table})")]
    if column not in columns:
        con.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def client_token() -> str:
    return request.headers.get("X-Client-Token", "").strip()[:128]


def public_post(row):
    item = dict(row)
    item["can_delete"] = bool(client_token() and item.get("author_token") == client_token())
    item.pop("author_token", None)
    return item


def public_comment(row):
    item = dict(row)
    item["can_delete"] = bool(client_token() and item.get("author_token") == client_token())
    item.pop("author_token", None)
    return item


def ext_ok(filename: str, allowed: set[str]) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in allowed


def save_upload(file, allowed_ext: set[str]) -> str:
    if file.content_length and file.content_length > MAX_CONTENT_LENGTH:
        raise ValueError("File too large")

    filename = secure_filename(file.filename or "")
    if not filename or not ext_ok(filename, allowed_ext):
        raise ValueError("Invalid file type")

    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    ext = filename.rsplit(".", 1)[1].lower()
    stored = f"{stamp}.{ext}"
    path = os.path.join(UPLOAD_DIR, stored)
    file.save(path)
    return stored


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/posts")
def list_posts():
    category = request.args.get("category")
    with db() as con:
        if category in ("vorschlag", "anmerkung"):
            rows = con.execute(
                "SELECT * FROM posts WHERE category=? ORDER BY id DESC",
                (category,)
            ).fetchall()
        else:
            rows = con.execute(
                "SELECT * FROM posts ORDER BY id DESC").fetchall()
    return jsonify([public_post(r) for r in rows])


@app.post("/api/posts")
def create_post():
    category = request.form.get("category", "").strip()
    address = request.form.get("address", "").strip()
    desc = request.form.get("description", "").strip()
    author = client_token()

    if category not in ("vorschlag", "anmerkung"):
        return jsonify({"error": "Invalid category"}), 400
    if len(address) < 2 or len(desc) < 5:
        return jsonify({"error": "Address/description too short"}), 400

    image_name = None
    if "image" in request.files and request.files["image"].filename:
        try:
            image_name = save_upload(request.files["image"], ALLOWED_IMAGE_EXT)
        except ValueError:
            return jsonify({"error": "Invalid image type"}), 400

    with db() as con:
        cur = con.execute(
            "INSERT INTO posts(category,address,description,image_path,created_at,author_token) VALUES(?,?,?,?,?,?)",
            (category, address, desc, image_name, now_iso(), author)
        )
        post_id = cur.lastrowid
        row = con.execute("SELECT * FROM posts WHERE id=?",
                          (post_id,)).fetchone()

    return jsonify(public_post(row)), 201


@app.post("/api/posts/<int:post_id>/vote")
def vote(post_id: int):
    now = time()
    voter = client_token() or request.remote_addr or "anonymous"

    with db() as con:
        row = con.execute("SELECT id FROM posts WHERE id=?",
                          (post_id,)).fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404

        existing_vote = con.execute(
            "SELECT id FROM post_votes WHERE post_id=? AND voter_token=?",
            (post_id, voter)
        ).fetchone()
        if existing_vote:
            return jsonify({"error": "Already voted"}), 409

        last = VOTE_COOLDOWN.get(voter, 0)
        if now - last < 3:
            return jsonify({"error": "Too fast"}), 429

        VOTE_COOLDOWN[voter] = now

        try:
            con.execute(
                "INSERT INTO post_votes(post_id,voter_token,created_at) VALUES(?,?,?)",
                (post_id, voter, now_iso())
            )
        except sqlite3.IntegrityError:
            return jsonify({"error": "Already voted"}), 409

        con.execute("UPDATE posts SET votes = votes + 1 WHERE id=?", (post_id,))
        row2 = con.execute(
            "SELECT votes FROM posts WHERE id=?", (post_id,)).fetchone()

    return jsonify({"post_id": post_id, "votes": row2["votes"]})


@app.get("/api/posts/<int:post_id>/comments")
def list_comments(post_id: int):
    with db() as con:
        exists = con.execute(
            "SELECT id FROM posts WHERE id=?", (post_id,)).fetchone()
        if not exists:
            return jsonify({"error": "Not found"}), 404
        rows = con.execute(
            "SELECT * FROM comments WHERE post_id=? ORDER BY id ASC",
            (post_id,)
        ).fetchall()
    return jsonify([public_comment(r) for r in rows])


@app.post("/api/posts/<int:post_id>/comments")
def add_comment(post_id: int):
    text = request.form.get("text", "").strip()
    author = client_token()
    if len(text) < 1:
        return jsonify({"error": "Empty comment"}), 400

    file_name = None
    if "file" in request.files and request.files["file"].filename:
        fn = request.files["file"].filename
        if not ext_ok(fn, ALLOWED_FILE_EXT):
            return jsonify({"error": "Invalid file type"}), 400
        file_name = save_upload(request.files["file"], ALLOWED_FILE_EXT)

    with db() as con:
        exists = con.execute(
            "SELECT id FROM posts WHERE id=?", (post_id,)).fetchone()
        if not exists:
            return jsonify({"error": "Not found"}), 404
        cur = con.execute(
            "INSERT INTO comments(post_id,text,file_path,created_at,author_token) VALUES(?,?,?,?,?)",
            (post_id, text, file_name, now_iso(), author)
        )
        cid = cur.lastrowid
        row = con.execute(
            "SELECT * FROM comments WHERE id=?", (cid,)).fetchone()

    return jsonify(public_comment(row)), 201


@app.get("/uploads/<path:filename>")
def uploads(filename: str):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/api/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    token = client_token()
    with db() as con:
        row = con.execute(
            "SELECT author_token FROM posts WHERE id=?", (post_id,)).fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
        if not token or row["author_token"] != token:
            return jsonify({"error": "Forbidden"}), 403
        con.execute("DELETE FROM comments WHERE post_id=?", (post_id,))
        con.execute("DELETE FROM posts WHERE id=?", (post_id,))
    return jsonify({"ok": True})


@app.route("/api/comments/<int:comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    token = client_token()
    with db() as con:
        row = con.execute(
            "SELECT author_token FROM comments WHERE id=?", (comment_id,)).fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
        if not token or row["author_token"] != token:
            return jsonify({"error": "Forbidden"}), 403
        con.execute("DELETE FROM comments WHERE id=?", (comment_id,))
    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
