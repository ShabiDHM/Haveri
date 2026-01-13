# FILE: backend/app/core/lifespan.py
# PHOENIX PROTOCOL - LIFESPAN MANAGER V4.0 (GRAPH DB INTEGRATION)
# 1. FEATURE: Integrated Neo4j connection and disconnection into the app lifecycle.
# 2. STATUS: All databases are now managed by the lifespan context.

from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
import chromadb
from pymongo import ASCENDING, DESCENDING

from .db import (
    connect_to_mongo,
    connect_to_redis,
    connect_to_motor,
    connect_to_neo4j, # <-- IMPORT NEO4J CONNECT
    close_mongo_connections,
    close_redis_connection,
    close_neo4j_connection, # <-- IMPORT NEO4J CLOSE
    db_instance, 
    async_db_instance 
)
from .config import settings
from .embeddings import HaveriEmbeddingFunction

logger = logging.getLogger(__name__)

def initialize_chromadb():
    """Initializes ChromaDB connection."""
    try:
        logger.info("--- [Lifespan] Initializing ChromaDB connection... ---")
        client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
        
        embedding_function = HaveriEmbeddingFunction()
        # Ensure collection exists and get document count
        collection = client.get_or_create_collection(
            name="legal_knowledge_base",
            embedding_function=embedding_function
        )
        logger.info(f"--- [Lifespan] ✅ Collection '{collection.name}' is available with {collection.count()} documents. ---")
    except Exception as e:
        logger.error(f"--- [Lifespan] ❌ FAILED to initialize ChromaDB: {e} ---")

async def create_mongo_indexes(app: FastAPI):
    """Creates MongoDB indexes for performance."""
    try:
        if not hasattr(app.state, "async_mongo_db") or app.state.async_mongo_db is None:
            logger.warning("--- [Indexes] ⚠️ MongoDB not found in app.state. Skipping indexing. ---")
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
    logger.info("--- [Lifespan] Application startup sequence initiated. ---")
    
    # --- Connect to all databases ---
    connect_to_mongo()
    connect_to_redis()
    await connect_to_motor()
    connect_to_neo4j() # <-- CONNECT TO NEO4J
    
    app.state.mongo_db = db_instance
    app.state.async_mongo_db = async_db_instance
    
    # --- Initialize services and indexes ---
    initialize_chromadb()
    await create_mongo_indexes(app)
    
    logger.info("--- [Lifespan] All resources initialized. Application is ready. ---")
    
    yield
    
    # --- Disconnect from all databases ---
    logger.info("--- [Lifespan] Application shutdown sequence initiated. ---")
    close_mongo_connections()
    close_redis_connection()
    close_neo4j_connection() # <-- DISCONNECT FROM NEO4J
    logger.info("--- [Lifespan] All connections closed gracefully. Shutdown complete. ---")