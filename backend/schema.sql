PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('vorschlag','anmerkung')),
  address TEXT NOT NULL,
  description TEXT NOT NULL,
  image_path TEXT,
  created_at TEXT NOT NULL,
  author_token TEXT,
  votes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  file_path TEXT,
  created_at TEXT NOT NULL,
  author_token TEXT,
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  voter_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(post_id, voter_token)
);
