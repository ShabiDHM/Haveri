# FILE: backend/app/api/endpoints/mobile_handoff.py
# PHOENIX PROTOCOL - MOBILE HANDOFF V1.0
# 1. FEATURE: Secure, token-based session management for mobile-to-desktop file uploads.
# 2. MECHANISM: Uses an in-memory dictionary for temporary, fast storage of handoff sessions.
# 3. ENDPOINTS: Provides create, upload, status check, and retrieval endpoints.

from fastapi import APIRouter, HTTPException, status, UploadFile, File
from fastapi.responses import Response
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any

router = APIRouter()

# In-memory storage for handoff sessions. For production, consider Redis.
handoff_sessions: Dict[str, Dict[str, Any]] = {}

# --- HELPER ---
def cleanup_old_sessions():
    """Removes sessions older than 10 minutes to prevent memory leaks."""
    now = datetime.utcnow()
    keys_to_delete = [
        token for token, session in handoff_sessions.items()
        if now - session.get("created_at", now) > timedelta(minutes=10)
    ]
    for key in keys_to_delete:
        del handoff_sessions[key]

# --- ENDPOINTS ---
@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_handoff_session():
    """Generates a unique, short-lived token for a mobile upload session."""
    cleanup_old_sessions()
    token = secrets.token_hex(16)
    handoff_sessions[token] = {
        "status": "pending",
        "file_content": None,
        "filename": None,
        "mime_type": None,
        "created_at": datetime.utcnow()
    }
    return {"token": token}

@router.post("/upload/{token}")
async def upload_mobile_file(token: str, file: UploadFile = File(...)):
    """Receives a file from a mobile device and attaches it to the session."""
    if token not in handoff_sessions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session ID e pavlefshme ose ka skaduar.")
    
    session = handoff_sessions[token]
    if session["status"] != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ky session tashmë ka një skedar të ngarkuar.")

    content = await file.read()
    session["status"] = "complete"
    session["file_content"] = content
    session["filename"] = file.filename
    session["mime_type"] = file.content_type
    
    return {"message": "Skedari u ngarkua me sukses."}

@router.get("/status/{token}")
async def get_handoff_status(token: str):
    """Allows the desktop client to poll for the status of an upload."""
    if token not in handoff_sessions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    
    session = handoff_sessions[token]
    if session["status"] == "complete":
        return {"status": "complete", "filename": session["filename"]}
    
    return {"status": "pending"}

@router.get("/retrieve/{token}")
async def retrieve_handoff_file(token: str):
    """Allows the desktop to download the file content after a successful upload."""
    if token not in handoff_sessions or handoff_sessions[token]["status"] != "complete":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skedari nuk u gjet ose ngarkimi nuk ka përfunduar.")
    
    session = handoff_sessions.pop(token) # Pop to ensure one-time retrieval
    
    return Response(
        content=session["file_content"], 
        media_type=session["mime_type"],
        headers={"Content-Disposition": f'attachment; filename="{session["filename"]}"'}
    )