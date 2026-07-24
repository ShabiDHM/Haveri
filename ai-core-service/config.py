# FILE: ai-core-service/config.py
# PHOENIX PROTOCOL - AI CORE CONFIG V11.0 (8GB RAM OPTIMIZED)
# 1. FIX: Dynamic .env pathing for flat directory structure.

import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# The .env file sits in the same folder as this config.py
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(CURRENT_DIR, ".env")

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding='utf-8',
        case_sensitive=True,
        extra='ignore'
    )

    PROJECT_NAME: str = "Juristi AI Core"
    API_V1_STR: str = "/api/v1"
    GROQ_API_KEY: str = ""
    
    # Models optimized for 8GB RAM
    EMBEDDING_MODEL_NAME: str = "paraphrase-multilingual-MiniLM-L12-v2"
    RERANK_MODEL_NAME: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    NER_MODEL_NAME: str = "xx_ent_wiki_sm"
    CATEGORIZATION_MODEL_NAME: str = "facebook/bart-large-mnli"
    
    USE_LOCAL_EMBEDDINGS: bool = True
    USE_LOCAL_LLM: bool = False

settings = Settings()