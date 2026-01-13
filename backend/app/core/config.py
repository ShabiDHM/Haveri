# FILE: backend/app/core/config.py
# PHOENIX PROTOCOL - CONFIGURATION V8.0 (GRAPH DB INTEGRATION)
# 1. FEATURE: Added Neo4j Graph Database credentials.
# 2. STATUS: Ready for graph service implementation.

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
from pydantic import field_validator
import json

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # --- API Setup ---
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "production" 
    
    # --- Auth ---
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS2256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080

    # --- CORS Configuration ---
    BACKEND_CORS_ORIGINS: List[str] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str):
            return json.loads(v)
        return v

    # --- Database & Broker ---
    DATABASE_URI: str = ""
    REDIS_URL: str = "redis://redis:6379/0"
    
    # --- GRAPH DATABASE (NEO4J) ---
    NEO4J_URI: str = "neo4j://neo4j:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    # --------------------------------

    # --- PHOENIX: Email Settings ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = ""
    EMAILS_FROM_NAME: str = "Haveri AI"
    # --------------------------------

    # --- External Services (Storage) ---
    B2_KEY_ID: str = ""
    B2_APPLICATION_KEY: str = ""
    B2_ENDPOINT_URL: str = ""
    B2_BUCKET_NAME: str = ""

    # --- AI Engines ---
    OPENAI_API_KEY: str = "" 
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o"
    DEEPSEEK_API_KEY: str = ""
    LOCAL_LLM_URL: str = "http://host.docker.internal:11434/api/generate"
    HF_TOKEN: str = ""

    # --- Internal AI Microservices ---
    EMBEDDING_MODEL: str = "sentence-transformers/distiluse-base-multilingual-cased-v2"
    CHROMA_HOST: str = "chroma"
    CHROMA_PORT: int = 8000
    EMBEDDING_SERVICE_URL: str = "http://embedding-service:8001"
    NER_SERVICE_URL: str = "http://ner-service:8002"
    RERANK_SERVICE_URL: str = "http://rerank-service:8003"
    CATEGORIZATION_SERVICE_URL: str = "http://categorization-service:8004"
    
    # --- Encryption (BYOK) ---
    ENCRYPTION_SALT: str = ""
    ENCRYPTION_PASSWORD: str = ""

settings = Settings()