# FILE: backend/app/core/lifespan.py
# PHOENIX PROTOCOL - LIFESPAN MANAGER V3.1 (RENAMED)
# 1. FIX: Updated import from 'JuristiRemoteEmbeddings' to 'HaveriEmbeddingFunction'.
# 2. ALIGNMENT: Ensures the lifespan manager uses the correctly named core components.
# 3. STATUS: This is the final, architecturally sound version.

from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
import chromadb
from pymongo import ASCENDING, DESCENDING

from .db import (
    connect_to_mongo,
    connect_to_redis,
    connect_to_motor,
    close_mongo_connections,
    close_redis_connection,
    db_instance, 
    async_db_instance 
)
from .config import settings
# PHOENIX FIX: Import the correctly named class
from .embeddings import HaveriEmbeddingFunction

logger = logging.getLogger(__name__)

def initialize_chromadb():
    """Initializes ChromaDB connection."""
    try:
        logger.info("--- [Lifespan] Initializing ChromaDB connection... ---")
        client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
        
        # PHOENIX FIX: Instantiate the correctly named class
        embedding_function = HaveriEmbeddingFunction()
        client.get_or_create_collection(
            name="legal_knowledge_base",
            embedding_function=embedding_function
        )
        logger.info("--- [Lifespan] ✅ Successfully connected to ChromaDB. ---")
    except Exception as e:
        logger.error(f"--- [Lifespan] ❌ FAILED to initialize ChromaDB: {e} ---")

async def create_mongo_indexes(app: FastAPI):
    """Creates MongoDB indexes for performance."""
    try:
        if not hasattr(app.state, "async_mongo_db") or app.state.async_mongo_db is None:
            logger.warning("--- [Indexes] ⚠️ Async MongoDB not found in app.state. Skipping indexing. ---")
            return

        db = app.state.async_mongo_db
        logger.info("--- [Lifespan] 🚀 Optimizing Database Indexes... ---")

        await db.users.create_index([("email", ASCENDING)], unique=True)
        await db.cases.create_index([("owner_id", ASCENDING), ("updated_at", DESCENDING)])
        await db.cases.create_index([("case_number", ASCENDING)])
        await db.documents.create_index([("case_id", ASCENDING), ("created_at", DESCENDING)])
        await db.documents.create_index([("owner_id", ASCENDING)])
        await db.calendar_events.create_index([("case_id", ASCENDING)])
        await db.calendar_events.create_index([("start_date", ASCENDING)])
        await db.calendar_events.create_index([("owner_id", ASCENDING)])
        
        logger.info("--- [Lifespan] ✅ Database Indexes Verified/Created. ---")
    except Exception as e:
        logger.error(f"--- [Lifespan] ❌ Index Creation Failed: {e} ---")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles application startup and shutdown events."""
    logger.info("--- [Lifespan] Application startup sequence initiated... ---")
    
    connect_to_mongo()
    connect_to_redis()
    await connect_to_motor()
    
    app.state.mongo_db = db_instance
    app.state.async_mongo_db = async_db_instance
    
    initialize_chromadb()
    await create_mongo_indexes(app)
    
    logger.info("--- [Lifespan] All resources initialized. Application is ready. ---")
    
    yield
    
    logger.info("--- [Lifespan] Application shutdown sequence initiated. ---")
    close_mongo_connections()
    close_redis_connection()
    logger.info("--- [Lifespan] All connections closed gracefully. Shutdown complete. ---")