# FILE: backend/app/services/llm_service.py
# PHOENIX PROTOCOL - DUAL-AGENT ARCHITECTURE V1
# 1. ARCHITECTURE: Refactored to support distinct 'legal' and 'business' agent personas.
# 2. FEATURE: Added a "Business Constitution" and prompts for the Business Consultant agent.
# 3. LOGIC: The core '_call_deepseek' function now accepts an 'agent_type' to select the correct persona.
# 4. REFACTOR: Created new public methods for drafting to separate legal and business logic.

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
5. MOS JEP KËSHILLA LIGJORE: Nëse pyetja kërkon ekspertizë ligjore, udhëzo përdoruesin të përdorë modulin e Hartimit për kontrata.
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

def draft_legal_document(system_prompt: str, full_prompt: str) -> Optional[str]:
    return _call_deepseek(system_prompt, full_prompt, json_mode=False, agent_type='legal')

def draft_business_document(system_prompt: str, full_prompt: str) -> Optional[str]:
    return _call_deepseek(system_prompt, full_prompt, json_mode=False, agent_type='business')