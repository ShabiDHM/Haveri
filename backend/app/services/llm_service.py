# FILE: backend/app/services/llm_service.py
# PHOENIX PROTOCOL - PIPELINE RESTORATION V3.0
# 1. ADDED: 'generate_summary' is back, but now uses a "Business Assistant" prompt.
# 2. REFACTOR: Renamed 'sterilize_legal_text' to 'prepare_document_text' for general business use.
# 3. STATUS: Fully supports the background document processing pipeline.

import os
import json
import logging
import httpx
import re
from typing import List, Dict, Any, Optional
from openai import OpenAI 

from .text_sterilization_service import sterilize_text_for_llm

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "deepseek/deepseek-chat"
OLLAMA_URL = os.environ.get("LOCAL_LLM_URL", "http://local-llm:11434/api/generate")
LOCAL_MODEL_NAME = "llama3"

_deepseek_client: Optional[OpenAI] = None

# --- AGENT CONSTITUTIONS ---

STRICT_FORENSIC_RULES = """
RREGULLAT E AUDITIMIT (STRICT LIABILITY):
1. ZERO HALUCINACIONE: Nëse fakti nuk ekziston në tekst, shkruaj "NUK KA TË DHËNA". Mos hamendëso asgjë.
2. CITIM I DETYRUESHËM: Çdo pretendim faktik duhet të ketë referencën: [Fq. X].
3. JURIDIKSIONI: Republika e Kosovës.
"""

BUSINESS_CONSULTANT_RULES = """
RREGULLAT E KËSHILLIMIT (PRAKTIKA MË E MIRË):
1. FOKUSI TEK VEPRIMI: Jep këshilla praktike dhe të zbatueshme për një biznes të vogël në Kosovë.
2. GJUHA E THJESHTË: Shmangu zhargonin. Komuniko qartë dhe drejtpërdrejt.
3. INKURAJIM DHE MOTIVIM: Përdor një ton pozitiv dhe mbështetës.
4. KONTEKSTI LOKAL: Mbaj parasysh sfidat dhe mundësitë e tregut në Kosovë.
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

def _call_deepseek(system_prompt: str, user_prompt: str, json_mode: bool = False, agent_type: str = 'legal') -> Optional[str]:
    client = get_deepseek_client()
    if not client: return None
    try:
        constitution = BUSINESS_CONSULTANT_RULES if agent_type == 'business' else STRICT_FORENSIC_RULES
        full_system_prompt = f"{system_prompt}\n\n{constitution}"
        
        kwargs = {"model": OPENROUTER_MODEL, "messages": [{"role": "system", "content": full_system_prompt}, {"role": "user", "content": user_prompt}], "temperature": 0.0, "extra_headers": {"HTTP-Referer": "https://haveri.tech", "X-Title": "Haveri AI"}}
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

# --- PUBLIC SERVICES ---

# PHOENIX: Renamed from 'sterilize_legal_text' to match business context
def prepare_document_text(text: str) -> str:
    if not text: return ""
    text = sterilize_text_for_llm(text, redact_names=False)
    # Maintain pagination for references
    text = re.sub(r'--- \[Page (\d+)\] ---', r'--- [FAQJA \1] ---', text)
    return text

# PHOENIX: Restored and Refactored for Business
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
    
    # Try Local LLM first for speed/cost, fallback to DeepSeek
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

def draft_legal_document(system_prompt: str, full_prompt: str) -> Optional[str]:
    return _call_deepseek(system_prompt, full_prompt, json_mode=False, agent_type='legal')

def draft_business_document(system_prompt: str, full_prompt: str) -> Optional[str]:
    return _call_deepseek(system_prompt, full_prompt, json_mode=False, agent_type='business')

# Placeholder for graph extraction
def extract_graph_data(text: str) -> Dict[str, List[Dict]]: return {"entities": [], "relations": []}