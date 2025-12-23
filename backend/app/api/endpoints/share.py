# FILE: backend/app/api/endpoints/share.py
# PHOENIX PROTOCOL - SHARE ENDPOINT V3.0 (SMART REDIRECT)
# 1. LOGIC: Detects 'User-Agent'.
#    - Bots (WhatsApp/Viber) -> Get HTML with Rich Card.
#    - Humans (Browsers) -> Get Instant Redirect to haveri.tech.
# 2. CONFIG: Updated default domain to 'haveri.tech'.
# 3. VISUAL: Integrated 'social_service' for the nice PNG card.

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from pymongo.database import Database
from pydantic import BaseModel
import os
from bson import ObjectId

from app.api.endpoints.dependencies import get_db, get_current_user
from app.services.share_service import ShareService
from app.services import social_service # Visual Generator
from app.models.user import UserInDB

router = APIRouter(tags=["Social"])

# CONFIGURATION
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.haveri.tech")
API_URL = os.getenv("API_BASE_URL", "https://api.haveri.tech")

class ShareUpdateRequest(BaseModel):
    is_shared: bool

# --- PUBLIC/CLIENT PORTAL DATA ENDPOINT ---

@router.get("/portal/{case_id}", response_class=JSONResponse)
def get_public_data_for_portal(case_id: str, db: Database = Depends(get_db)):
    service = ShareService(db)
    public_data = service.get_public_case_data(case_id)
    if not public_data:
        raise HTTPException(status_code=404, detail="Case not found or has no shared items.")
    return public_data

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
    """
    Generates the Dark Mode 'Nice Card' for social previews.
    """
    try:
        service = ShareService(db)
        case_data = service.get_public_case_data(case_id)
        
        if not case_data:
            # Fallback text
            title = "Dosje Private"
            client = "---"
            status_txt = "Protected"
        else:
            title = case_data.get("title", "Rast Ligjor")
            client = case_data.get("client_name", "Klient")
            status_txt = str(case_data.get("status", "OPEN")).upper()

        # Generate Image (JPEG for speed/compatibility)
        img_bytes = social_service.generate_social_card(title, client, status_txt)
        return Response(content=img_bytes, media_type="image/jpeg")
    except Exception:
        return Response(status_code=404)

# --- SMART LINK (THE MAGIC SWITCH) ---

@router.get("/c/{case_id}")
async def share_case_link(
    request: Request,
    case_id: str,
    db: Database = Depends(get_db)
):
    """
    The Smart Link logic.
    """
    user_agent = request.headers.get("user-agent", "").lower()
    
    # List of bots that need the Image Card
    bots = [
        'facebookexternalhit', 
        'whatsapp', 
        'viber', 
        'twitterbot', 
        'telegrambot', 
        'linkedinbot', 
        'slackbot', 
        'discordbot',
        'instagram'
    ]
    
    is_bot = any(bot in user_agent for bot in bots)

    # 1. IF BOT: Serve HTML with Meta Tags (So the card shows up)
    if is_bot:
        service = ShareService(db)
        case_data = service.get_public_case_data(case_id)
        
        title = case_data.get("title", "Rast Ligjor") if case_data else "Juristi AI"
        desc = "Shiko detajet e dosjes në platformën e sigurt."
        
        # Point to the image generator endpoint
        image_url = f"{API_URL}/api/v1/share/c/{case_id}/image"

        html_content = f"""
        <!DOCTYPE html>
        <html lang="sq">
        <head>
            <meta charset="UTF-8">
            <title>{title}</title>
            
            <meta property="og:title" content="{title}" />
            <meta property="og:description" content="{desc}" />
            <meta property="og:image" content="{image_url}" />
            <meta property="og:type" content="website" />
            
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="{title}" />
            <meta name="twitter:description" content="{desc}" />
            <meta name="twitter:image" content="{image_url}" />
        </head>
        <body>
            <h1>Redirecting...</h1>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    # 2. IF HUMAN: Redirect instantly to the Frontend App
    # This prevents the user from seeing the API URL
    return RedirectResponse(url=f"{FRONTEND_URL}/portal/{case_id}")