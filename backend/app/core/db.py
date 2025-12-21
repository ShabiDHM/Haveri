# FILE: backend/app/core/db.py
# PHOENIX PROTOCOL - DEFINITIVE FIX V4.0 (RADICAL SIMPLIFICATION)
# 1. FIX: ALL problematic type hints have been removed to satisfy Pylance.
# 2. ARCHITECTURE: The core architectural fix of lifespan-managed connections remains.

import pymongo
import redis
from pymongo.errors import ConnectionFailure
from urllib.parse import urlparse
from typing import Generator, Any
from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings

# --- Global client variables initialized to None ---
sync_mongo_client = None
db_instance = None
redis_sync_client = None
async_mongo_client = None
async_db_instance = None

# --- Connection Logic (To be called by lifespan manager) ---

def connect_to_mongo() -> None:
    global sync_mongo_client, db_instance
    if db_instance is not None: return
    
    print("--- [DB] Attempting to connect to Sync MongoDB... ---")
    try:
        client = pymongo.MongoClient(settings.DATABASE_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ismaster')
        db_name = urlparse(settings.DATABASE_URI).path.lstrip('/')
        if not db_name:
            raise ValueError("Database name not found in DATABASE_URI.")
        
        sync_mongo_client = client
        db_instance = client[db_name]
        print(f"--- [DB] Successfully connected to Sync MongoDB: '{db_name}' ---")
    except (ConnectionFailure, ValueError) as e:
        print(f"--- [DB] CRITICAL: Could not connect to Sync MongoDB: {e} ---")
        raise

def connect_to_redis() -> None:
    global redis_sync_client
    if redis_sync_client is not None: return

    print("--- [DB] Attempting to connect to Sync Redis... ---")
    try:
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        client.ping()
        redis_sync_client = client
        print("--- [DB] Successfully connected to Sync Redis. ---")
    except redis.ConnectionError as e:
        print(f"--- [DB] CRITICAL: Could not connect to Sync Redis: {e} ---")
        raise

async def connect_to_motor() -> None:
    global async_mongo_client, async_db_instance
    if async_db_instance is not None: return
    
    print("--- [DB] Attempting to connect to Async MongoDB (Motor)... ---")
    try:
        client = AsyncIOMotorClient(settings.DATABASE_URI, serverSelectionTimeoutMS=5000)
        await client.admin.command('ismaster')
        db_name = urlparse(settings.DATABASE_URI).path.lstrip('/')
        if not db_name:
            raise ValueError("Database name not found in DATABASE_URI.")
        
        async_mongo_client = client
        async_db_instance = client[db_name]
        print(f"--- [DB] Successfully connected to Async MongoDB (Motor): '{db_name}' ---")
    except (ConnectionFailure, ValueError) as e:
        print(f"--- [DB] CRITICAL: Could not connect to Async MongoDB (Motor): {e} ---")
        raise

# --- Shutdown Logic (To be called by lifespan manager) ---

def close_mongo_connections() -> None:
    if sync_mongo_client is not None:
        sync_mongo_client.close()
        print("--- [DB] Sync MongoDB connection closed. ---")
    if async_mongo_client is not None:
        async_mongo_client.close()
        print("--- [DB] Async MongoDB (Motor) connection closed. ---")

def close_redis_connection() -> None:
    if redis_sync_client is not None:
        redis_sync_client.close()
        print("--- [DB] Sync Redis connection closed. ---")

# --- Dependency Providers (Provide the established connections) ---

def get_db() -> Generator[Any, None, None]:
    if db_instance is None:
        raise RuntimeError("Synchronous database is not connected. Check application lifespan.")
    yield db_instance

def get_async_db() -> Generator[Any, None, None]:
    if async_db_instance is None:
        raise RuntimeError("Asynchronous database is not connected. Check application lifespan.")
    yield async_db_instance

def get_redis_client() -> Generator[Any, None, None]:
    if redis_sync_client is None:
        raise RuntimeError("Redis client is not connected. Check application lifespan.")
    yield redis_sync_client