# FILE: backend/app/services/accountant_vector_service.py
# PHOENIX PROTOCOL - ACCOUNTANT VECTOR V2.9 (YEAR FILTERING + GROUNDING)

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
    """Adds year filtering to the MongoDB query."""
    if not year:
        return base_filter
    
    start_date = datetime(year, 1, 1)
    end_date = datetime(year + 1, 1, 1)
    
    # Create date filter that checks multiple possible date fields
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
    """
    Retrieves combined context for the forensic accountant.
    Includes year filtering to ensure data relevance.
    """
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
    
    # Add case_id filter if provided
    if case_id:
        resilient_filter["case_id"] = case_id
    
    # Add year filter
    base_filter = resilient_filter.copy()
    final_filter = _add_year_filter(base_filter, year) if year else base_filter

    structured_data_context = ""
    
    # Build search filter for text search
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
        
        # 1. Invoices - limit 20 for better coverage
        invoices = list(active_db.invoices.find(search_filter).sort("issue_date", -1).limit(20))
        structured_data_context += _format_mongo_docs_for_ai(invoices, f"Faturat (Invoices) - Viti: {year if year else 'Të gjithë'}")

        # 2. Expenses
        expenses = list(active_db.expenses.find(search_filter).sort("date", -1).limit(20))
        structured_data_context += _format_mongo_docs_for_ai(expenses, f"Shpenzimet (Expenses) - Viti: {year if year else 'Të gjithë'}")

        # 3. POS Transactions
        txs = list(active_db.transactions.find(search_filter).sort("date_time", -1).limit(20))
        structured_data_context += _format_mongo_docs_for_ai(txs, f"Transaksionet POS/Bankare - Viti: {year if year else 'Të gjithë'}")

        # 4. Inventory (only if relevant keywords)
        if any(kw in query_norm for kw in ["stok", "stock", "inventar", "produkt", "product"]):
            items = list(active_db.inventory.find(resilient_filter).limit(20))
            structured_data_context += _format_mongo_docs_for_ai(items, "Inventari")
            
    except Exception as e:
        logger.error(f"Context error: {e}")

    # Add year context to the prompt
    year_context = f"\n--- KONTEKSTI I VITIT ---\nViti i zgjedhur për analizë: {year if year else 'Të gjithë vitet'}\n"
    
    # Vector search for RAG
    private_rag = await asyncio.to_thread(havery_vs.query_private_diary, context_id, query)
    global_rag = await asyncio.to_thread(havery_vs.query_public_library, query, agent_type='legal')
    
    context_str = "\n--- ARKIVA DHE LIGJET ---\n"
    for d in private_rag: 
        context_str += f"DOKUMENT: {d['content']}\n"
    for l in global_rag: 
        context_str += f"LIGJI: {l['content']}\n"
    
    return f"{year_context}{structured_data_context}\n{context_str}"