# FILE: backend/app/api/endpoints/share.py
# PHOENIX PROTOCOL - MESSAGING V8.1
# 1. FEATURE: Added 'submit_portal_message' for clients to write to you.
# 2. FEATURE: Added 'get_my_messages' for you to read them.
# 3. SAFETY: Ensures messages are linked to the specific Case Owner.

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from pymongo.database import Database
from pydantic import BaseModel, EmailStr
import os
from datetime import datetime
from bson import ObjectId
from typing import List

from app.api.endpoints.dependencies import get_db, get_current_user
from app.services.share_service import ShareService
from app.services import social_service
from app.models.user import UserInDB

router = APIRouter(tags=["Social"])

# CONFIGURATION
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.haveri.tech")
API_URL = os.getenv("API_BASE_URL", "https://api.haveri.tech")

class ShareUpdateRequest(BaseModel):
    is_shared: bool

# --- MESSAGE MODELS ---
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

# --- PUBLIC ENDPOINTS ---

@router.get("/portal/{case_id}", response_class=JSONResponse)
def get_public_data_for_portal(case_id: str, db: Database = Depends(get_db)):
    service = ShareService(db)
    public_data = service.get_public_case_data(case_id)
    if not public_data:
        raise HTTPException(status_code=404, detail="Case not found or has no shared items.")
    return public_data

@router.post("/portal/{case_id}/message", status_code=status.HTTP_201_CREATED)
def submit_portal_message(
    case_id: str, 
    msg: ClientMessageIn, 
    db: Database = Depends(get_db)
):
    """
    Public endpoint for clients to send messages.
    """
    try:
        if not ObjectId.is_valid(case_id):
            raise HTTPException(status_code=404, detail="Invalid Project ID")

        case = db.cases.find_one({"_id": ObjectId(case_id)})
        if not case:
            raise HTTPException(status_code=404, detail="Project not found")
        
        owner_id = case.get("user_id")

        new_message = {
            "user_id": owner_id, # The Business Owner
            "case_id": ObjectId(case_id),
            "case_title": case.get("title", "Unknown Project"),
            "sender_name": f"{msg.first_name} {msg.last_name}",
            "sender_email": msg.email,
            "content": msg.message,
            "created_at": datetime.utcnow(),
            "is_read": False
        }

        db.client_messages.insert_one(new_message)
        return {"status": "sent"}
    except Exception as e:
        print(f"Message Error: {e}")
        raise HTTPException(status_code=500, detail="Could not send message")

# --- PROTECTED ENDPOINTS (For You) ---

@router.get("/messages", response_model=List[ClientMessageOut])
def get_my_messages(
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Fetch all messages sent by clients to the logged-in user.
    """
    cursor = db.client_messages.find({"user_id": current_user.id}).sort("created_at", -1)
    
    messages = []
    for doc in cursor:
        messages.append(ClientMessageOut(
            id=str(doc["_id"]),
            case_id=str(doc["case_id"]),
            case_title=doc.get("case_title", "Unknown Project"),
            client_name=doc.get("sender_name", "Unknown"),
            sender_email=doc.get("sender_email", ""),
            content=doc.get("content", ""),
            created_at=doc["created_at"],
            is_read=doc.get("is_read", False)
        ))
    
    return messages

# --- SHARE LOGIC ---

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