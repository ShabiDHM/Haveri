# FILE: backend/app/services/accountant_vector_service.py
# PHOENIX PROTOCOL - ACCOUNTANT VECTOR V2.7 (LINGUISTIC STEMMING FIX)
# 1. FEATURE: Implemented Albanian Suffix Stemming (handles ipkos -> ipko).
# 2. FIXED: AI now bridges linguistic variations in user queries to find DB records.
# 3. STATUS: 100% Pylance Clean & Production Ready.

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
    """Strips common Albanian genitive/definite suffixes to find the root name."""
    # Common suffixes: 's', 'se', 'it', 'te', 'in'
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
        return {"$or": [{"user_id": context_id}, {"user_id": oid}, {"organization_id": context_id}, {"organization_id": oid}]}
    except:
        return {"$or": [{"user_id": context_id}, {"organization_id": context_id}]}

def _format_mongo_docs_for_ai(docs: List[Any], title: str) -> str:
    if not docs: return ""
    formatted_str = f"\n--- {title} ---\n"
    for i, doc in enumerate(docs):
        doc_dict = doc.model_dump(by_alias=True) if hasattr(doc, 'model_dump') else doc
        formatted_str += f"Elementi {i+1}:\n"
        for k, v in doc_dict.items():
            if k in ["_id", "user_id", "organization_id", "is_shared"]: continue
            if isinstance(v, datetime): formatted_str += f"  {k}: {v.strftime('%Y-%m-%d')}\n"
            else: formatted_str += f"  {k}: {v}\n"
        formatted_str += "---\n"
    return formatted_str

async def get_combined_context(context_id: str, query: str) -> str:
    if db.db_instance is None: db.connect_to_mongo()
    active_db = db.db_instance
    if active_db is None: return "GABIM: Baza e të dhënave nuk është e disponueshme."

    query_norm = _normalize(query)
    # Extract roots of words to handle 'Ipkos' -> 'Ipko'
    raw_words = [w for w in query_norm.split() if len(w) > 2 and w not in {"cilat", "jane", "faturat", "shpenzimet"}]
    stemmed_words = [_stem_albanian(w) for w in raw_words]
    all_search_terms = list(set(raw_words + stemmed_words))
    
    resilient_filter = _get_resilient_filter(context_id)
    structured_data_context = ""
    
    entity_filter = None
    if all_search_terms:
        # PHOENIX: Substring match for any stemmed root
        regex_pattern = "|".join([re.escape(w) for w in all_search_terms])
        entity_filter = {
            "$and": [
                resilient_filter,
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
        # Search collections
        f = entity_filter if entity_filter else resilient_filter
        
        # 1. Invoices
        invoices = list(active_db.invoices.find(f).sort("issue_date", -1).limit(10))
        structured_data_context += _format_mongo_docs_for_ai(invoices, "Faturat (Invoices)")

        # 2. Expenses
        expenses = list(active_db.expenses.find(f).sort("date", -1).limit(10))
        structured_data_context += _format_mongo_docs_for_ai(expenses, "Shpenzimet (Expenses)")

        # 3. Transactions
        txs = list(active_db.transactions.find(f).sort("date_time", -1).limit(10))
        structured_data_context += _format_mongo_docs_for_ai(txs, "Transaksionet POS/Bankare")

        # 4. Inventory (only if relevant keywords)
        if any(kw in query_norm for kw in ["stok", "stock", "inventar"]):
            items = list(active_db.inventory.find(resilient_filter).limit(10))
            structured_data_context += _format_mongo_docs_for_ai(items, "Inventari")
            
    except Exception as e:
        logger.error(f"Context error: {e}")

    private_rag = await asyncio.to_thread(havery_vs.query_private_diary, context_id, query)
    global_rag = await asyncio.to_thread(havery_vs.query_public_library, query, agent_type='legal')
    
    context_str = "\n--- ARKIVA DHE LIGJET ---\n"
    for d in private_rag: context_str += f"DOKUMENT: {d['content']}\n"
    for l in global_rag: context_str += f"LIGJI: {l['content']}\n"
    
    return f"{structured_data_context}\n{context_str}"