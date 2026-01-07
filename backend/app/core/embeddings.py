# FILE: backend/app/core/embeddings.py
# PHOENIX PROTOCOL - EMBEDDING CLIENT V2.0 (RENAMED)
# 1. REFACTOR: Renamed 'JuristiRemoteEmbeddings' to 'HaveriEmbeddingFunction'.
# 2. ALIGNMENT: Ensures the class name matches the 'Haveri' application architecture.
# 3. CONSISTENCY: Continues to use the robust, centralized embedding_service.

import logging
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
from app.services import embedding_service

logger = logging.getLogger(__name__)

class HaveriEmbeddingFunction(EmbeddingFunction):
    """
    The canonical ChromaDB embedding function for the Haveri AI backend.
    
    This class conforms to the chromadb.EmbeddingFunction interface and uses the
    robust, centralized `embedding_service.generate_embedding` function to
    communicate with the dedicated ai-core-service.
    """
    def __call__(self, input: Documents) -> Embeddings:
        vectors = []
        for text in input:
            try:
                # Use the canonical, retry-enabled service function
                embedding = embedding_service.generate_embedding(text=text)
                if embedding:
                    vectors.append(embedding)
                else:
                    # Service function already logged the error, append a zero vector
                    # to maintain batch integrity. The dimension should match your model.
                    # Assuming a standard 768-dimensional model.
                    vectors.append([0.0] * 768) 
            except Exception as e:
                logger.error(f"❌ Unhandled error during embedding generation via service: {e}")
                vectors.append([0.0] * 768)
        return vectors