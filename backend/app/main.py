# FILE: backend/app/main.py
# HAVERI AI - KOSOVO COMMERCIAL INTELLIGENCE ENGINE

import logging
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.lifespan import lifespan

# --- Core Router Imports ---
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.users import router as users_router
from app.api.endpoints.workspace import router as workspace_router
from app.api.endpoints.admin import router as admin_router
from app.api.endpoints.business import router as business_router
from app.api.endpoints.archive import router as archive_router
from app.api.endpoints.briefing import router as strategic_briefing_router
from app.api.endpoints.analysis import router as analysis_router 
from app.api.endpoints.inbound import router as inbound_router
from app.api.endpoints.share import router as share_router
from app.api.endpoints.support import router as support_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Haveri AI - Commercial Intelligence Engine",
    description="Kosovo Market Intelligence, Construction Radar & Tender Arbitrage API",
    version="2.0.0",
    lifespan=lifespan
)

# Proxy headers support
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")  # type: ignore

# --- CORS Configuration ---
allow_origin_regex = r"https?://(localhost(:\d+)?|([\w-]+\.)?haveri\.tech|([\w-]+\.)?vercel\.app)"
app.add_middleware(
    CORSMiddleware, 
    allow_origin_regex=allow_origin_regex, 
    allow_credentials=True, 
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type", "Content-Length"]
)

# --- ROUTER ASSEMBLY ---
api_v1_router = APIRouter(prefix="/api/v1")

# Core & Infrastructure
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_v1_router.include_router(users_router, prefix="/users", tags=["Users"])
api_v1_router.include_router(workspace_router, prefix="/workspace", tags=["Workspace"])
api_v1_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_v1_router.include_router(business_router, prefix="/business", tags=["Business Profile"])
api_v1_router.include_router(archive_router, prefix="/archive", tags=["Archive & Docs"])
api_v1_router.include_router(strategic_briefing_router, prefix="/briefing", tags=["Briefing"])
api_v1_router.include_router(analysis_router, prefix="/analysis", tags=["Smart Analysis"])
api_v1_router.include_router(inbound_router, prefix="/inbound", tags=["Inbound Data"])
api_v1_router.include_router(share_router, prefix="/share", tags=["Share"])
api_v1_router.include_router(support_router, prefix="/support", tags=["Support"])

app.include_router(api_v1_router)

@app.get("/health", tags=["Health Check"])
def health_check(): 
    return {"status": "ok", "system": "Haveri Intelligence Core", "version": "2.0.0"}