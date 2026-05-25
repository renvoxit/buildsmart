# Build Smart

Build Smart is a small web application for collecting city improvement ideas and problem reports. Users can create posts, attach photos, vote for proposals, and leave comments with optional files.

The interface is written in German and served by a Flask backend together with static frontend files.

## Project Structure

```text
backend/
  app.py              Flask application and API routes
  requirements.txt   Python dependencies
  schema.sql         SQLite database schema
  db.sqlite3         Local SQLite database

frontend/
  index.html         Main landing page
  los-gehts.html     Post feed and creation forms
  ueber-uns.html     About page
  leistungen.html    Services page
  app.js             Frontend API logic
  styles.css         Page styles
  assets/            Images and icons
```

## Features

- Static website pages for the Build Smart concept.
- Creation of two post types:
  - `vorschlag` - improvement idea.
  - `anmerkung` - problem or observation.
- Image upload for posts.
- Voting for posts with a short cooldown and one vote per local user token.
- Comments on posts.
- Optional file upload for comments.
- Post and comment deletion is limited to the local user token that created the item.
- Local SQLite persistence.

## Requirements

- Python 3.10 or newer.
- `pip`.

## Setup

Create and activate a virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r backend\requirements.txt
```

## Run

Start the Flask application from the project root:

```powershell
python backend\app.py
```

By default the app runs at:

```text
http://localhost:5000
```

The backend serves the frontend automatically, so opening the URL above loads `frontend/index.html`.

You can override the port with the `PORT` environment variable:

```powershell
$env:PORT = "8000"
python backend\app.py
```

## API

Health check:

```http
GET /api/health
```

Posts:

```http
GET    /api/posts
GET    /api/posts?category=vorschlag
GET    /api/posts?category=anmerkung
POST   /api/posts
POST   /api/posts/<post_id>/vote
DELETE /api/posts/<post_id>
```

Comments:

```http
GET    /api/posts/<post_id>/comments
POST   /api/posts/<post_id>/comments
DELETE /api/comments/<comment_id>
```

Uploaded files are served from:

```http
GET /uploads/<filename>
```

## Upload Limits

- Maximum request size: 10 MB.
- Post images: `png`, `jpg`, `jpeg`, `webp`.
- Comment files: `png`, `jpg`, `jpeg`, `webp`, `pdf`, `txt`.

## Database

The application uses SQLite. The database file is stored at:

```text
backend/db.sqlite3
```

The schema is initialized automatically when `backend/app.py` starts. Uploaded files are stored in:

```text
backend/uploads/
```

## Development Notes

- Frontend API requests use `location.origin`, so the frontend expects to be served from the same origin as the Flask backend.
- The frontend stores a local anonymous user token in `localStorage` and sends it as `X-Client-Token`.
- There is no separate build step for the frontend.
- There is no automated test suite in the current project.
