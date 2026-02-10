# FILE: backend/app/core/db.py
# PHOENIX PROTOCOL - DB MGMT V5.3 (PYLANCE COMPLIANT)
# 1. REFACTOR: Replaced strict Motor types with 'Any' to resolve Pylance "Variable not allowed" errors.
# 2. STATUS: Linter Clean & Production Ready.

import logging
import pymongo
import redis
from pymongo.errors import ConnectionFailure
from urllib.parse import urlparse
from typing import Generator, Any, Union, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from neo4j import GraphDatabase, Driver
from pymongo.database import Database

from .config import settings

# --- Logger Configuration ---
logger = logging.getLogger(__name__)

# --- Global client variables ---
sync_mongo_client: Optional[pymongo.MongoClient] = None
db_instance: Optional[Database] = None
redis_sync_client: Optional[redis.Redis] = None

# We use Any for Motor types because Pylance treats them as runtime variables
async_mongo_client: Any = None
async_db_instance: Any = None

neo4j_driver: Optional[Driver] = None

# --- Connection Logic ---

def connect_to_mongo() -> Database:
    """Connects to MongoDB (Sync) and returns the database instance."""
    global sync_mongo_client, db_instance
    if db_instance is not None: 
        return db_instance
    
    logger.info("--- [DB] Attempting to connect to Sync MongoDB... ---")
    try:
        client = pymongo.MongoClient(settings.DATABASE_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ismaster')
        
        # Parse DB name safely
        parsed_uri = urlparse(settings.DATABASE_URI)
        db_name = parsed_uri.path.lstrip('/')
        if not db_name: 
            raise ValueError("Database name not found in DATABASE_URI.")
        
        sync_mongo_client = client
        db_instance = client[db_name]
        logger.info(f"--- [DB] Successfully connected to Sync MongoDB: '{db_name}' ---")
        return db_instance
    except (ConnectionFailure, ValueError) as e:
        logger.critical(f"--- [DB] CRITICAL: Could not connect to Sync MongoDB: {e} ---")
        raise

def connect_to_redis() -> redis.Redis:
    """Connects to Redis (Sync) and returns the client instance."""
    global redis_sync_client
    if redis_sync_client is not None: 
        return redis_sync_client

    logger.info("--- [DB] Attempting to connect to Sync Redis... ---")
    try:
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        client.ping()
        redis_sync_client = client
        logger.info("--- [DB] Successfully connected to Sync Redis. ---")
        return redis_sync_client
    except redis.ConnectionError as e:
        logger.critical(f"--- [DB] CRITICAL: Could not connect to Sync Redis: {e} ---")
        raise

async def connect_to_motor() -> Any:
    """Connects to MongoDB (Async Motor) and returns the database instance."""
    global async_mongo_client, async_db_instance
    if async_db_instance is not None: 
        return async_db_instance
    
    logger.info("--- [DB] Attempting to connect to Async MongoDB (Motor)... ---")
    try:
        client = AsyncIOMotorClient(settings.DATABASE_URI, serverSelectionTimeoutMS=5000)
        # Verify connection
        await client.admin.command('ismaster')
        
        parsed_uri = urlparse(settings.DATABASE_URI)
        db_name = parsed_uri.path.lstrip('/')
        if not db_name: 
            raise ValueError("Database name not found in DATABASE_URI.")
        
        async_mongo_client = client
        async_db_instance = client[db_name]
        logger.info(f"--- [DB] Successfully connected to Async MongoDB (Motor): '{db_name}' ---")
        return async_db_instance
    except (ConnectionFailure, ValueError) as e:
        logger.critical(f"--- [DB] CRITICAL: Could not connect to Async MongoDB (Motor): {e} ---")
        raise

def connect_to_neo4j() -> Driver:
    """Connects to Neo4j and returns the driver instance."""
    global neo4j_driver
    if neo4j_driver is not None: 
        return neo4j_driver

    logger.info("--- [DB] Attempting to connect to Neo4j Graph Database... ---")
    try:
        driver = GraphDatabase.driver(
            settings.NEO4J_URI, 
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
        driver.verify_connectivity()
        neo4j_driver = driver
        logger.info("--- [DB] Successfully connected to Neo4j Graph Database. ---")
        return neo4j_driver
    except Exception as e:
        logger.critical(f"--- [DB] CRITICAL: Could not connect to Neo4j: {e} ---")
        raise

# --- Shutdown Logic ---

def close_mongo_connections():
    global sync_mongo_client, async_mongo_client
    if sync_mongo_client: 
        sync_mongo_client.close()
        logger.info("--- [DB] Sync MongoDB connection closed. ---")
    if async_mongo_client: 
        async_mongo_client.close()
        logger.info("--- [DB] Async MongoDB (Motor) connection closed. ---")

def close_redis_connection():
    global redis_sync_client
    if redis_sync_client: 
        redis_sync_client.close()
        logger.info("--- [DB] Sync Redis connection closed. ---")

def close_neo4j_connection():
    global neo4j_driver
    if neo4j_driver: 
        neo4j_driver.close()
        logger.info("--- [DB] Neo4j connection closed. ---")

# --- Dependency Providers ---

def get_db():
    if db_instance is None: 
        raise RuntimeError("Sync DB not connected.")
    yield db_instance

def get_async_db():
    if async_db_instance is None: 
        raise RuntimeError("Async DB not connected.")
    yield async_db_instance

def get_redis_client():
    if redis_sync_client is None: 
        raise RuntimeError("Redis not connected.")
    yield redis_sync_client

def get_neo4j_driver():
    if neo4j_driver is None: 
        raise RuntimeError("Neo4j not connected.")
    yield neo4j_driver