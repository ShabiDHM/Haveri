# FILE: backend/app/core/db.py
# PHOENIX PROTOCOL - DB MGMT V5.1 (PYLANCE COMPLIANT)
# 1. FIX: Corrected Neo4j driver type hint to 'Union[Driver, None]' to satisfy strict type checking.
# 2. FEATURE: Added connection logic for Neo4j Graph Database.
# 3. ARCHITECTURE: Follows existing lifespan-managed singleton pattern.

import pymongo
import redis
from pymongo.errors import ConnectionFailure
from urllib.parse import urlparse
from typing import Generator, Any, Union # <-- IMPORT UNION
from motor.motor_asyncio import AsyncIOMotorClient
from neo4j import GraphDatabase, Driver

from .config import settings

# --- Global client variables initialized to None ---
sync_mongo_client = None
db_instance = None
redis_sync_client = None
async_mongo_client = None
async_db_instance = None
neo4j_driver: Union[Driver, None] = None # <-- FIX: Corrected Type Hint

# --- Connection Logic (To be called by lifespan manager) ---

def connect_to_mongo() -> None:
    global sync_mongo_client, db_instance
    if db_instance is not None: return
    
    print("--- [DB] Attempting to connect to Sync MongoDB... ---")
    try:
        client = pymongo.MongoClient(settings.DATABASE_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ismaster')
        db_name = urlparse(settings.DATABASE_URI).path.lstrip('/')
        if not db_name: raise ValueError("Database name not found in DATABASE_URI.")
        
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
        if not db_name: raise ValueError("Database name not found in DATABASE_URI.")
        
        async_mongo_client = client
        async_db_instance = client[db_name]
        print(f"--- [DB] Successfully connected to Async MongoDB (Motor): '{db_name}' ---")
    except (ConnectionFailure, ValueError) as e:
        print(f"--- [DB] CRITICAL: Could not connect to Async MongoDB (Motor): {e} ---")
        raise

def connect_to_neo4j() -> None:
    global neo4j_driver
    if neo4j_driver is not None: return

    print("--- [DB] Attempting to connect to Neo4j Graph Database... ---")
    try:
        driver = GraphDatabase.driver(
            settings.NEO4J_URI, 
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
        driver.verify_connectivity()
        neo4j_driver = driver
        print("--- [DB] Successfully connected to Neo4j Graph Database. ---")
    except Exception as e:
        print(f"--- [DB] CRITICAL: Could not connect to Neo4j: {e} ---")
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

def close_neo4j_connection() -> None:
    global neo4j_driver
    if neo4j_driver is not None:
        neo4j_driver.close()
        print("--- [DB] Neo4j connection closed. ---")


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

def get_neo4j_driver() -> Generator[Driver, None, None]:
    if neo4j_driver is None:
        raise RuntimeError("Neo4j driver is not connected. Check application lifespan.")
    yield neo4j_driver