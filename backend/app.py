import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "db.sqlite3")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

ALLOWED_IMAGE_EXT = {"png", "jpg", "jpeg", "webp"}
ALLOWED_FILE_EXT = {"png", "jpg", "jpeg", "webp", "pdf", "txt"}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
CORS(app)

os.makedirs(UPLOAD_DIR, exist_ok=True)


def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON;")
    return con


def init_db():
    with db() as con:
        schema_path = os.path.join(BASE_DIR, "schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            con.executescript(f.read())


def now_iso():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def ext_ok(filename: str, allowed: set[str]) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in allowed


def save_upload(file, allowed_ext: set[str]) -> str:
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
    return jsonify([dict(r) for r in rows])


@app.post("/api/posts")
def create_post():
    category = request.form.get("category", "").strip()
    address = request.form.get("address", "").strip()
    desc = request.form.get("description", "").strip()

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
            "INSERT INTO posts(category,address,description,image_path,created_at) VALUES(?,?,?,?,?)",
            (category, address, desc, image_name, now_iso())
        )
        post_id = cur.lastrowid
        row = con.execute("SELECT * FROM posts WHERE id=?",
                          (post_id,)).fetchone()

    return jsonify(dict(row)), 201


@app.post("/api/posts/<int:post_id>/vote")
def vote(post_id: int):
    with db() as con:
        row = con.execute("SELECT id FROM posts WHERE id=?",
                          (post_id,)).fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
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
    return jsonify([dict(r) for r in rows])


@app.post("/api/posts/<int:post_id>/comments")
def add_comment(post_id: int):
    text = request.form.get("text", "").strip()
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
            "INSERT INTO comments(post_id,text,file_path,created_at) VALUES(?,?,?,?)",
            (post_id, text, file_name, now_iso())
        )
        cid = cur.lastrowid
        row = con.execute(
            "SELECT * FROM comments WHERE id=?", (cid,)).fetchone()

    return jsonify(dict(row)), 201


@app.get("/uploads/<path:filename>")
def uploads(filename: str):
    return send_from_directory(UPLOAD_DIR, filename)


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
