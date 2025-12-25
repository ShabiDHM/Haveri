# FILE: ai-core-service/app/services/embedding_manager.py
# PHOENIX PROTOCOL - EMBEDDING MANAGER V2.1 (OFFLINE-FIRST FIX)
# 1. UPDATE: 'load_model' now loads from a hardcoded, absolute path.
# 2. REASON: Bypasses a bug in the SentenceTransformer library's network check that causes it to freeze on this specific server environment.
# 3. STATUS: This ensures the model loads instantly from the pre-downloaded files.

import logging
from typing import Optional, Any
from sentence_transformers import SentenceTransformer
from config import settings
from langdetect import detect, LangDetectException

logger = logging.getLogger(__name__)

# PHOENIX FIX: Define the absolute, offline path to the model files.
# This hash corresponds to the folder we manually created and copied files into.
OFFLINE_EMBEDDING_MODEL_PATH = "/root/.cache/huggingface/hub/models--sentence-transformers--paraphrase-multilingual-mpnet-base-v2/snapshots/4328cf26390c98c5e3c738b4460a05b95f4911f5"

class EmbeddingManager:
    _instance = None
    model: Optional[SentenceTransformer] = None
    model_name: str = ""

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingManager, cls).__new__(cls)
            cls._instance.model = None
            # We still keep the original name for logging/metadata purposes.
            cls._instance.model_name = settings.EMBEDDING_MODEL_NAME
        return cls._instance

    def load_model(self):
        """Loads the embedding model into memory from a guaranteed offline path."""
        if self.model is None:
            logger.info(f"📥 Loading Embedding Model from OFFLINE path: {self.model_name}...")
            try:
                # PHOENIX FIX: Use the absolute path instead of the online model name.
                self.model = SentenceTransformer(OFFLINE_EMBEDDING_MODEL_PATH)
                logger.info("✅ Embedding Model loaded successfully.")
            except Exception as e:
                logger.error(f"❌ Failed to load embedding model from offline path: {e}")
                raise e

    def generate_embedding(self, text: str, language: Optional[str] = "standard"):
        """Generates embedding for the given text, logging the language context."""
        # 1. Ensure model is loaded
        if self.model is None:
            self.load_model()
        
        # 2. Safety Check
        if self.model is None:
            raise RuntimeError("Embedding model failed to initialize.")

        try:
            # PHOENIX: We log the language for auditing, even if the model is auto-multilingual
            # In future upgrades, we can switch model branches based on this 'language' param.
            # logger.debug(f"Generating embedding for language: {language}")
            
            embedding = self.model.encode(text).tolist()
            return embedding
        except Exception as e:
            logger.error(f"Error during embedding generation: {e}")
            raise e

    def _detect_language(self, text: str) -> str:
        try:
            return detect(text)
        except LangDetectException:
            return "unknown"

# Global instance exported for use in routers
embedding_manager = EmbeddingManager()