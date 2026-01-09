# FILE: backend/app/api/endpoints/share.py
# PHOENIX PROTOCOL - MESSAGING V8.2 (COMPLETE FILE)
# 1. FEATURE: Added 'submit_portal_message' and 'get_my_messages' endpoints.
# 2. FEATURE: Added 'update_message_status' and 'delete_message_permanently' endpoints.
# 3. DATA MODEL: Messages now have a 'status' field ('INBOX', 'ARCHIVED', 'TRASHED').
# 4. LOGIC: 'get_my_messages' now filters by status, allowing for folder views.

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from pymongo.database import Database
from pydantic import BaseModel, EmailStr
import os
from datetime import datetime
from bson import ObjectId
from typing import List, Literal

from app.api.endpoints.dependencies import get_db, get_current_user
from app.services.share_service import ShareService
from app.services import social_service
from app.models.user import UserInDB

router = APIRouter(tags=["Social"])

# --- CONFIGURATION & MODELS ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.haveri.tech")
API_URL = os.getenv("API_BASE_URL", "https://api.haveri.tech")

class ShareUpdateRequest(BaseModel):
    is_shared: bool

class ClientMessageIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    message: str

class ClientMessageOut(BaseModel):
    id: str
    case_id: str
    case_title: str
    client_name: str
    sender_email: str
    content: str
    created_at: datetime
    is_read: bool
    status: str

class MessageStatusUpdate(BaseModel):
    status: Literal['INBOX', 'ARCHIVED', 'TRASHED']

# --- PUBLIC ENDPOINTS ---

@router.get("/portal/{case_id}", response_class=JSONResponse)
def get_public_data_for_portal(case_id: str, db: Database = Depends(get_db)):
    service = ShareService(db)
    public_data = service.get_public_case_data(case_id)
    if not public_data:
        raise HTTPException(status_code=404, detail="Case not found or has no shared items.")
    return public_data

@router.post("/portal/{case_id}/message", status_code=status.HTTP_201_CREATED)
def submit_portal_message(case_id: str, msg: ClientMessageIn, db: Database = Depends(get_db)):
    try:
        if not ObjectId.is_valid(case_id):
            raise HTTPException(status_code=404, detail="Invalid Project ID")

        case = db.cases.find_one({"_id": ObjectId(case_id)})
        if not case:
            raise HTTPException(status_code=404, detail="Project not found")
        
        owner_id = case.get("user_id")

        new_message = {
            "user_id": owner_id,
            "case_id": ObjectId(case_id),
            "case_title": case.get("title", "Unknown Project"),
            "sender_name": f"{msg.first_name} {msg.last_name}",
            "sender_email": msg.email,
            "content": msg.message,
            "created_at": datetime.utcnow(),
            "is_read": False,
            "status": "INBOX"
        }
        db.client_messages.insert_one(new_message)
        return {"status": "sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not send message")

# --- PROTECTED MESSAGING ENDPOINTS ---

@router.get("/messages", response_model=List[ClientMessageOut])
def get_my_messages(
    status: str = "INBOX",
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    cursor = db.client_messages.find({"user_id": current_user.id, "status": status}).sort("created_at", -1)
    messages = [ClientMessageOut(
        id=str(doc["_id"]),
        case_id=str(doc["case_id"]),
        case_title=doc.get("case_title", "N/A"),
        client_name=doc.get("sender_name", "N/A"),
        sender_email=doc.get("sender_email", ""),
        content=doc.get("content", ""),
        created_at=doc["created_at"],
        is_read=doc.get("is_read", False),
        status=doc.get("status", "INBOX")
    ) for doc in cursor]
    return messages

@router.put("/messages/{message_id}/status", status_code=status.HTTP_200_OK)
def update_message_status(
    message_id: str,
    update_data: MessageStatusUpdate,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    result = db.client_messages.update_one(
        {"_id": ObjectId(message_id), "user_id": current_user.id},
        {"$set": {"status": update_data.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"status": "updated"}

@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message_permanently(
    message_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    result = db.client_messages.delete_one(
        {"_id": ObjectId(message_id), "user_id": current_user.id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- INTERNAL SHARING TOGGLE ENDPOINTS ---

@router.put("/case/{case_id}", status_code=status.HTTP_200_OK)
def update_case_share_status(
    case_id: str,
    update_data: ShareUpdateRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = ShareService(db)
    service.set_case_share_status(case_id, str(current_user.id), update_data.is_shared)
    return {"status": "success", "case_id": case_id, "is_shared": update_data.is_shared}

# --- DYNAMIC IMAGE GENERATOR ---

@router.get("/c/{case_id}/image")
async def get_case_social_image(case_id: str, db: Database = Depends(get_db)):
    try:
        service = ShareService(db)
        case_data = service.get_public_case_data(case_id)
        if not case_data:
            title, client, status_txt = "Dosje Private", "---", "Protected"
        else:
            title = case_data.get("title", "Rast Ligjor")
            client = case_data.get("client_name", "Klient")
            status_txt = str(case_data.get("status", "OPEN")).upper()
        img_bytes = social_service.generate_social_card(title, client, status_txt)
        return Response(content=img_bytes, media_type="image/jpeg")
    except Exception:
        return Response(status_code=404)

# --- SMART LINK (THE MAGIC SWITCH) ---

@router.get("/c/{case_id}")
async def share_case_link(request: Request, case_id: str, db: Database = Depends(get_db)):
    user_agent = request.headers.get("user-agent", "").lower()
    bots = ['facebookexternalhit', 'whatsapp', 'viber', 'twitterbot', 'telegrambot', 'linkedinbot', 'slackbot', 'discordbot', 'instagram']
    is_bot = any(bot in user_agent for bot in bots)

    if is_bot:
        service = ShareService(db)
        case_data = service.get_public_case_data(case_id)
        title = case_data.get("title", "Rast Ligjor") if case_data else "Juristi AI"
        desc = "Shiko detajet e dosjes në platformën e sigurt."
        image_url = f"{API_URL}/api/v1/share/c/{case_id}/image"
        html_content = f"""<!DOCTYPE html><html lang="sq"><head><meta charset="UTF-8"><title>{title}</title><meta property="og:title" content="{title}" /><meta property="og:description" content="{desc}" /><meta property="og:image" content="{image_url}" /><meta property="og:type" content="website" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="{title}" /><meta name="twitter:description" content="{desc}" /><meta name="twitter:image" content="{image_url}" /></head><body><h1>Redirecting...</h1></body></html>"""
        return HTMLResponse(content=html_content)
    
    return RedirectResponse(url=f"{FRONTEND_URL}/portal/{case_id}")