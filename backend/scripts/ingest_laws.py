#!/usr/bin/env python3
"""
PHOENIX PROTOCOL - INGEST KOSOVO LAWS (USING pdfplumber FOR ROBUST EXTRACTION)
Run: docker compose exec backend python scripts/ingest_laws.py /app/data/laws --force
"""

import os
import sys
import glob
import hashlib
import argparse
import re
import uuid
from typing import List, Tuple

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    import chromadb
    from app.services import embedding_service
    # We'll use pdfplumber directly; fallback to old extract_text if needed
    import pdfplumber
except ImportError as e:
    print(f"❌ Missing libraries: {e}")
    print("Run: pip install pdfplumber langchain-community langchain-text-splitters chromadb pypdf")
    sys.exit(1)

CHROMA_HOST = os.getenv("CHROMA_HOST", "chroma")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", 8000))
COLLECTION_NAME = "business_knowledge_base"

def extract_pdf_text(filepath: str) -> str:
    """Extract text using pdfplumber; fallback to pypdf if needed."""
    full_text = ""
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"
        if full_text.strip():
            return full_text
        else:
            raise ValueError("pdfplumber returned empty text")
    except Exception as e:
        print(f"⚠️ pdfplumber failed: {e}, falling back to pypdf...")
        # Fallback to original extract_text from service
        from app.services.text_extraction_service import extract_text as old_extract
        return old_extract(filepath, "application/pdf")

def clean_text(text: str) -> str:
    text = re.sub(r'(?m)^={5,}\s*Page\s+\d+\s*={5,}\s*$', '', text, flags=re.IGNORECASE)
    patterns = [
        r'(?m)^\s*(?:Faqja|Page|F\.?)\s*\d+\s*(?:/\s*\d+)?\s*$',
        r'(?m)^\s*\d+\s*$',
        r'(?m)^\s*-\s*\d+\s*-\s*$',
        r'(?m)^\s*\[\s*\d+\s*\]\s*$',
    ]
    for pat in patterns:
        text = re.sub(pat, '', text, flags=re.IGNORECASE)
    text = re.sub(r'(?m)^.*GAZETA.*ZYRTARE.*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()

def extract_law_title(text: str, filename: str) -> str:
    sample = text[:5000]
    match = re.search(r'(LIGJI\s+(?:[Nn]r\.?\s*[\d/]+(?:\s*[A-Za-z0-9_-]+)?)\s+[^\n.]+)', sample, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    match = re.search(r'(LIGJI\s+PËR\s+[^\n.]+)', sample, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    name = os.path.splitext(filename)[0]
    name = re.sub(r'[_-]', ' ', name)
    return f"Ligji: {name}"

def split_by_article(text: str) -> List[Tuple[str, str]]:
    """Split text into articles using 'Neni' or 'Art.' markers."""
    lines = text.split('\n')
    article_starts = []
    for i, line in enumerate(lines):
        if re.match(r'^\s*(?:Neni|Art\.?)\s+[\d\.]+', line, re.IGNORECASE):
            article_starts.append(i)
    if not article_starts:
        return [("1", text.strip())]
    articles = []
    for idx, start_idx in enumerate(article_starts):
        line = lines[start_idx]
        match = re.search(r'(?:Neni|Art\.?)\s+([\d\.]+)', line, re.IGNORECASE)
        article_num = match.group(1) if match else "0"
        end_idx = article_starts[idx+1] if idx+1 < len(article_starts) else len(lines)
        content = '\n'.join(lines[start_idx:end_idx]).strip()
        articles.append((article_num, content))
    return articles

def calculate_file_hash(filepath: str) -> str:
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def get_or_create_collection(client, name):
    try:
        client.delete_collection(name)
        print(f"🗑️  Deleted existing collection '{name}'.")
    except:
        pass
    collection = client.create_collection(name=name)
    print(f"✅ Created new collection '{name}'.")
    return collection

def ingest_legal_laws(directory: str, force: bool = False, chunk_size: int = 1000):
    abs_path = os.path.abspath(directory)
    if not os.path.isdir(abs_path):
        print(f"❌ Directory not found: {abs_path}")
        return

    print(f"🔌 Connecting to ChromaDB...")
    client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
    collection = get_or_create_collection(client, COLLECTION_NAME)

    files = glob.glob(os.path.join(abs_path, "**", "*.pdf"), recursive=True)
    files += glob.glob(os.path.join(abs_path, "**", "*.PDF"), recursive=True)
    files = sorted(set(files))
    print(f"📚 Found {len(files)} PDF files.")

    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=int(chunk_size*0.1))
    stats = {"added": 0, "skipped": 0, "failed": 0}

    for file_path in files:
        filename = os.path.basename(file_path)
        print(f"\n--- {filename} ---")
        try:
            file_hash = calculate_file_hash(file_path)
            if not force:
                existing = collection.get(where={"file_hash": file_hash}, limit=1, include=["metadatas"])
                if existing['ids']:
                    print("⏭️  Skipped (unchanged)")
                    stats["skipped"] += 1
                    continue
            collection.delete(where={"source": filename})
            print("📄 Extracting text with pdfplumber...")
            full_text = extract_pdf_text(file_path)
            if not full_text or len(full_text.strip()) < 100:
                print("⚠️  Text too short, skipping.")
                stats["failed"] += 1
                continue
            full_text = clean_text(full_text)
            if not full_text:
                stats["failed"] += 1
                continue
            law_title = extract_law_title(full_text, filename)
            print(f"🏷️  Title: {law_title}")
            articles = split_by_article(full_text)
            print(f"📖 Articles: {len(articles)}")
            batch_ids, batch_texts, batch_metas = [], [], []
            for art_num, art_content in articles:
                chunks = splitter.split_text(art_content)
                for i, chunk in enumerate(chunks):
                    chunk_id = f"{filename}_{file_hash[:8]}_art{art_num}_ch{i}_{uuid.uuid4().hex[:6]}"
                    batch_ids.append(chunk_id)
                    batch_texts.append(chunk)
                    batch_metas.append({
                        "source": filename,
                        "law_title": law_title,
                        "article_number": str(art_num),
                        "type": "LAW",
                        "jurisdiction": "ks",
                        "file_hash": file_hash,
                        "chunk_index": i
                    })
            print("🔄 Generating embeddings...")
            embeddings = []
            for text in batch_texts:
                emb = embedding_service.generate_embedding(text)
                if emb:
                    embeddings.append(emb)
                else:
                    embeddings.append([0.0] * 768)
            for i in range(0, len(batch_ids), 50):
                collection.add(
                    ids=batch_ids[i:i+50],
                    embeddings=embeddings[i:i+50],
                    documents=batch_texts[i:i+50],
                    metadatas=batch_metas[i:i+50]
                )
                print(".", end="", flush=True)
            print(" ✅")
            stats["added"] += 1
        except Exception as e:
            print(f"❌ Error: {e}")
            stats["failed"] += 1

    print("\n" + "="*50)
    print(f"🏁 Ingestion complete. Added: {stats['added']}, Skipped: {stats['skipped']}, Failed: {stats['failed']}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("path", nargs="?", default="/app/data/laws", help="Path to laws folder")
    parser.add_argument("--force", action="store_true", help="Force re-ingest all")
    parser.add_argument("--chunk-size", type=int, default=1000)
    args = parser.parse_args()
    ingest_legal_laws(args.path, force=args.force, chunk_size=args.chunk_size)