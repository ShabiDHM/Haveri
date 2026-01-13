# FILE: backend/app/core/db.py
# PHOENIX PROTOCOL - DB MGMT V5.1 (PYLANCE COMPLIANT - RESTORED)
# 1. RESTORED: Re-added the try...except block to the Neo4j connection logic for production safety.
# 2. STATUS: Production Ready.

import pymongo
import redis
from pymongo.errors import ConnectionFailure
from urllib.parse import urlparse
from typing import Generator, Any, Union
from motor.motor_asyncio import AsyncIOMotorClient
from neo4j import GraphDatabase, Driver

from .config import settings

# --- Global client variables ---
sync_mongo_client = None
db_instance = None
redis_sync_client = None
async_mongo_client = None
async_db_instance = None
neo4j_driver: Union[Driver, None] = None

# --- Connection Logic ---
def connect_to_mongo():
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

def connect_to_redis():
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

async def connect_to_motor():
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

def connect_to_neo4j():
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

# --- Shutdown Logic ---
def close_mongo_connections():
    if sync_mongo_client: sync_mongo_client.close(); print("--- [DB] Sync MongoDB connection closed. ---")
    if async_mongo_client: async_mongo_client.close(); print("--- [DB] Async MongoDB (Motor) connection closed. ---")

def close_redis_connection():
    if redis_sync_client: redis_sync_client.close(); print("--- [DB] Sync Redis connection closed. ---")

def close_neo4j_connection():
    if neo4j_driver: neo4j_driver.close(); print("--- [DB] Neo4j connection closed. ---")

# --- Dependency Providers ---
def get_db():
    if db_instance is None: raise RuntimeError("Sync DB not connected.")
    yield db_instance

def get_async_db():
    if async_db_instance is None: raise RuntimeError("Async DB not connected.")
    yield async_db_instance

def get_redis_client():
    if redis_sync_client is None: raise RuntimeError("Redis not connected.")
    yield redis_sync_client

def get_neo4j_driver():
    if neo4j_driver is None: raise RuntimeError("Neo4j not connected.")
    yield neo4j_driver