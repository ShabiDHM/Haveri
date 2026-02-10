# FILE: backend/app/services/llm_service.py
# PHOENIX PROTOCOL - LLM SERVICE V6.3 (STRICT STRUCTURE)
# 1. IMPROVED: Hardened prompts for RESTOCK and TREND analysis.
# 2. FEATURE: Enforces strictly numeric JSON output to prevent backend parsing crashes.
# 3. STATUS: Resolves "Gabim në analizë" by ensuring clean, valid Albanian AI responses.

import os
import json
import logging
import re
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
from openai import AsyncOpenAI 

from .text_sterilization_service import sterilize_text_for_llm
from . import vector_store_service

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "deepseek/deepseek-chat"

_async_client: Optional[AsyncOpenAI] = None
_api_semaphore: Optional[asyncio.Semaphore] = None 

# --- AGENT CONSTITUTIONS ---
BUSINESS_CONSULTANT_RULES = """
RREGULLAT E KËSHILLIMIT (PRAKTIKA MË E MIRË):
1. ROLI: Ti je Këshilltar Biznesi për NVM-të në Kosovë.
2. BURIMET: "TË DHËNAT E PËRDORUESIT" janë faktet absolute.
3. STIILI: Profesional, i qartë, në gjuhën Shqipe.
"""

def get_async_client() -> Optional[AsyncOpenAI]:
    global _async_client
    if _async_client: return _async_client
    api_key = DEEPSEEK_API_KEY or os.getenv("OPENAI_API_KEY")
    base_url = OPENROUTER_BASE_URL if DEEPSEEK_API_KEY else os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    if api_key:
        try: 
            _async_client = AsyncOpenAI(api_key=api_key, base_url=base_url)
            return _async_client
        except Exception as e: logger.error(f"Async AI Client Init Failed: {e}")
    return None

def get_semaphore() -> asyncio.Semaphore:
    global _api_semaphore
    if _api_semaphore is None: _api_semaphore = asyncio.Semaphore(10)
    return _api_semaphore

def _parse_json_safely(content: str) -> Dict[str, Any]:
    try: return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            try: return json.loads(match.group(0))
            except: pass
        return {}

async def _call_deepseek_async(system_prompt: str, user_prompt: str, json_mode: bool = False) -> Optional[str]:
    client = get_async_client()
    sem = get_semaphore()
    if not client: return None
    async with sem:
        try:
            full_system_prompt = f"{system_prompt}\n\n{BUSINESS_CONSULTANT_RULES}"
            kwargs = {
                "model": os.getenv("OPENAI_MODEL", OPENROUTER_MODEL),
                "messages": [{"role": "system", "content": full_system_prompt}, {"role": "user", "content": user_prompt}],
                "temperature": 0.1
            }
            if json_mode: kwargs["response_format"] = {"type": "json_object"}
            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"⚠️ Async AI Call Failed: {e}")
            return None

# --- PUBLIC FUNCTIONS ---

async def analyze_structured_prediction(data_context: str, analysis_type: str) -> Dict[str, Any]:
    if analysis_type == "RESTOCK":
        system_prompt = """
        You are a Supply Chain Expert. Analyze inventory and sales data.
        OUTPUT ONLY VALID JSON in Albanian:
        {
          "suggested_quantity": number (raw number only),
          "reason": "short explanation in Albanian",
          "estimated_cost": number (raw number only)
        }
        """
    else:
        system_prompt = """
        You are a Retail Sales Analyst. Analyze sales trends.
        OUTPUT ONLY VALID JSON in Albanian:
        {
          "trend_analysis": "Albanian summary of sales velocity",
          "cross_sell_opportunities": "Albanian suggestions for bundles"
        }
        """
        
    content = await _call_deepseek_async(system_prompt, f"DATA CONTEXT:\n{data_context}", json_mode=True)
    return _parse_json_safely(content) if content else {}

async def ask_business_consultant(user_id: str, query: str) -> str:
    try:
        user_docs = await asyncio.to_thread(vector_store_service.query_private_diary, user_id, query, n_results=4)
        user_context = "\n".join([f"- {d['content']}" for d in user_docs])
        response = await _call_deepseek_async("Je Këshilltar Biznesi. Përgjigju shkurt në Shqip.", f"PYETJA: {query}\nKONTEKSTI:\n{user_context}")
        return response or "Sistemi i ngarkuar."
    except: return "Gabim teknik."

async def chat_completion(system_prompt: str, user_message: str) -> str:
    result = await _call_deepseek_async(system_prompt, user_message)
    return result or "Nuk u gjenerua përgjigje."