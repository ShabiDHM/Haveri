# FILE: backend/app/services/albanian_ner_service.py
# PHOENIX PROTOCOL - NER ENGINE V5.0 (HAVERI ALIGNMENT)
# 1. OPTIMIZATION: Bypassed local microservice dependencies, re-routing to cloud endpoints.
# 2. CLEANUP: Decoupled openrouter headers from juristi.tech to haveri.tech.
# 3. STATUS: Clean, Standalone & Production Ready.

import json
import logging
from typing import List, Tuple, Optional
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Legacy/Local Core Fallback (Defaults to empty to avoid local container routing)
AI_CORE_URL = ""

class AlbanianNERService:
    """
    Service responsible for detecting Named Entities (PII) using Hybrid Intelligence.
    Tier 1: DeepSeek V3/Cloud LLM (via OpenRouter/OpenAI API)
    Tier 2: Local Spacy (Bypassed in Cloud-Hybrid setup)
    """
    def __init__(self):
        self.timeout = 15.0 # Response window timeout
        
        api_key = settings.DEEPSEEK_API_KEY or settings.OPENAI_API_KEY
        base_url = settings.OPENAI_BASE_URL
        
        if api_key:
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url
            )
        else:
            self.client = None

    def _extract_with_deepseek(self, text: str) -> Optional[List[dict]]:
        """
        Uses Cloud LLM to extract entities. Returns raw list of dicts.
        """
        if not self.client: 
            return None

        # Truncate to avoid massive costs on huge docs.
        # 10k chars is enough to extract the main parties and structural metadata.
        truncated_text = text[:10000]

        system_prompt = """
        Ti je një ekspert i Nxjerrjes së Entiteteve (NER) për dokumente ligjore shqipe.
        
        DETYRA:
        Identifiko entitetet në tekstin e dhënë dhe ktheji në format JSON.
        
        KATEGORITË:
        - PERSON: Emra njerëzish (p.sh. "Agim Gashi", "Dr. Vjosa Osmani").
        - ORGANIZATION: Kompani, institucione, gjykata (p.sh. "Gjykata Themelore", "PTK sh.a.").
        - LOCATION: Qytete, shtete, adresa (p.sh. "Prishtinë", "Rruga Luan Haradinaj").
        - DATE: Data specifike (p.sh. "12/05/2023", "15 Janar").
        - MONEY: Shuma parash (p.sh. "5000 Euro", "10,000 €").

        FORMATI:
        [
          {"text": "Agim Gashi", "label": "PERSON"},
          {"text": "Prishtinë", "label": "LOCATION"}
        ]
        
        Mos përfshi asnjë tekst tjetër përveç JSON.
        """

        try:
            model_name = settings.OPENAI_MODEL if settings.OPENAI_MODEL else "deepseek/deepseek-chat"
            
            response = self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": truncated_text}
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                extra_headers={
                    "HTTP-Referer": "https://haveri.tech", 
                    "X-Title": "Haveri AI NER"
                }
            )
            
            content = response.choices[0].message.content
            if not content: 
                return None
            
            data = json.loads(content)
            
            # Normalize response (handle if LLM wraps in "entities": [...])
            if isinstance(data, dict):
                for key in data:
                    if isinstance(data[key], list): 
                        return data[key]
                return []
            elif isinstance(data, list):
                return data
                
        except Exception as e:
            logger.warning(f"⚠️ Cloud NER Failed: {e}")
            return None
        return None

    def extract_entities(self, text: str) -> List[Tuple[str, str, int]]:
        """
        Main entry point. Orchestrates Cloud NER execution.
        Returns: List of (entity_text, entity_label, start_char_index).
        """
        if not text: 
            return []
        
        raw_entities = self._extract_with_deepseek(text)
        
        if not raw_entities:
            return []

        results = []
        # Post-processing to find indices (LLMs don't return offsets)
        for ent in raw_entities:
            name = ent.get("text", "").strip()
            label = ent.get("label", "UNKNOWN").upper()
            
            if not name: 
                continue
            
            # Simple find (Caveat: Finds first occurrence only)
            start_index = text.find(name)
            
            # Map common LLM variations to standard labels if needed
            if label in ["ORG", "ORGANIZATE"]: label = "ORGANIZATION"
            if label in ["PER", "PERSONA"]: label = "PERSON"
            if label in ["LOC", "LOKACION", "VEND"]: label = "LOCATION"
            if label in ["DATE", "DATA"]: label = "DATE"
            
            if start_index != -1:
                results.append((name, label, start_index))
                
        return results
    
    def get_albanian_placeholder(self, entity_label: str) -> str:
        """ 
        Maps the entity label to an Albanian placeholder for anonymization. 
        """
        placeholders = {
            "PER": "[EMRI_PERSONI_ANONIMIZUAR]",
            "PERSON": "[EMRI_PERSONI_ANONIMIZUAR]",
            "ORG": "[ORGANIZATË_ANONIMIZUAR]",
            "ORGANIZATION": "[ORGANIZATË_ANONIMIZUAR]",
            "LOC": "[VENDNDODHJA_ANONIMIZUAR]",
            "LOCATION": "[VENDNDODHJA_ANONIMIZUAR]",
            "GPE": "[VENDNDODHJA_ANONIMIZUAR]",
            "DATE": "[DATA_ANONIMIZUAR]",
            "MONEY": "[VLERA_MONETARE_ANONIMIZUAR]",
            "CASE_NUMBER": "[NUMRI_ÇËSHTJES_ANONIMIZUAR]",
        }
        return placeholders.get(entity_label.upper(), f"[{entity_label}_ANONIMIZUAR]")
        
# --- Global Instance ---
ALBANIAN_NER_SERVICE = AlbanianNERService()