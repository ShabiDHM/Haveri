# FILE: ai-core-service/main.py
# PHOENIX PROTOCOL - AI CORE V11.0 (API PREFIX ALIGNED)
# 1. FIX: Added APIRouter with settings.API_V1_STR prefix for Advocatus compatibility.

import os
import sys
import logging
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from config import settings
from routers import embeddings, reranking, ner, categorization

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"--- [AI-CORE] Booting {settings.PROJECT_NAME}... ---")
    yield
    logger.info("--- [AI-CORE] Shutting down... ---")

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ALIGNED ROUTING ---
api_v1_router = APIRouter(prefix=settings.API_V1_STR)
api_v1_router.include_router(embeddings.router, prefix="/embeddings", tags=["Embeddings"])
api_v1_router.include_router(reranking.router, prefix="/reranking", tags=["Reranking"])
api_v1_router.include_router(ner.router, prefix="/ner", tags=["NER"])
api_v1_router.include_router(categorization.router, prefix="/categorization", tags=["Categorization"])

app.include_router(api_v1_router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)