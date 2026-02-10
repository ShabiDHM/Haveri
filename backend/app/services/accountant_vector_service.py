# FILE: backend/app/services/accountant_vector_service.py
# PHOENIX PROTOCOL - ACCOUNTANT VECTOR V2.4 (TYPE NARROWING FIX)
# 1. FIXED: Implemented local variable extraction for db_instance to satisfy Pylance type narrowing.
# 2. STATUS: Resolves "reportOptionalMemberAccess" and ensures context injection integrity.

from __future__ import annotations
import logging
from typing import List, Dict, Any, cast, Optional
from bson import ObjectId
from . import vector_store_service as havery_vs
from . import embedding_service
from app.core import db
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

def _get_resilient_filter(context_id: str) -> Dict:
    """Matches data belonging to either the specific User or the Organization ID."""
    try:
        oid = ObjectId(context_id)
        return {"$or": [{"user_id": context_id}, {"user_id": oid}, {"organization_id": context_id}, {"organization_id": oid}]}
    except:
        return {"$or": [{"user_id": context_id}, {"organization_id": context_id}]}

def _format_mongo_docs_for_ai(docs: List[Any], title: str) -> str:
    if not docs:
        return f"\n--- {title} (Nuk u gjetën të dhëna) ---\n"
    
    formatted_str = f"\n--- {title} ---\n"
    for i, doc in enumerate(docs):
        # Use model_dump if it's a Pydantic model, otherwise assume it's a dict
        doc_dict = doc.model_dump(by_alias=True) if hasattr(doc, 'model_dump') else doc
        formatted_str += f"Elementi {i+1}:\n"
        for k, v in doc_dict.items():
            if k in ["_id", "user_id", "organization_id"]: continue
            if isinstance(v, datetime): 
                formatted_str += f"  {k}: {v.strftime('%Y-%m-%d')}\n"
            else: 
                formatted_str += f"  {k}: {v}\n"
        formatted_str += "---\n"
    return formatted_str

async def get_combined_context(context_id: str, query: str) -> str:
    # Ensure connection
    if db.db_instance is None: 
        db.connect_to_mongo()
    
    # PHOENIX: Local assignment for Type Narrowing
    active_db = db.db_instance
    if active_db is None:
        logger.error("Database instance is None during context retrieval.")
        return "GABIM: Lidhja me bazën e të dhënave dështoi."

    query_lower = query.lower()
    structured_data_context = ""
    
    # --- Live MongoDB Extraction ---
    try:
        # Pylance now knows 'active_db' is not None
        if any(kw in query_lower for kw in ["fatur", "invoice", "klient", "borxh", "shitje"]):
            invoices = list(active_db.invoices.find(_get_resilient_filter(context_id)).sort("issue_date", -1).limit(10))
            if invoices: 
                structured_data_context += _format_mongo_docs_for_ai(invoices, "Faturat e Shitjes")

        if any(kw in query_lower for kw in ["shpenzim", "expense", "blerje", "kosto"]):
            expenses = list(active_db.expenses.find(_get_resilient_filter(context_id)).sort("date", -1).limit(10))
            if expenses: 
                structured_data_context += _format_mongo_docs_for_ai(expenses, "Shpenzimet e Biznesit")

        if any(kw in query_lower for kw in ["stock", "stok", "inventar", "artikull", "receta"]):
            items = list(active_db.inventory.find(_get_resilient_filter(context_id)).limit(10))
            if items: 
                structured_data_context += _format_mongo_docs_for_ai(items, "Gjendja e Inventarit")
    except Exception as e:
        logger.error(f"Structured context injection failed: {e}")

    # --- RAG Extraction (Vector Store) ---
    private_data_rag = await asyncio.to_thread(havery_vs.query_private_diary, context_id, query, n_results=10)
    global_rules_rag = await asyncio.to_thread(havery_vs.query_public_library, query, n_results=10, agent_type='legal')
    
    context_str = "\n--- DOKUMENTE NGA ARKIVA ---\n"
    if private_data_rag:
        for d in private_data_rag: 
            context_str += f"DOKUMENT: {d['content']}\n"
    else:
        context_str += "Nuk u gjetën dokumente relevante.\n"
    
    context_str += "\n--- RREGULLAT E ATK DHE LIGJET ---\n"
    if global_rules_rag:
        for l in global_rules_rag: 
            context_str += f"LIGJI: {l['content']}\n"
    else:
        context_str += "Nuk u gjetën rregullore relevante.\n"
    
    return f"{structured_data_context}\n{context_str}"