# FILE: backend/app/services/llm_service.py
# PHOENIX PROTOCOL - BUSINESS INTELLIGENCE V4.0
# 1. NEW: Implemented 'ask_business_consultant' (The RAG Engine).
# 2. LOGIC: Performs Hybrid Retrieval (User Data + Public Laws) and synthesizes answers.
# 3. PERSONA: Enforces a professional, Albanian-speaking Business Consultant persona.

import os
import json
import logging
import httpx
import re
from typing import List, Dict, Any, Optional
from openai import OpenAI 

from .text_sterilization_service import sterilize_text_for_llm
from . import vector_store_service # PHOENIX: Added to enable RAG

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "deepseek/deepseek-chat"
OLLAMA_URL = os.environ.get("LOCAL_LLM_URL", "http://local-llm:11434/api/generate")
LOCAL_MODEL_NAME = "llama3"

_deepseek_client: Optional[OpenAI] = None

# --- AGENT CONSTITUTIONS ---

BUSINESS_CONSULTANT_RULES = """
RREGULLAT E KËSHILLIMIT (PRAKTIKA MË E MIRË):
1. ROLI: Ti je Këshilltar Biznesi për NVM-të në Kosovë.
2. BURIMET:
   - "TË DHËNAT E PËRDORUESIT": Janë faktet absolute për biznesin e klientit.
   - "LIGJET DHE RREGULLORET": Përdori për të validuar nëse veprimet e klientit janë të ligjshme.
3. STIILI: Profesional, i qartë, në gjuhën Shqipe. Shmangu zhargonin e panevojshëm.
4. REFUZIMI: Nëse pyetja është jashtë fushës së biznesit/ligjit, thuaj që nuk mund të përgjigjesh.
"""

def get_deepseek_client() -> Optional[OpenAI]:
    global _deepseek_client
    if _deepseek_client: return _deepseek_client
    if DEEPSEEK_API_KEY:
        try: _deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=OPENROUTER_BASE_URL); return _deepseek_client
        except Exception as e: logger.error(f"DeepSeek Init Failed: {e}")
    return None

def _parse_json_safely(content: str) -> Dict[str, Any]:
    try: return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
        if match:
            try: return json.loads(match.group(1))
            except: pass
        return {}

def _call_deepseek(system_prompt: str, user_prompt: str, json_mode: bool = False, agent_type: str = 'business') -> Optional[str]:
    client = get_deepseek_client()
    if not client: return None
    try:
        constitution = BUSINESS_CONSULTANT_RULES 
        full_system_prompt = f"{system_prompt}\n\n{constitution}"
        
        kwargs = {"model": OPENROUTER_MODEL, "messages": [{"role": "system", "content": full_system_prompt}, {"role": "user", "content": user_prompt}], "temperature": 0.3, "extra_headers": {"HTTP-Referer": "https://haveri.tech", "X-Title": "Haveri AI"}}
        if json_mode: kwargs["response_format"] = {"type": "json_object"}
        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"⚠️ DeepSeek Call Failed: {e}")
        return None

def _call_local_llm(prompt: str) -> str:
    try:
        payload = {"model": LOCAL_MODEL_NAME, "prompt": prompt, "stream": False}
        with httpx.Client(timeout=45.0) as client:
            response = client.post(OLLAMA_URL, json=payload)
            return response.json().get("response", "")
    except Exception: return ""

# --- RAG ENGINE: BUSINESS CONSULTANT ---

def ask_business_consultant(user_id: str, query: str, context_filter: Optional[Dict] = None) -> str:
    """
    The Core Intelligence Function.
    1. Retrieves relevant documents from User KB.
    2. Retrieves relevant laws from Public KB.
    3. Synthesizes an answer.
    """
    # 1. Retrieve User Context (Private)
    user_docs = vector_store_service.query_private_diary(user_id, query, n_results=4)
    user_context_str = "\n".join([f"- [DOKUMENTI I BRENDSHËM: {d['source']}]: {d['content']}" for d in user_docs])
    
    # 2. Retrieve Public Context (Laws)
    # We query both business and legal collections to be safe
    public_docs_biz = vector_store_service.query_public_library(query, n_results=2, agent_type='business')
    public_docs_legal = vector_store_service.query_public_library(query, n_results=2, agent_type='legal')
    public_context_str = "\n".join([f"- [LIGJI/RREGULLORE: {d['source']}]: {d['content']}" for d in (public_docs_biz + public_docs_legal)])

    if not user_context_str and not public_context_str:
        return "Nuk gjeta asnjë informacion relevant në dokumentet tuaja apo në bazën ligjore për këtë pyetje."

    # 3. Construct Prompt
    system_prompt = """
    Ti je Këshilltari i Biznesit 'Haveri'.
    Përdor kontekstin e mëposhtëm për t'iu përgjigjur pyetjes së përdoruesit.
    
    UDHËZIME SPECIFIKE:
    1. Jep përparësi informacioneve nga 'TË DHËNAT E PËRDORUESIT'.
    2. Përdor 'LIGJET' për të shpjeguar ose validuar të dhënat e përdoruesit.
    3. Nëse informacioni mungon, thuaj qartë 'Nuk kam informacion të mjaftueshëm në dokumentet e tua'.
    4. Përgjigju gjithmonë në Shqip.
    """
    
    user_prompt = f"""
    PYETJA E PËRDORUESIT: {query}

    --- TË DHËNAT E PËRDORUESIT (PRIVATE) ---
    {user_context_str}

    --- LIGJET DHE RREGULLORET (PUBLIKE) ---
    {public_context_str}
    """

    # 4. Generate Answer
    response = _call_deepseek(system_prompt, user_prompt, agent_type='business')
    return response or "Më vjen keq, sistemi është momentalisht i ngarkuar."

# --- DOCUMENT UTILITIES ---

def prepare_document_text(text: str) -> str:
    if not text: return ""
    text = sterilize_text_for_llm(text, redact_names=False)
    text = re.sub(r'--- \[Page (\d+)\] ---', r'--- [FAQJA \1] ---', text)
    return text

def generate_summary(text: str) -> str:
    clean_text = prepare_document_text(text[:20000])
    system_prompt = """
    Ti je 'Asistenti Inteligjent i Biznesit'.
    DETYRA: Krijo një përmbledhje ekzekutive të këtij dokumenti për pronarin e biznesit.
    1. Identifiko llojin e dokumentit (Faturë, Kontratë, Ofertë, Raport).
    2. Nxirr pikat kyçe: Datat, Shumat Monetare, Palët e Përfshira.
    3. Përdor gjuhë të thjeshtë dhe direkte në Shqip.
    """
    user_prompt = f"DOKUMENTI PËR ANALIZË:\n{clean_text}"
    
    res = _call_local_llm(f"{system_prompt}\n\n{user_prompt}")
    if not res or len(res) < 50: 
        res = _call_deepseek(system_prompt, user_prompt, agent_type='business')
    return res or "Nuk u gjenerua përmbledhje."

def analyze_business_document(text: str) -> Dict[str, Any]:
    clean_text = prepare_document_text(text[:15000])
    system_prompt = """
    Ti je 'Këshilltari Kryesor i Biznesit'. Ndihmo pronarin të kuptojë këtë dokument.
    FORMATI JSON (Strict):
    {
        "document_type": "Lloji i dokumentit",
        "key_figures": [{"label": "P.sh. Totali", "value": "€..."}],
        "action_items": ["Detyrat (p.sh. Afati i pagesës)"],
        "insights": "Vlerësim i shkurtër."
    }
    """
    user_prompt = f"DOKUMENTI:\n{clean_text}"
    content = _call_deepseek(system_prompt, user_prompt, json_mode=True, agent_type='business')
    return _parse_json_safely(content) if content else {}

def draft_business_document(system_prompt: str, full_prompt: str) -> Optional[str]:
    return _call_deepseek(system_prompt, full_prompt, json_mode=False, agent_type='business')

# Placeholder for graph extraction
def extract_graph_data(text: str) -> Dict[str, List[Dict]]: return {"entities": [], "relations": []}