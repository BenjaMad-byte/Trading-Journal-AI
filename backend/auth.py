import os
import sqlite3
import tempfile
from datetime import datetime, timezone

from fastapi import HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

from database import DB_PATH

BACKUP_BUCKET = "backups"


def _get_anon_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Supabase is not configured (SUPABASE_URL / SUPABASE_KEY missing from .env)",
        )
    return create_client(url, key)


def _get_authed_client(access_token: str, refresh_token: str) -> tuple[Client, str]:
    """A fresh client, authenticated as the user, plus their user id."""
    client = _get_anon_client()
    try:
        client.auth.set_session(access_token, refresh_token)
        user = client.auth.get_user(access_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Session invalid or expired, please sign in again")
    if not user or not user.user:
        raise HTTPException(status_code=401, detail="Session invalid or expired, please sign in again")
    return client, user.user.id


class SignupBody(BaseModel):
    email: str
    password: str


class LoginBody(BaseModel):
    email: str
    password: str


class SessionBody(BaseModel):
    access_token: str
    refresh_token: str


def signup(body: SignupBody) -> dict:
    client = _get_anon_client()
    try:
        result = client.auth.sign_up({"email": body.email, "password": body.password})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if result.session:
        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "user_id": result.user.id,
            "email": result.user.email,
        }
    # Supabase project requires email confirmation before a session is issued
    return {
        "access_token": None,
        "refresh_token": None,
        "message": "Account created. Confirm your address from the email Supabase sent, then sign in.",
    }


def login(body: LoginBody) -> dict:
    client = _get_anon_client()
    try:
        result = client.auth.sign_in_with_password({"email": body.email, "password": body.password})
    except Exception:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
        "user_id": result.user.id,
        "email": result.user.email,
    }


def _snapshot_db_bytes() -> bytes:
    """Consistent copy of the live SQLite DB (safe even with WAL + an open connection)."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        src = sqlite3.connect(DB_PATH)
        dst = sqlite3.connect(tmp_path)
        try:
            src.backup(dst)
        finally:
            dst.close()
            src.close()
        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        os.remove(tmp_path)


def backup(body: SessionBody) -> dict:
    client, user_id = _get_authed_client(body.access_token, body.refresh_token)
    data = _snapshot_db_bytes()
    path = f"{user_id}/journal.db"
    try:
        client.storage.from_(BACKUP_BUCKET).upload(
            path, data, file_options={"upsert": "true", "content-type": "application/octet-stream"}
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Supabase Storage upload failed: {e}")
    return {
        "uploaded": True,
        "size": len(data),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def restore(body: SessionBody) -> dict:
    client, user_id = _get_authed_client(body.access_token, body.refresh_token)
    path = f"{user_id}/journal.db"
    try:
        data = client.storage.from_(BACKUP_BUCKET).download(path)
    except Exception:
        raise HTTPException(status_code=404, detail="No backup found for this account")

    # Safety copy of the current local DB before overwriting it
    safety_path = f"{DB_PATH}.before_restore"
    if os.path.exists(DB_PATH):
        with open(DB_PATH, "rb") as src, open(safety_path, "wb") as dst:
            dst.write(src.read())

    with open(DB_PATH, "wb") as f:
        f.write(data)

    return {"restored": True, "size": len(data), "safety_copy": safety_path}


def backup_status(access_token: str, refresh_token: str) -> dict:
    client, user_id = _get_authed_client(access_token, refresh_token)
    try:
        listing = client.storage.from_(BACKUP_BUCKET).list(user_id)
    except Exception:
        return {"last_backup": None}
    for item in listing:
        if item.get("name") == "journal.db":
            meta = item.get("updated_at") or item.get("created_at")
            return {"last_backup": meta}
    return {"last_backup": None}
