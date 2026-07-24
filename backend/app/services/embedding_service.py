# FILE: backend/app/services/embedding_service.py
# PHOENIX PROTOCOL - EMBEDDING CLIENT V5.0 (CLOUD REDIRECT)
# 1. OPTIMIZATION: Bypasses heavy local AI container completely to stay under 512MB RAM on Render.
# 2. MECHANISM: Directly routes to OpenAI/OpenRouter Cloud Embeddings (text-embedding-3-small).
# 3. STATUS: Clean, Production Ready.

import logging
import httpx
import time
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# Persistent client for high-performance parallel connections
GLOBAL_SYNC_HTTP_CLIENT = httpx.Client(
    timeout=30.0, 
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=50)
)

def generate_embedding(text: str, language: Optional[str] = None) -> List[float]:
    """
    Generates a vector embedding by calling OpenAI/OpenRouter Cloud APIs.
    Bypasses local models completely to maintain a <512MB RAM footprint.
    """
    if not text or not text.strip():
        logger.warning("[Embedding] Empty text provided. Skipping.")
        return []

    if not settings.OPENAI_API_KEY:
        logger.error("[Embedding] ❌ OPENAI_API_KEY is not configured in environment settings.")
        return []

    # Clean base URL formatting
    base_url = settings.OPENAI_BASE_URL.rstrip('/')
    endpoint = f"{base_url}/embeddings"
    
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }

    # Default to text-embedding-3-small (1536 dimensions) if not set to another text-embedding model
    model_name = settings.EMBEDDING_MODEL if "text-embedding" in settings.EMBEDDING_MODEL else "text-embedding-3-small"
    
    payload = {
        "input": text,
        "model": model_name
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = GLOBAL_SYNC_HTTP_CLIENT.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            
            if "data" not in data or not isinstance(data["data"], list) or len(data["data"]) == 0:
                raise ValueError("Invalid response format from cloud embeddings endpoint")
                
            embedding = data["data"][0]["embedding"]
            return embedding
            
        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            logger.warning(f"⚠️ [Embedding] Cloud Attempt {attempt+1}/{max_retries} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                logger.error(f"❌ [Embedding] Cloud critical failure for text of length {len(text)}")
                
        except Exception as e:
            logger.error(f"❌ [Embedding] Unexpected error: {e}")
            break
            
    # Return zero vectors on critical failure to maintain application runtime integrity
    dim = 1536 if "text-embedding-3" in model_name else 768
    return [0.0] * dim