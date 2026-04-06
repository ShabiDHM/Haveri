# FILE: backend/app/scripts/index_kosovo_laws.py
# PHOENIX PROTOCOL - INDEX KOSOVO LAW PDFs INTO CHROMADB

import os
import sys
import logging
from typing import List, Dict, Any
from pypdf import PdfReader

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import vector_store_service as vs
from app.services import embedding_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LAWS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "laws", "ks")
CHUNK_SIZE = 1000  # characters
OVERLAP = 200

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        logger.error(f"Failed to extract text from {pdf_path}: {e}")
        return ""

def chunk_text(text: str, source_file: str) -> List[Dict[str, Any]]:
    """Split text into overlapping chunks with metadata."""
    chunks = []
    # Clean text
    text = text.replace('\x00', '')  # remove null bytes
    text = ' '.join(text.split())     # normalize whitespace
    
    for i in range(0, len(text), CHUNK_SIZE - OVERLAP):
        chunk = text[i:i+CHUNK_SIZE]
        if len(chunk.strip()) > 100:
            chunks.append({
                "content": chunk,
                "metadata": {
                    "source": source_file,
                    "law_name": os.path.basename(source_file).replace('.pdf', ''),
                    "chunk_index": len(chunks)
                }
            })
    return chunks

def clear_existing_legal_collection():
    """Delete all existing legal documents from ChromaDB to avoid duplicates."""
    try:
        collection = vs.get_legal_kb_collection()
        # Get all IDs
        result = collection.get()
        ids = result['ids']
        if ids:
            collection.delete(ids=ids)
            logger.info(f"Deleted {len(ids)} existing legal documents.")
        else:
            logger.info("No existing legal documents found.")
    except Exception as e:
        logger.warning(f"Could not clear collection: {e}")

def index_laws():
    """Main indexing function."""
    if not os.path.exists(LAWS_DIR):
        logger.error(f"Laws directory not found: {LAWS_DIR}")
        return
    
    pdf_files = [f for f in os.listdir(LAWS_DIR) if f.lower().endswith('.pdf')]
    if not pdf_files:
        logger.warning("No PDF files found.")
        return
    
    logger.info(f"Found {len(pdf_files)} PDF files. Clearing existing legal collection...")
    clear_existing_legal_collection()
    
    collection = vs.get_legal_kb_collection()
    all_chunks = []
    
    for filename in pdf_files:
        filepath = os.path.join(LAWS_DIR, filename)
        logger.info(f"Processing: {filename}")
        raw_text = extract_text_from_pdf(filepath)
        if not raw_text:
            logger.warning(f"  No text extracted from {filename}")
            continue
        
        chunks = chunk_text(raw_text, filename)
        logger.info(f"  Created {len(chunks)} chunks")
        all_chunks.extend(chunks)
    
    # Batch add to ChromaDB
    if all_chunks:
        ids = [f"law_{i}_{int(time.time())}" for i in range(len(all_chunks))]
        embeddings = []
        documents = []
        metadatas = []
        
        for chunk in all_chunks:
            emb = embedding_service.generate_embedding(chunk["content"])
            if emb:
                embeddings.append(emb)
                documents.append(chunk["content"])
                metadatas.append(chunk["metadata"])
        
        if embeddings:
            try:
                collection.add(
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids[:len(embeddings)]
                )
                logger.info(f"✅ Successfully indexed {len(embeddings)} chunks from {len(pdf_files)} laws.")
            except Exception as e:
                logger.error(f"Failed to add to ChromaDB: {e}")
        else:
            logger.error("No embeddings generated.")
    else:
        logger.warning("No chunks created.")

if __name__ == "__main__":
    import time
    index_laws()