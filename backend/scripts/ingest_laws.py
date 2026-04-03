# FILE: backend/scripts/ingest_business_laws.py
# PHOENIX PROTOCOL - ENHANCED BUSINESS LAWS INGESTION V1.0
# Ingests Kosovo business laws into ChromaDB's business_knowledge_base.

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
    from app.core.embeddings import HaveriEmbeddingFunction
    from app.services.text_extraction_service import extract_text
except ImportError as e:
    print(f"❌ MISSING LIBRARIES: {e}")
    print("Run: pip install langchain-community langchain-text-splitters chromadb pypdf")
    sys.exit(1)

# --- CONFIGURATION ---
CHROMA_HOST = os.getenv("CHROMA_HOST", "chroma")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", 8000))
COLLECTION_NAME = "business_knowledge_base"  # Matches the business app's public collection
TARGET_JURISDICTION = 'ks'

print(f"⚙️  CONFIG: Chroma={CHROMA_HOST}:{CHROMA_PORT}, Collection={COLLECTION_NAME}")

# ----------------------------------------------------------------------
# NORMALIZATION FUNCTIONS (mirroring legal app)
# ----------------------------------------------------------------------

def clean_text(text: str) -> str:
    """Remove common PDF artifacts and page numbers."""
    text = re.sub(r'(?m)^={5,}\s*Page\s+\d+\s*={5,}\s*$', '', text, flags=re.IGNORECASE)
    page_patterns = [
        r'(?m)^\s*(?:Faqja|Page|F\.?)\s*\d+\s*(?:/\s*\d+)?\s*$',
        r'(?m)^\s*\d+\s*$',
        r'(?m)^\s*-\s*\d+\s*-\s*$',
        r'(?m)^\s*\[\s*\d+\s*\]\s*$',
    ]
    for pat in page_patterns:
        text = re.sub(pat, '', text, flags=re.IGNORECASE)
    text = re.sub(r'(?m)^.*GAZETA.*ZYRTARE.*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'(?m)^\s*[A-Z\s]*PRISHTIN[ËE]?\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'(?m)^[^\w\s]{10,}$', '', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()

def extract_law_title(text: str, filename: str) -> str:
    """Extract full law title including number (adapted for business laws)."""
    sample = text[:5000]

    # Pattern 1: LIGJI with number
    match = re.search(
        r'(LIGJI\s+(?:[Nn]r\.?\s*[\d/]+(?:/[A-Z]-[\d]+)?)\s+[^\n.]+)',
        sample,
        re.IGNORECASE
    )
    if match:
        return match.group(1).strip()

    # Pattern 2: LIGJI PËR ...
    match = re.search(r'(LIGJI\s+PËR\s+[^\n.]+)', sample, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Pattern 3: KODI ...
    match = re.search(r'(KODI\s+(?:[Nn]r\.?\s*[\d/]+)?\s*[^\n.]+)', sample, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Pattern 4: Any all‑caps line containing "LIGJ" or "KOD"
    lines = sample.split('\n')
    for line in lines[:30]:
        if line.isupper() and ('LIGJ' in line or 'KOD' in line):
            return line.strip()

    # Fallback: clean filename
    name = os.path.splitext(filename)[0]
    name = re.sub(r'[_-]', ' ', name)
    name = ' '.join(name.split())
    return f"Ligji: {name}"

def split_by_article(text: str) -> List[Tuple[str, str]]:
    """Split into articles based on 'Neni' or 'Art.' markers."""
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
        end_idx = article_starts[idx + 1] if idx + 1 < len(article_starts) else len(lines)
        content = '\n'.join(lines[start_idx:end_idx]).strip()
        articles.append((article_num, content))
    return articles

def calculate_file_hash(filepath: str) -> str:
    hasher = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        print(f"⚠️ Could not hash file {filepath}: {e}")
        return ""

def infer_category(filename: str, text_sample: str) -> str:
    """Infer business law category from filename or content."""
    lower = filename.lower()
    sample_lower = text_sample.lower()
    if any(k in lower or k in sample_lower for k in ['tregtar', 'komercial', 'shoqëri']):
        return "commercial"
    if any(k in lower or k in sample_lower for k in ['punës', 'pune', 'employment']):
        return "labor"
    if any(k in lower or k in sample_lower for k in ['tatim', 'taksa', 'tax']):
        return "tax"
    if any(k in lower or k in sample_lower for k in ['kontab', 'financiar', 'account']):
        return "accounting"
    return "general_business"

# ----------------------------------------------------------------------
# MAIN INGESTION FUNCTION
# ----------------------------------------------------------------------

def ingest_business_laws(directory_path: str, force_reingest: bool = False, chunk_size: int = 1000):
    abs_path = os.path.abspath(directory_path)
    print(f"📂 Scanning Directory: {abs_path}")

    if not os.path.isdir(directory_path):
        print(f"❌ Directory not found: {directory_path}")
        return

    print(f"🔌 Connecting to ChromaDB...")
    try:
        client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=HaveriEmbeddingFunction()
        )
        print(f"✅ Connected to '{COLLECTION_NAME}' collection.")
    except Exception as e:
        print(f"❌ DB Connection Failed: {e}")
        return

    supported_extensions = ['*.pdf', '*.PDF']
    all_files = []
    for ext in supported_extensions:
        found = glob.glob(os.path.join(directory_path, "**", ext), recursive=True)
        all_files.extend(found)

    all_files = sorted(set(all_files))

    if not all_files:
        print(f"⚠️ No PDF files found in {directory_path}")
        return

    print(f"📚 Found {len(all_files)} files. Starting processing...")

    stats = {"skipped": 0, "added": 0, "updated": 0, "failed": 0}
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=int(chunk_size*0.1))

    for file_path in all_files:
        filename = os.path.basename(file_path)
        print(f"\n--- Processing: {filename} ---")

        try:
            current_hash = calculate_file_hash(file_path)

            # Check existing
            if not force_reingest:
                existing = collection.get(where={"source": filename}, limit=1, include=["metadatas"])
                if existing['ids'] and existing['metadatas'] and existing['metadatas'][0].get("file_hash") == current_hash:
                    print(f"⏭️  Skipped (unchanged)")
                    stats["skipped"] += 1
                    continue

            # Delete old vectors
            collection.delete(where={"source": filename})
            print(f"🗑️  Deleted old vectors")

            # Extract text using the service (with OCR fallback)
            print("📄 Extracting text...")
            full_text = extract_text(file_path, "application/pdf")
            if not full_text or len(full_text.strip()) < 50:
                print("⚠️  Extracted text too short, may be scanned or empty.")
                stats["failed"] += 1
                continue

            full_text = clean_text(full_text)
            if not full_text:
                print("⚠️  Text became empty after cleaning.")
                stats["failed"] += 1
                continue

            # Extract law title and category
            law_title = extract_law_title(full_text, filename)
            category = infer_category(filename, full_text[:2000])
            print(f"🏷️  Law title: {law_title} [{category}]")

            # Split into articles
            articles = split_by_article(full_text)
            print(f"📖 Detected {len(articles)} article(s)")

            # Prepare chunks
            batch_ids = []
            batch_texts = []
            batch_metadatas = []
            article_counter = 0

            for article_num, article_content in articles:
                article_counter += 1
                chunks = text_splitter.split_text(article_content)
                for i, chunk in enumerate(chunks):
                    chunk_id = f"{filename}_{current_hash[:8]}_art{article_num}_ch{i}_{uuid.uuid4().hex[:6]}"
                    batch_ids.append(chunk_id)
                    batch_texts.append(chunk)
                    meta = {
                        "source": filename,
                        "law_title": law_title,
                        "article_number": str(article_num),
                        "type": "BUSINESS_LAW",
                        "jurisdiction": TARGET_JURISDICTION,
                        "category": category,
                        "file_hash": current_hash,
                        "chunk_index": i,
                        "total_article_chunks": len(chunks)
                    }
                    # Ensure all values are JSON serializable
                    meta = {k: (v if v is not None else "") for k, v in meta.items()}
                    batch_metadatas.append(meta)

            # Add to ChromaDB in batches
            BATCH_SIZE = 50
            for i in range(0, len(batch_ids), BATCH_SIZE):
                collection.add(
                    ids=batch_ids[i:i+BATCH_SIZE],
                    documents=batch_texts[i:i+BATCH_SIZE],
                    metadatas=batch_metadatas[i:i+BATCH_SIZE]
                )
                print(".", end="", flush=True)
            print(" ✅")
            stats["added"] += 1

        except Exception as e:
            print(f"❌ Error: {e}")
            stats["failed"] += 1

    print("\n" + "-"*50)
    print(f"🏁 Business Laws Ingestion Complete.")
    print(f"   Added:   {stats['added']}")
    print(f"   Updated: {stats['updated']}")
    print(f"   Skipped: {stats['skipped']}")
    print(f"   Failed:  {stats['failed']}")
    print("-"*50)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest business laws into ChromaDB (business_knowledge_base).")
    parser.add_argument("path", nargs="?", default="/app/data/business_laws/ks", help="Path to business laws folder")
    parser.add_argument("--force", action="store_true", help="Force re‑ingest all documents")
    parser.add_argument("--chunk-size", type=int, default=1000, help="Chunk size in characters")
    args = parser.parse_args()
    ingest_business_laws(args.path, force_reingest=args.force, chunk_size=args.chunk_size)