# FILE: backend/app/services/llm_service.py
# PHOENIX PROTOCOL - LLM SERVICE V6.0 (HYDRA TACTIC ENABLED)
# 1. ARCHITECTURE: Switched to AsyncOpenAI for non-blocking I/O.
# 2. HYDRA: Added 'process_chunks_parallel' using asyncio.gather.
# 3. UTILITY: Added 'chunk_text' for safe Map-Reduce handling.

import os
import json
import logging
import re
import asyncio
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI 

from .text_sterilization_service import sterilize_text_for_llm
from . import vector_store_service

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "deepseek/deepseek-chat"

_async_client: Optional[AsyncOpenAI] = None

# --- AGENT CONSTITUTIONS ---
BUSINESS_CONSULTANT_RULES = """
RREGULLAT E KËSHILLIMIT (PRAKTIKA MË E MIRË):
1. ROLI: Ti je Këshilltar Biznesi për NVM-të në Kosovë.
2. BURIMET:
   - "TË DHËNAT E PËRDORUESIT": Janë faktet absolute.
   - "LIGJET DHE RREGULLORET": Përdori për validim.
3. STIILI: Profesional, i qartë, në gjuhën Shqipe.
"""

def get_async_client() -> Optional[AsyncOpenAI]:
    """
    Singleton provider for the Asynchronous OpenAI Client.
    """
    global _async_client
    if _async_client: return _async_client
    
    # Try OpenRouter/DeepSeek first
    api_key = DEEPSEEK_API_KEY or os.getenv("OPENAI_API_KEY")
    base_url = OPENROUTER_BASE_URL if DEEPSEEK_API_KEY else os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    
    if api_key:
        try: 
            _async_client = AsyncOpenAI(api_key=api_key, base_url=base_url)
            return _async_client
        except Exception as e: 
            logger.error(f"Async AI Client Init Failed: {e}")
    return None

def _parse_json_safely(content: str) -> Dict[str, Any]:
    try: return json.loads(content)
    except json.JSONDecodeError:
        # Fallback: Try to find JSON block in markdown
        match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
        if match:
            try: return json.loads(match.group(1))
            except: pass
        return {}

def chunk_text(text: str, chunk_size: int = 4000) -> List[str]:
    """
    Splits text into manageable chunks to avoid Context Window limits.
    Roughly 4000 characters ~ 1000 tokens.
    """
    if not text:
        return []
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

async def _call_deepseek_async(system_prompt: str, user_prompt: str, json_mode: bool = False) -> Optional[str]:
    """
    Internal Async Wrapper for LLM calls.
    """
    client = get_async_client()
    if not client: 
        logger.warning("AI Service not configured (Missing API Key)")
        return None
        
    try:
        full_system_prompt = f"{system_prompt}\n\n{BUSINESS_CONSULTANT_RULES}"
        model = os.getenv("OPENAI_MODEL", OPENROUTER_MODEL)
        
        kwargs = {
            "model": model, 
            "messages": [{"role": "system", "content": full_system_prompt}, {"role": "user", "content": user_prompt}], 
            "temperature": 0.1
        }
        if json_mode: kwargs["response_format"] = {"type": "json_object"}
        
        # Non-blocking await
        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"⚠️ Async AI Call Failed: {e}")
        return None

# --- HYDRA TACTIC IMPLEMENTATION ---

async def process_chunks_parallel(text: str, system_prompt: str, chunk_size: int = 6000) -> List[str]:
    """
    THE HYDRA: Splits text and processes all chunks simultaneously using asyncio.gather.
    Returns a list of results for the 'Reduce' phase.
    """
    chunks = chunk_text(text, chunk_size)
    if not chunks:
        return []

    logger.info(f"Hydra Activated: Processing {len(chunks)} chunks in parallel.")
    
    # Create a list of coroutine objects (tasks)
    tasks = [
        _call_deepseek_async(system_prompt, f"PARTIAL CONTENT SEGMENT:\n{chunk}") 
        for chunk in chunks
    ]
    
    # Execute all simultaneously
    results = await asyncio.gather(*tasks)
    
    # Filter out None results from failed calls
    valid_results = [res for res in results if res]
    return valid_results

# --- PUBLIC ASYNC FUNCTIONS ---

async def chat_completion(system_prompt: str, user_message: str) -> str:
    result = await _call_deepseek_async(system_prompt, user_message)
    return result or "Nuk u gjenerua përgjigje."

async def analyze_structured_prediction(data_context: str, analysis_type: str) -> Dict[str, Any]:
    """
    Async version of prediction analysis.
    """
    if analysis_type == "RESTOCK":
        system_prompt = """
        You are an Inventory Analyst AI.
        Task: Analyze the provided item data (Stock, Sales Rate).
        Output JSON: { "suggested_quantity": number, "reason": "Short Albanian explanation", "estimated_cost": number }
        """
    else: # TREND
        system_prompt = """
        You are a Sales Analyst AI.
        Task: Analyze the provided sales history.
        Output JSON: { "trend_analysis": "1 sentence summary in Albanian", "cross_sell_opportunities": "1 suggestion in Albanian or 'N/A'" }
        """
        
    content = await _call_deepseek_async(system_prompt, f"DATA CONTEXT:\n{data_context}", json_mode=True)
    return _parse_json_safely(content) if content else {}

async def ask_business_consultant(user_id: str, query: str) -> str:
    # Note: vector_store_service might be sync. If so, wrap it in to_thread if it blocks heavily.
    # For now, we assume it's fast enough or allows sync execution.
    try:
        user_docs = await asyncio.to_thread(vector_store_service.query_private_diary, user_id, query, n_results=4)
        user_context = "\n".join([f"- {d['content']}" for d in user_docs])
        
        response = await _call_deepseek_async(
            "Je Këshilltar Biznesi. Përgjigju shkurt në Shqip.",
            f"PYETJA: {query}\nKONTEKSTI:\n{user_context}"
        )
        return response or "Sistemi i ngarkuar."
    except Exception as e:
        logger.error(f"Consultant Error: {e}")
        return "Gabim teknik."

async def extract_expense_data(text: str) -> Dict[str, Any]:
    clean = sterilize_text_for_llm(text[:3000], redact_names=False)
    sys = "Extract JSON: {category, total_amount, date(YYYY-MM-DD), supplier_name, description}"
    res = await _call_deepseek_async(sys, clean, json_mode=True)
    return _parse_json_safely(res) if res else {}

async def draft_business_document(system_prompt: str, full_prompt: str) -> Optional[str]:
    return await _call_deepseek_async(system_prompt, full_prompt)