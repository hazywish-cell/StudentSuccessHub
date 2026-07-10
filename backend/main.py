import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from typing import Optional

import fastapi
import fastapi.middleware.cors
from fastapi import Depends, HTTPException
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# --------------------------------------------------------------------------- #
# Config & database setup
# --------------------------------------------------------------------------- #

DB_PATH = os.path.join(os.path.dirname(__file__), "study_planner.db")
SECRET_KEY = os.environ.get("APP_SECRET_KEY", "smart-study-planner-dev-secret")
TOKEN_TTL = 60 * 60 * 24 * 7  # 7 days

app = fastapi.FastAPI(title="Smart Study Planner API")

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,

                academic_level TEXT DEFAULT '',
                institution TEXT DEFAULT '',
                major TEXT DEFAULT '',
                semester TEXT DEFAULT '',
                profile_image TEXT DEFAULT '',

                created_at INTEGER NOT NULL
            );


            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                subject TEXT NOT NULL,
                topic TEXT NOT NULL,
                deadline TEXT,
                priority TEXT NOT NULL DEFAULT 'Medium',
                completed INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            """
        )


init_db()
# --------------------------------------------------------------------------- #
# Auth helpers (stdlib only)
# --------------------------------------------------------------------------- #


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"{salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, hash_hex = stored.split("$")
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 120_000)
    return hmac.compare_digest(dk.hex(), hash_hex)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_token(user_id: int) -> str:
    payload = {"uid": user_id, "exp": int(time.time()) + TOKEN_TTL}
    body = _b64(json.dumps(payload).encode())
    sig = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(sig)}"


def decode_token(token: str) -> Optional[int]:
    try:
        body, sig = token.split(".")
        expected = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64(expected), sig):
            return None
        payload = json.loads(_b64decode(body))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return int(payload["uid"])
    except Exception:
        return None


def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    uid = decode_token(token)

    if uid is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE id = ?",
            (uid,)
        ).fetchone()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    name: str
    email: str
    academic_level: str = ""
    institution: str = ""
    major: str = ""
    semester: str = ""
    profile_image: str = ""


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class TaskIn(BaseModel):
    subject: str
    topic: str
    deadline: Optional[str] = None
    priority: str = "Medium"
    completed: bool = False 

class TaskStatusIn(BaseModel):
    completed: bool


class NoteIn(BaseModel):
    title: str
    content: str = ""


# --------------------------------------------------------------------------- #
# Routes (no /api prefix — Vercel strips it before forwarding)
# --------------------------------------------------------------------------- #


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/auth/register")
def register(data: RegisterIn):

    name = data.name.strip()
    email = data.email.strip().lower()

    if not name or not email or len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Name, email and 6+ char password required"
        )


    with get_db() as conn:

        existing = conn.execute(
            "SELECT id FROM users WHERE email=?",
            (email,)
        ).fetchone()


        if existing:
            raise HTTPException(
                status_code=409,
                detail="Email already exists"
            )


        cur = conn.execute(
            """
            INSERT INTO users
            (
            name,
            email,
            password_hash,
            academic_level,
            institution,
            major,
            semester,
            profile_image,
            created_at
            )
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (
                name,
                email,
                hash_password(data.password),
                "",
                "",
                "",
                "",
                "",
                int(time.time())
            )
        )


        uid = cur.lastrowid


    return {
        "token": create_token(uid),
        "user":{
            "id":uid,
            "name":name,
            "email":email
        }
    }


@app.post("/auth/login")
def login(data: LoginIn):
    email = data.email.strip().lower()
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user is None or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "token": create_token(user["id"]),
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }


@app.get("/me")
def me(user: sqlite3.Row = Depends(current_user)):

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "academic_level": user["academic_level"],
        "institution": user["institution"],
        "major": user["major"],
        "semester": user["semester"],
        "profile_image": user["profile_image"],
        "created_at": user["created_at"]
    }


# ---- Tasks --------------------------------------------------------------- #


def task_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "subject": row["subject"],
        "topic": row["topic"],
        "deadline": row["deadline"],
        "priority": row["priority"],
        "completed": bool(row["completed"]),
        "created_at": row["created_at"],
    }


@app.get("/tasks")
def list_tasks(user: sqlite3.Row = Depends(current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE user_id = ? ORDER BY completed ASC, "
            "CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END, "
            "deadline IS NULL, deadline ASC",
            (user["id"],),
        ).fetchall()
    return [task_to_dict(r) for r in rows]


@app.post("/tasks")
def create_task(data: TaskIn, user: sqlite3.Row = Depends(current_user)):
    if not data.subject.strip() or not data.topic.strip():
        raise HTTPException(status_code=400, detail="Subject and topic are required")
    if data.priority not in ("High", "Medium", "Low"):
        raise HTTPException(status_code=400, detail="Invalid priority")
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO tasks (user_id, subject, topic, deadline, priority, completed, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                user["id"],
                data.subject.strip(),
                data.topic.strip(),
                data.deadline,
                data.priority,
                int(data.completed),
                int(time.time()),
            ),
        )
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (cur.lastrowid,)).fetchone()
    return task_to_dict(row)


@app.put("/tasks/{task_id}")
def update_task(
    task_id:int,
    data:TaskStatusIn,
    user:sqlite3.Row = Depends(current_user)
):

    with get_db() as conn:

        row = conn.execute(
            "SELECT * FROM tasks WHERE id=? AND user_id=?",
            (task_id,user["id"])
        ).fetchone()


        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )


        conn.execute(
            """
            UPDATE tasks
            SET completed=?
            WHERE id=?
            """,
            (
                int(data.completed),
                task_id
            )
        )


        updated = conn.execute(
            "SELECT * FROM tasks WHERE id=?",
            (task_id,)
        ).fetchone()


    return task_to_dict(updated)


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, user: sqlite3.Row = Depends(current_user)):
    with get_db() as conn:
        cur = conn.execute(
            "DELETE FROM tasks WHERE id = ? AND user_id = ?", (task_id, user["id"])
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}


# ---- Notes --------------------------------------------------------------- #


def note_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "updated_at": row["updated_at"],
    }


@app.get("/notes")
def list_notes(user: sqlite3.Row = Depends(current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC", (user["id"],)
        ).fetchall()
    return [note_to_dict(r) for r in rows]


@app.post("/notes")
def create_note(data: NoteIn, user: sqlite3.Row = Depends(current_user)):
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Note title is required")
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO notes (user_id, title, content, updated_at) VALUES (?, ?, ?, ?)",
            (user["id"], data.title.strip(), data.content, int(time.time())),
        )
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (cur.lastrowid,)).fetchone()
    return note_to_dict(row)


@app.put("/notes/{note_id}")
def update_note(note_id: int, data: NoteIn, user: sqlite3.Row = Depends(current_user)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM notes WHERE id = ? AND user_id = ?", (note_id, user["id"])
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Note not found")
        conn.execute(
            "UPDATE notes SET title=?, content=?, updated_at=? WHERE id=?",
            (data.title.strip(), data.content, int(time.time()), note_id),
        )
        updated = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    return note_to_dict(updated)


@app.delete("/notes/{note_id}")
def delete_note(note_id: int, user: sqlite3.Row = Depends(current_user)):
    with get_db() as conn:
        cur = conn.execute(
            "DELETE FROM notes WHERE id = ? AND user_id = ?", (note_id, user["id"])
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Note not found")
    return {"ok": True}



# ---- Progress ------------------------------------------------------------ #


@app.get("/progress")
def progress(user: sqlite3.Row = Depends(current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT priority, completed FROM tasks WHERE user_id = ?", (user["id"],)
        ).fetchall()
    total = len(rows)
    completed = sum(1 for r in rows if r["completed"])
    by_priority = {"High": 0, "Medium": 0, "Low": 0}
    completed_by_priority = {"High": 0, "Medium": 0, "Low": 0}
    for r in rows:
        p = r["priority"] if r["priority"] in by_priority else "Medium"
        by_priority[p] += 1
        if r["completed"]:
            completed_by_priority[p] += 1
    percent = round((completed / total) * 100) if total else 0
    return {
        "total": total,
        "completed": completed,
        "pending": total - completed,
        "percent": percent,
        "by_priority": by_priority,
        "completed_by_priority": completed_by_priority,
    }
# ---- Reports ------------------------------------------------------------ #

@app.get("/reports")
def generate_report(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user: sqlite3.Row = Depends(current_user)
):

    with get_db() as conn:

        task_query = """
        SELECT *
        FROM tasks
        WHERE user_id = ?
        """

        task_params = [user["id"]]


        if from_date and to_date:

            task_query += """
            AND deadline BETWEEN ? AND ?
            """

            task_params.extend(
                [
                    from_date,
                    to_date
                ]
            )


        tasks = conn.execute(
            task_query,
            task_params
        ).fetchall()



        # -------- NOTES --------

        notes_query = """
        SELECT *
        FROM notes
        WHERE user_id = ?
        """

        notes_params = [user["id"]]


        if from_date and to_date:

            notes_query += """
            AND updated_at BETWEEN ? AND ?
            """

            notes_params.extend(
                [
                    from_date,
                    to_date
                ]
            )


        notes = conn.execute(
            notes_query,
            notes_params
        ).fetchall()


    total_tasks = len(tasks)

    completed = sum(
        1
        for t in tasks
        if t["completed"] == 1
    )


    pending = total_tasks - completed


    percent = (
        round(
            (completed / total_tasks) * 100
        )
        if total_tasks
        else 0
    )


    return {

        "student": user["name"],


        "summary": {

            "total_tasks": total_tasks,

            "completed_tasks": completed,

            "pending_tasks": pending,

            "progress": percent,

            "notes_created": len(notes)

        },


        "tasks":
        [
            {
                "id": t["id"],
                "subject": t["subject"],
                "topic": t["topic"],
                "deadline": t["deadline"],
                "priority": t["priority"],
                "completed": bool(t["completed"])

            }

            for t in tasks
        ],


        "notes":
        [
            {
                "id": n["id"],
                "title": n["title"],
                "content": n["content"],
                "updated_at": n["updated_at"]
            }

            for n in notes
        ]

    }
# ---- Profile ------------------------------------------------------------ #


@app.get("/profile")
def get_profile(
    user: sqlite3.Row = Depends(current_user)
):

    return {

        "id": user["id"],
        "name": user["name"],
        "email": user["email"],

        "academic_level":
            user["academic_level"],

        "institution":
            user["institution"],

        "major":
            user["major"],

        "semester":
            user["semester"],

        "profile_image":
            user["profile_image"],

        "created_at":
            user["created_at"]

    }

@app.put("/profile")
def update_profile(
    data: ProfileUpdate,
    user: sqlite3.Row = Depends(current_user)
):

    with get_db() as conn:


        existing = conn.execute(
            """
            SELECT id FROM users
            WHERE email=? AND id!=?
            """,
            (
                data.email,
                user["id"]
            )
        ).fetchone()



        if existing:

            raise HTTPException(
                status_code=409,
                detail="Email already exists"
            )



        conn.execute(
            """
            UPDATE users SET

            name=?,
            email=?,
            academic_level=?,
            institution=?,
            major=?,
            semester=?,
            profile_image=?

            WHERE id=?

            """,

            (
                data.name,
                data.email,
                data.academic_level,
                data.institution,
                data.major,
                data.semester,
                data.profile_image,
                user["id"]
            )

        )



    return {
        "message":
        "Profile updated successfully"
    }
@app.put("/profile/password")
def change_password(

    data: PasswordUpdate,

    user: sqlite3.Row = Depends(current_user)

):


    if not verify_password(
        data.current_password,
        user["password_hash"]
    ):

        raise HTTPException(

            status_code=400,

            detail="Wrong current password"

        )



    if len(data.new_password) < 6:

        raise HTTPException(

            status_code=400,

            detail="Password must contain minimum 6 characters"

        )



    new_password = hash_password(
        data.new_password
    )



    with get_db() as conn:


        conn.execute(

            """
            UPDATE users

            SET password_hash=?

            WHERE id=?

            """,

            (

                new_password,

                user["id"]

            )

        )



    return {

        "message":
        "Password changed successfully"

    }