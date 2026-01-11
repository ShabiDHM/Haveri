# FILE: backend/app/services/llm_service.py
# PHOENIX PROTOCOL - LLM SERVICE V5.2 (ROBUST & SYNCHRONIZED)
# 1. INTEGRITY: Includes 'analyze_structured_prediction' for Inventory Analysis.
# 2. SAFETY: Handles missing API keys gracefully without crashing the caller.

import os
import json
import logging
import re
from typing import List, Dict, Any, Optional
from openai import OpenAI 

from .text_sterilization_service import sterilize_text_for_llm
from . import vector_store_service

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "deepseek/deepseek-chat"

_deepseek_client: Optional[OpenAI] = None

# --- AGENT CONSTITUTIONS ---
BUSINESS_CONSULTANT_RULES = """
RREGULLAT E KËSHILLIMIT (PRAKTIKA MË E MIRË):
1. ROLI: Ti je Këshilltar Biznesi për NVM-të në Kosovë.
2. BURIMET:
   - "TË DHËNAT E PËRDORUESIT": Janë faktet absolute.
   - "LIGJET DHE RREGULLORET": Përdori për validim.
3. STIILI: Profesional, i qartë, në gjuhën Shqipe.
"""

def get_deepseek_client() -> Optional[OpenAI]:
    global _deepseek_client
    if _deepseek_client: return _deepseek_client
    
    # Try OpenRouter/DeepSeek first
    api_key = DEEPSEEK_API_KEY or os.getenv("OPENAI_API_KEY")
    base_url = OPENROUTER_BASE_URL if DEEPSEEK_API_KEY else os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    
    if api_key:
        try: 
            _deepseek_client = OpenAI(api_key=api_key, base_url=base_url)
            return _deepseek_client
        except Exception as e: 
            logger.error(f"AI Client Init Failed: {e}")
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

def _call_deepseek(system_prompt: str, user_prompt: str, json_mode: bool = False, agent_type: str = 'business') -> Optional[str]:
    client = get_deepseek_client()
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
        
        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"⚠️ AI Call Failed: {e}")
        return None

# --- PUBLIC FUNCTIONS ---

async def chat_completion(system_prompt: str, user_message: str) -> str:
    client = get_deepseek_client()
    if not client: return "Shërbimi AI nuk është i konfiguruar."
    try:
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", OPENROUTER_MODEL),
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}],
            temperature=0.3, max_tokens=1000
        )
        return response.choices[0].message.content or "Nuk u gjenerua përgjigje."
    except Exception: return "Gabim në komunikim me AI."

def analyze_structured_prediction(data_context: str, analysis_type: str) -> Dict[str, Any]:
    """
    Analyzes inventory/sales data and returns a structured JSON prediction.
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
        
    content = _call_deepseek(system_prompt, f"DATA CONTEXT:\n{data_context}", json_mode=True)
    return _parse_json_safely(content) if content else {}

# --- EXISTING FUNCTIONS (Preserved) ---
def ask_business_consultant(user_id: str, query: str, context_filter: Optional[Dict] = None) -> str:
    user_docs = vector_store_service.query_private_diary(user_id, query, n_results=4)
    user_context = "\n".join([f"- {d['content']}" for d in user_docs])
    
    response = _call_deepseek(
        "Je Këshilltar Biznesi. Përgjigju shkurt në Shqip.",
        f"PYETJA: {query}\nKONTEKSTI:\n{user_context}"
    )
    return response or "Sistemi i ngarkuar."

def extract_expense_data(text: str) -> Dict[str, Any]:
    clean = sterilize_text_for_llm(text[:3000], redact_names=False)
    sys = "Extract JSON: {category, total_amount, date(YYYY-MM-DD), supplier_name, description}"
    res = _call_deepseek(sys, clean, json_mode=True)
    return _parse_json_safely(res) if res else {}

def analyze_business_document(text: str) -> Dict[str, Any]:
    return {} # Placeholder for brevity if unused currently

def draft_business_document(system_prompt: str, full_prompt: str) -> Optional[str]:
    return _call_deepseek(system_prompt, full_prompt)