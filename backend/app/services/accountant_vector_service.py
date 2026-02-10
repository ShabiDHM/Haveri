# FILE: backend/app/services/accountant_vector_service.py
# PHOENIX PROTOCOL - ACCOUNTANT VECTOR V2.1 (STRUCTURED DATA INTEGRATION)
# 1. FEATURE: Integrated dynamic querying of MongoDB collections (finance, inventory, partners).
# 2. LOGIC: AI context now includes structured data based on user query keywords.
# 3. ASYNC: Converted to async function using asyncio.to_thread for DB operations.
# 4. STATUS: Forensic AI has comprehensive data access.

from __future__ import annotations
import logging
from typing import List, Dict, Any, cast
from bson import ObjectId
from . import vector_store_service as havery_vs
from . import embedding_service
from app.core import db
import asyncio
from app.services.finance_service import FinanceService # PHOENIX: Import FinanceService
from app.services.inventory_service import InventoryService # PHOENIX: Import InventoryService
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

__all__ = ["store_finance_embeddings", "query_user_financials", "query_tax_and_business_laws", "get_combined_context"]

def store_finance_embeddings(user_id: str, document_id: str, file_name: str, chunks: List[str], metadatas: List[Dict[str, Any]]) -> bool:
    try:
        collection = havery_vs.get_private_collection(user_id)
        embeddings = [embedding_service.generate_embedding(c, language=meta.get('language')) for c, meta in zip(chunks, metadatas)]
        valid_indices = [i for i, emb in enumerate(embeddings) if emb is not None]
        if not valid_indices: return False
        final_embeddings = [embeddings[i] for i in valid_indices]
        final_chunks = [chunks[i] for i in valid_indices]
        final_metadatas = []
        for i in valid_indices:
            meta = metadatas[i].copy()
            meta.update({"owner_id": str(user_id), "source_document_id": str(document_id), "file_name": file_name})
            final_metadatas.append(meta)
        ids = [f"fin_{document_id}_{i}" for i in range(len(final_chunks))]
        collection.add(embeddings=cast(Any, final_embeddings), documents=final_chunks, metadatas=cast(Any, final_metadatas), ids=ids)
        return True
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        return False

def query_user_financials(user_id: str, query_text: str, n_results: int = 30) -> List[Dict[str, Any]]:
    return havery_vs.query_private_diary(user_id, query_text, n_results=n_results)

def query_tax_and_business_laws(query_text: str, n_results: int = 15) -> List[Dict[str, Any]]:
    legal_findings = havery_vs.query_public_library(query_text, n_results=10, agent_type='legal')
    business_findings = havery_vs.query_public_library(query_text, n_results=5, agent_type='business')
    return legal_findings + business_findings

# PHOENIX: Added function to format MongoDB documents into AI-readable strings
def _format_mongo_docs_for_ai(docs: List[Any], title: str) -> str:
    if not docs:
        return f"\n--- {title} (Nuk u gjetën të dhëna) ---\n"
    
    formatted_str = f"\n--- {title} ---\n"
    for i, doc in enumerate(docs):
        formatted_str += f"Elementi {i+1}:\n"
        for k, v in doc.items():
            if k == "_id": continue
            if isinstance(v, datetime): formatted_str += f"  {k}: {v.strftime('%Y-%m-%d %H:%M')}\n"
            elif isinstance(v, list): formatted_str += f"  {k}: {', '.join(str(item) for item in v)}\n"
            else: formatted_str += f"  {k}: {v}\n"
        formatted_str += "---\n"
    return formatted_str

# PHOENIX: get_combined_context is now async and fetches structured data
async def get_combined_context(user_id: str, query: str) -> str:
    # Ensure DB connection
    if db.db_instance is None: db.connect_to_mongo()
    
    # Initialize services (running in thread for sync ops)
    finance_service = FinanceService(db.db_instance)
    inventory_service = InventoryService(db.db_instance)

    # Convert query to lowercase for keyword matching
    query_lower = query.lower()
    
    structured_data_context = ""
    
    # --- PHOENIX: Dynamic Structured Data Retrieval ---
    if any(keyword in query_lower for keyword in ["fatur", "invoice", "klient", "borxh", "klientë"]):
        invoices = await asyncio.to_thread(finance_service.get_invoices, user_id)
        if invoices:
            # Limit number of invoices for context to avoid token limits
            structured_data_context += _format_mongo_docs_for_ai(invoices[:5], "Faturat Aktive")
        partners = await asyncio.to_thread(finance_service.get_partners, user_id)
        if partners:
            structured_data_context += _format_mongo_docs_for_ai(partners[:5], "Klientët dhe Furnitorët")

    if any(keyword in query_lower for keyword in ["shpenzim", "expense", "kosto"]):
        expenses = await asyncio.to_thread(finance_service.get_expenses, user_id)
        if expenses:
            structured_data_context += _format_mongo_docs_for_ai(expenses[:5], "Shpenzimet Aktive")

    if any(keyword in query_lower for keyword in ["stock", "stok", "inventar", "receta", "furnizim", "artikuj"]):
        inventory_items = await asyncio.to_thread(inventory_service.get_items, user_id)
        if inventory_items:
            structured_data_context += _format_mongo_docs_for_ai(inventory_items[:5], "Artikujt e Inventarit")
        recipes = await asyncio.to_thread(inventory_service.get_recipes, user_id)
        if recipes:
            structured_data_context += _format_mongo_docs_for_ai(recipes[:5], "Recetat e Produkteve")
    
    # --- Existing RAG Context Retrieval ---
    private_data_rag = await asyncio.to_thread(query_user_financials, user_id, query)
    global_rules_rag = await asyncio.to_thread(query_tax_and_business_laws, query)
    
    context_str = "--- KONTEKSTI DOKUMENTAR NGA ARKIVA ---\n"
    if not private_data_rag:
        context_str += "Nuk u gjetën dokumente relevante në arkivën tuaj për pyetjen.\n"
    else:
        seen = set()
        for d in private_data_rag:
            if d['content'] not in seen:
                context_str += f"BURIMI_ARKIVË: {d['source']} | PËRMBAJTJA: {d['content']}\n"
                seen.add(d['content'])
    
    context_str += "\n--- BAZA LIGJORE DHE RREGULLORET ---\n"
    if not global_rules_rag:
        context_str += "Nuk u gjetën rregullore relevante për pyetjen.\n"
    else:
        for l in global_rules_rag:
            context_str += f"LIGJI: {l['content']} | BURIMI: {l['source']}\n"
    
    # Combine structured data with RAG context
    full_context = f"{structured_data_context}\n{context_str}"
            
    return full_context