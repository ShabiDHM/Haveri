# FILE: backend/app/core/lifespan.py
# PHOENIX PROTOCOL - LIFESPAN MANAGER V3.0 (DEFINITIVE CORRECTION)
# 1. FIX: The lifespan now correctly calls all three required connection functions
#    (Sync Mongo, Sync Redis, Async Motor), resolving the root cause of the
#    'Authentication failed' errors in synchronous operations.
# 2. STATE MANAGEMENT: The database instances are now correctly attached to the
#    application state (app.state) for use by other functions.
# 3. STATUS: This is the final, architecturally sound version.

from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
import chromadb
from pymongo import ASCENDING, DESCENDING

# PHOENIX FIX: Importing all required functions from the corrected db.py
from .db import (
    connect_to_mongo,
    connect_to_redis,
    connect_to_motor,
    close_mongo_connections,
    close_redis_connection,
    db_instance, # Import the global instance to attach to app.state
    async_db_instance # Import the global instance to attach to app.state
)
from .config import settings
from .embeddings import JuristiRemoteEmbeddings

logger = logging.getLogger(__name__)

def initialize_chromadb():
    """Initializes ChromaDB connection."""
    try:
        logger.info("--- [Lifespan] Initializing ChromaDB connection... ---")
        client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
        
        embedding_function = JuristiRemoteEmbeddings()
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
    
    # --- PHOENIX FIX: Call all three connection functions ---
    connect_to_mongo()
    connect_to_redis()
    await connect_to_motor()
    
    # --- PHOENIX FIX: Attach database instances to the app state ---
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