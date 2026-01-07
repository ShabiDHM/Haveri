# FILE: backend/app/main.py
# PHOENIX PROTOCOL - MAIN APPLICATION V9.1 (CORS FIX)
# 1. FIX: Replaced 'allowed_origins' list with a robust 'allow_origin_regex'.
# 2. REASON: A regex correctly handles multiple subdomains (www, api) and Vercel preview URLs, resolving the preflight request failure.
# 3. STATUS: CORS policy is now correctly configured for production and development environments.

from fastapi import FastAPI, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
import logging
from app.core.lifespan import lifespan

# --- Router Imports ---
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.users import router as users_router
from app.api.endpoints.cases import router as cases_router
from app.api.endpoints.admin import router as admin_router
from app.api.endpoints.calendar import router as calendar_router
from app.api.endpoints.chat import router as chat_router
from app.api.endpoints.stream import router as stream_router
from app.api.endpoints.support import router as support_router
from app.api.endpoints.business import router as business_router
from app.api.endpoints.finance import router as finance_router
from app.api.endpoints import finance_wizard
from app.api.endpoints.archive import router as archive_router
from app.api.endpoints.drafting_v2 import router as drafting_v2_router
from app.api.endpoints.share import router as share_router
from app.api.endpoints.inventory import router as inventory_router
from app.api.endpoints.daily_briefing import router as daily_briefing_router
from app.api.endpoints.briefing import router as strategic_briefing_router
from app.api.endpoints.analysis import router as analysis_router 

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Haveri AI API", lifespan=lifespan)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*") # type: ignore

# --- CORS CONFIGURATION (PHOENIX FIX) ---
# Using a regex is more robust for handling subdomains (www) and deployment previews.
# This single regex covers: localhost, haveri.tech, www.haveri.tech, and any vercel.app preview URL.
allow_origin_regex = r"https?://(localhost(:\d+)?|([\w-]+\.)?haveri\.tech|([\w-]+\.)?vercel\.app)"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTER ASSEMBLY ---
api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_v1_router.include_router(users_router, prefix="/users", tags=["Users"])
api_v1_router.include_router(cases_router, prefix="/cases", tags=["Cases"])
api_v1_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_v1_router.include_router(calendar_router, prefix="/calendar", tags=["Calendar"])
api_v1_router.include_router(chat_router, prefix="/chat", tags=["Chat"])
api_v1_router.include_router(business_router, prefix="/business", tags=["Business"])
api_v1_router.include_router(finance_router, prefix="/finance", tags=["Finance"])
api_v1_router.include_router(inventory_router, prefix="/inventory", tags=["Inventory & Operations"])
api_v1_router.include_router(archive_router, prefix="/archive", tags=["Archive"])
api_v1_router.include_router(daily_briefing_router, prefix="/daily-briefing", tags=["Daily Briefing (Legacy)"])
api_v1_router.include_router(strategic_briefing_router, prefix="/briefing", tags=["Briefing"])
api_v1_router.include_router(share_router, prefix="/share", tags=["Share"])
api_v1_router.include_router(stream_router, prefix="/stream", tags=["Streaming"])
api_v1_router.include_router(support_router, prefix="/support", tags=["Support"])
api_v1_router.include_router(finance_wizard.router, prefix="/finance/wizard", tags=["Finance Wizard"])
api_v1_router.include_router(analysis_router, prefix="/analysis", tags=["Smart Analysis"]) 

api_v2_router = APIRouter(prefix="/api/v2")
api_v2_router.include_router(drafting_v2_router, prefix="/drafting", tags=["Drafting V2"])

app.include_router(api_v1_router)
app.include_router(api_v2_router)

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health Check"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}