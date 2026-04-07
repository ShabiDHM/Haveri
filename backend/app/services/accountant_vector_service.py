# FILE: backend/app/services/accountant_vector_service.py
# PHOENIX PROTOCOL - ACCOUNTANT VECTOR V3.0 (ROBUST LEGAL RETRIEVAL)
# FIX: Multi-query retrieval to ensure both rate and deadline are found.

from __future__ import annotations
import logging
from typing import List, Dict, Any, cast, Optional
from bson import ObjectId
from . import vector_store_service as havery_vs
from . import embedding_service
from app.core import db
import asyncio
import re
from datetime import datetime

logger = logging.getLogger(__name__)

def _normalize(text: str) -> str:
    return re.sub(r'[^\w\s]', '', str(text).lower()).strip()

def _stem_albanian(word: str) -> str:
    suffixes = ['os', 'as', 'es', 'is', 'it', 'te', 'in', 's']
    stemmed = word
    for suffix in suffixes:
        if word.endswith(suffix) and len(word) > len(suffix) + 2:
            stemmed = word[:-len(suffix)]
            break
    return stemmed

def _get_resilient_filter(context_id: str) -> Dict:
    try:
        oid = ObjectId(context_id)
        return {"$or": [
            {"user_id": context_id}, 
            {"user_id": oid}, 
            {"organization_id": context_id}, 
            {"organization_id": oid}
        ]}
    except:
        return {"$or": [
            {"user_id": context_id}, 
            {"organization_id": context_id}
        ]}

def _add_year_filter(base_filter: Dict, year: Optional[int]) -> Dict:
    if not year:
        return base_filter
    start_date = datetime(year, 1, 1)
    end_date = datetime(year + 1, 1, 1)
    date_filter = {
        "$or": [
            {"issue_date": {"$gte": start_date, "$lt": end_date}},
            {"date": {"$gte": start_date, "$lt": end_date}},
            {"date_time": {"$gte": start_date, "$lt": end_date}},
            {"created_at": {"$gte": start_date, "$lt": end_date}}
        ]
    }
    return {"$and": [base_filter, date_filter]}

def _format_mongo_docs_for_ai(docs: List[Any], title: str) -> str:
    if not docs: return ""
    formatted_str = f"\n--- {title} ---\n"
    for i, doc in enumerate(docs):
        doc_dict = doc.model_dump(by_alias=True) if hasattr(doc, 'model_dump') else doc
        formatted_str += f"Elementi {i+1}:\n"
        for k, v in doc_dict.items():
            if k in ["_id", "user_id", "organization_id", "is_shared"]: continue
            if isinstance(v, datetime): 
                formatted_str += f"  {k}: {v.strftime('%Y-%m-%d')}\n"
            else: 
                formatted_str += f"  {k}: {v}\n"
        formatted_str += "---\n"
    return formatted_str

async def get_combined_context(
    context_id: str, 
    query: str, 
    case_id: Optional[str] = None,
    year: Optional[int] = None
) -> str:
    if db.db_instance is None: 
        db.connect_to_mongo()
    active_db = db.db_instance
    if active_db is None: 
        return "GABIM: Baza e të dhënave nuk është e disponueshme."

    query_norm = _normalize(query)
    raw_words = [w for w in query_norm.split() if len(w) > 2 and w not in {"cilat", "jane", "faturat", "shpenzimet"}]
    stemmed_words = [_stem_albanian(w) for w in raw_words]
    all_search_terms = list(set(raw_words + stemmed_words))
    
    resilient_filter = _get_resilient_filter(context_id)
    if case_id:
        resilient_filter["case_id"] = case_id
    base_filter = resilient_filter.copy()
    final_filter = _add_year_filter(base_filter, year) if year else base_filter

    structured_data_context = ""
    entity_filter = None
    if all_search_terms:
        regex_pattern = "|".join([re.escape(w) for w in all_search_terms])
        entity_filter = {
            "$and": [
                final_filter,
                {"$or": [
                    {"description": {"$regex": regex_pattern, "$options": "i"}},
                    {"product_name": {"$regex": regex_pattern, "$options": "i"}},
                    {"client_name": {"$regex": regex_pattern, "$options": "i"}},
                    {"supplier_name": {"$regex": regex_pattern, "$options": "i"}},
                    {"name": {"$regex": regex_pattern, "$options": "i"}}
                ]}
            ]
        }

    try:
        search_filter = entity_filter if entity_filter else final_filter
        invoices = list(active_db.invoices.find(search_filter).sort("issue_date", -1).limit(20))
        structured_data_context += _format_mongo_docs_for_ai(invoices, f"Faturat (Invoices) - Viti: {year if year else 'Të gjithë'}")

        expenses = list(active_db.expenses.find(search_filter).sort("date", -1).limit(20))
        structured_data_context += _format_mongo_docs_for_ai(expenses, f"Shpenzimet (Expenses) - Viti: {year if year else 'Të gjithë'}")

        txs = list(active_db.transactions.find(search_filter).sort("date_time", -1).limit(20))
        structured_data_context += _format_mongo_docs_for_ai(txs, f"Transaksionet POS/Bankare - Viti: {year if year else 'Të gjithë'}")

        if any(kw in query_norm for kw in ["stok", "stock", "inventar", "produkt", "product"]):
            items = list(active_db.inventory.find(resilient_filter).limit(20))
            structured_data_context += _format_mongo_docs_for_ai(items, "Inventari")
    except Exception as e:
        logger.error(f"Context error: {e}")

    year_context = f"\n--- KONTEKSTI I VITIT ---\nViti i zgjedhur për analizë: {year if year else 'Të gjithë vitet'}\n"
    
    private_rag = await asyncio.to_thread(havery_vs.query_private_diary, context_id, query)
    
    # --- PHOENIX FIX: Multi-query legal retrieval ---
    # Use the original query plus targeted queries for key legal concepts.
    global_rag = []
    # 1. Original query
    global_rag += await asyncio.to_thread(havery_vs.query_public_library, query, agent_type='business', n_results=5)
    # 2. If query mentions TVSH, add targeted queries for rate and deadline
    if 'tvsh' in query.lower():
        # Rate query
        rate_results = await asyncio.to_thread(havery_vs.query_public_library, 'norma standarde e TVSH', agent_type='business', n_results=3)
        global_rag += rate_results
        # Deadline query (monthly declaration)
        deadline_results = await asyncio.to_thread(havery_vs.query_public_library, 'afati i deklarimit mujor TVSH', agent_type='business', n_results=3)
        global_rag += deadline_results
        # Also search for '20' (common deadline day)
        day_results = await asyncio.to_thread(havery_vs.query_public_library, 'deri më 20', agent_type='business', n_results=3)
        global_rag += day_results
    
    # Remove duplicates based on content (simple heuristic)
    seen_contents = set()
    unique_global = []
    for doc in global_rag:
        content = doc.get('content', '')
        # Use first 200 chars as key to avoid exact match issues
        key = content[:200]
        if key not in seen_contents:
            seen_contents.add(key)
            unique_global.append(doc)
    global_rag = unique_global[:15]  # Limit to 15 total law chunks
    
    context_str = "\n--- ARKIVA DHE LIGJET ---\n"
    for d in private_rag: 
        context_str += f"DOKUMENT: {d['content']}\n"
    for l in global_rag: 
        context_str += f"LIGJI: {l['content']}\n"
    
    return f"{year_context}{structured_data_context}\n{context_str}"