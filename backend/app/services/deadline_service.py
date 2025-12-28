# FILE: backend/app/services/deadline_service.py
# PHOENIX PROTOCOL - DEADLINE ENGINE V5.0 (BUSINESS INTELLIGENCE)
# 1. REFACTOR: Transformed the 'Legal Clerk' into a 'Business Administrator' persona.
# 2. LOGIC: AI now classifies dates into 'PAYMENT_DUE', 'TAX_DEADLINE', or 'TASK'.
# 3. STATUS: Fully aligned with the new Business Calendar Model.

import os
import json
import structlog
import dateparser
import re
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from pymongo.database import Database
from openai import OpenAI 

logger = structlog.get_logger(__name__)

# --- CONFIGURATION ---
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY") 
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "deepseek/deepseek-chat" 

LOCAL_LLM_URL = os.environ.get("LOCAL_LLM_URL", "http://local-llm:11434/api/chat")
LOCAL_MODEL_NAME = "llama3"

def _clean_json_string(json_str: str) -> str:
    cleaned = re.sub(r'^```json\s*', '', json_str, flags=re.MULTILINE)
    cleaned = re.sub(r'^```\s*', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'```\s*$', '', cleaned, flags=re.MULTILINE)
    return cleaned.strip()

def _extract_dates_with_regex(text: str) -> List[Dict[str, str]]:
    matches = []
    long_pattern = r'(.{0,30})\b(\d{1,2})\s+(Janar|Shkurt|Mars|Prill|Maj|Qershor|Korrik|Gusht|Shtator|Tetor|Nëntor|Dhjetor|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b(.{0,30})'
    numeric_pattern = r'(.{0,30})\b(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})\b(.{0,30})'
    
    found_long = re.findall(long_pattern, text, re.IGNORECASE)
    for pre, day, month, year, post in found_long:
        date_str = f"{day} {month} {year}"
        matches.append({
            "title": "Afat i Gjetur",
            "date_text": date_str,
            "type": "TASK", # Default to generic task for regex matches
            "description": f"Konteksti: ...{pre.strip()} {date_str} {post.strip()}..."
        })

    found_numeric = re.findall(numeric_pattern, text)
    for pre, day, month, year, post in found_numeric:
        date_str = f"{day}.{month}.{year}"
        matches.append({
            "title": "Afat i Gjetur",
            "date_text": date_str,
            "type": "TASK",
            "description": f"Konteksti: ...{pre.strip()} {date_str} {post.strip()}..."
        })

    return matches

def _call_local_llm(prompt: str) -> str:
    try:
        payload = {"model": LOCAL_MODEL_NAME, "messages": [{"role": "user", "content": prompt}], "stream": False, "format": "json"}
        with httpx.Client(timeout=45.0) as client:
            response = client.post(LOCAL_LLM_URL, json=payload)
            return response.json().get("message", {}).get("content", "")
    except Exception as e:
        logger.warning(f"⚠️ Local LLM Failed: {e}")
        return ""

def _extract_dates_with_llm(full_text: str) -> List[Dict[str, str]]:
    truncated_text = full_text[:20000] 
    current_date = datetime.now().strftime("%d %B %Y")
    
    # PHOENIX: New Business Administrator Prompt
    system_prompt = f"""
    Ti je "Administratori i Biznesit".
    DATA E SOTME: {current_date}.
    
    DETYRA:
    Identifiko çdo AFAT ose DATË të rëndësishme në tekst.
    
    KATEGORIZIMI (Zgjidh një):
    - "PAYMENT_DUE": Për fatura, këste kredie, pagesa qiraje.
    - "TAX_DEADLINE": Për deklarime në ATK, pagesa tatimore.
    - "TASK": Për çdo datë tjetër (takim, dorëzim malli, skadencë kontrate).

    RREGULLAT:
    1. Injoro datat e vjetra (të kaluara), përveç nëse janë pagesa të vonuara.
    2. Titulli duhet të jetë i shkurtër dhe informativ (p.sh. "Pagesa Fatura #123").

    FORMATI JSON STRIKT:
    [
      {{
        "title": "Titulli i afatit",
        "date_text": "DD/MM/YYYY",
        "type": "PAYMENT_DUE" | "TAX_DEADLINE" | "TASK",
        "description": "Detaje shtesë..."
      }}
    ]
    """

    if DEEPSEEK_API_KEY:
        try:
            client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=OPENROUTER_BASE_URL)
            response = client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": f"TEKSTI:\n{truncated_text}"}],
                temperature=0.1, response_format={"type": "json_object"},
                extra_headers={"HTTP-Referer": "https://haveri.tech", "X-Title": "Haveri Business Deadlines"}
            )
            content = response.choices[0].message.content or ""
            data = json.loads(_clean_json_string(content))
            
            if isinstance(data, dict):
                for val in data.values():
                    if isinstance(val, list): return val
                return []
            return data if isinstance(data, list) else []

        except Exception as e:
            logger.warning(f"⚠️ DeepSeek Extraction Failed: {e}")

    # Fallback to Local LLM
    local_prompt = f"{system_prompt}\n\nTEKSTI:\n{truncated_text}"
    local_content = _call_local_llm(local_prompt)
    if local_content:
        try:
            data = json.loads(_clean_json_string(local_content))
            if isinstance(data, dict):
                for val in data.values():
                    if isinstance(val, list): return val
            if isinstance(data, list): return data
        except Exception: pass

    return []

def delete_deadlines_by_document_id(db: Database, document_id: str):
    try: db.calendar_events.delete_many({"document_id": document_id})
    except Exception: pass

def extract_and_save_deadlines(db: Database, document_id: str, full_text: str):
    log = logger.bind(document_id=document_id)
    
    try:
        doc_oid = ObjectId(document_id)
        document = db.documents.find_one({"_id": doc_oid})
    except Exception: return

    if not document or not full_text: return

    case_id_str = str(document.get("case_id", ""))
    owner_id = document.get("owner_id")
    if isinstance(owner_id, str):
        try: owner_id = ObjectId(owner_id)
        except: pass

    # 1. AI Extraction (Priority)
    raw_deadlines = _extract_dates_with_llm(full_text)
    
    # 2. Regex Fallback
    if not raw_deadlines:
        log.info("deadline_service.switching_to_regex")
        raw_deadlines = _extract_dates_with_regex(full_text[:5000])

    if not raw_deadlines: 
        log.info("deadline_service.no_dates_found")
        return

    unique_events = {}
    now_date = datetime.now().date() 

    for item in raw_deadlines:
        date_text = item.get("date_text", "")
        if not date_text: continue

        parsed_date = dateparser.parse(date_text, languages=['sq', 'en'], settings={'DATE_ORDER': 'DMY', 'PREFER_DATES_FROM': 'future'})
        if not parsed_date: continue
        
        # Only future/today events
        if parsed_date.date() < now_date: continue

        iso_key = parsed_date.date().isoformat()
        
        title = item.get('title', "Afat")
        if len(title) > 50: title = title[:47] + "..."
        
        # PHOENIX: Dynamic Type Mapping
        event_type = item.get("type", "TASK").upper()
        if event_type not in ["PAYMENT_DUE", "TAX_DEADLINE", "TASK"]:
            event_type = "TASK"

        if iso_key in unique_events:
             unique_events[iso_key]["description"] += f"\n\n• {title}: {item.get('description', '')}"
        else:
            unique_events[iso_key] = {
                "case_id": case_id_str,
                "owner_id": owner_id,
                "document_id": document_id,
                "title": title,
                "description": item.get("description", "") + f"\n(Burimi: {document.get('file_name')})",
                "start_date": parsed_date,
                "end_date": parsed_date,
                "is_all_day": True,
                "event_type": event_type, # PHOENIX: Uses the AI-detected type
                "priority": "HIGH" if event_type != "TASK" else "MEDIUM", # Smart Priority
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc),
                "location": "",
                "attendees": []
            }

    if unique_events:
        db.calendar_events.insert_many(list(unique_events.values()))
        log.info("deadline_service.success", count=len(unique_events))