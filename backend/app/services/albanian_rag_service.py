# FILE: backend/app/services/albanian_rag_service.py
# PHOENIX PROTOCOL - AGENTIC RAG SERVICE V4.1 (TYPE-SAFE CASTING)
# 1. CRITICAL FIX: Explicitly cast `planner_response.content` to a string using `str()` before calling `.strip()`.
# 2. REASON: The `.content` attribute is not guaranteed to be a string. This robust casting prevents the Pylance type error and potential runtime crashes.
# 3. STATUS: This file is now fully type-safe and compliant with the static analyzer, while maintaining the stable "Manual Agent Loop" architecture.

import os
import logging
import json
from typing import Optional, Any
from langchain_openai import ChatOpenAI
from pydantic.v1 import SecretStr
from bson import ObjectId

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
OPENROUTER_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.environ.get("OPENAI_MODEL", "deepseek/deepseek-chat")

# --- TOOL FUNCTIONS (Simplified for direct call) ---

def query_private_diary(query: str, user_id: str) -> str:
    """Finds information in the user's private documents."""
    from app.services import vector_store_service
    if not user_id: return "CRITICAL ERROR: user_id was not provided."
    results = vector_store_service.query_private_diary(user_id=user_id, query_text=query)
    if not results: return "Nuk u gjetën të dhëna private për këtë pyetje."
    return "\n\n".join([f"Burimi: {r['source']}\nPërmbajtja: {r['content']}" for r in results])

def query_public_library(query: str) -> str:
    """Finds information in public laws and regulations."""
    from app.services import vector_store_service
    results = vector_store_service.query_public_library(query_text=query, agent_type='business')
    if not results: return "Nuk u gjetën të dhëna publike për këtë pyetje."
    return "\n\n".join([f"Burimi: {r['source']}\nPërmbajtja: {r['content']}" for r in results])

# --- AGENT SERVICE (NEW ARCHITECTURE) ---

class AlbanianRAGService:
    llm: Optional[ChatOpenAI]

    def __init__(self, db: Any):
        self.db = db
        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key:
            self.llm = ChatOpenAI(model=OPENROUTER_MODEL, api_key=SecretStr(api_key), base_url=OPENROUTER_BASE_URL, temperature=0.0)
        else:
            self.llm = None
            logger.warning("Agent Service initialized without API Key. AI features will fail.")

    async def _get_case_summary(self, case_id: str) -> str:
        try:
            if not self.db or not case_id: return ""
            case = await self.db.cases.find_one({"_id": ObjectId(case_id)})
            return f"Konteksti i Projektit: {case.get('title', '')} - {case.get('description', '')}" if case else ""
        except Exception:
            return ""

    async def chat(self, query: str, user_id: str, case_id: Optional[str] = None) -> str:
        if not self.llm:
            return "Sistemi AI nuk është konfiguruar. Ju lutem kontrolloni API Key."

        case_summary = await self._get_case_summary(case_id) if case_id else ""
        full_query = f"{case_summary}\n\nPyetja e Përdoruesit: {query}"

        # --- STEP 1: THE PLANNER ---
        planner_prompt = f"""
        You are a planning agent. Your only job is to choose the best tool to answer the user's question and create the search query.
        
        Available Tools:
        1. `query_private_diary`: Use this FIRST to check the user's personal documents, contracts, notes, etc.
        2. `query_public_library`: Use this for questions about official laws and regulations.
        3. `no_tool_needed`: Use this if the question is a simple greeting or does not require searching documents.

        User's Question: "{full_query}"

        Respond ONLY with a JSON object in the following format:
        {{"tool": "chosen_tool_name", "query": "optimized search query in Albanian"}}
        """
        try:
            logger.info("🤖 Agent Planner starting...")
            planner_response = await self.llm.ainvoke(planner_prompt)
            # PHOENIX FIX: Explicitly cast content to a string to prevent type errors.
            plan_json_str = str(planner_response.content).strip().replace("```json", "").replace("```", "")
            plan = json.loads(plan_json_str)
            tool_name = plan.get("tool")
            tool_query = plan.get("query")
        except Exception as e:
            logger.error(f"Agent Planner failed to generate a valid JSON plan: {e}")
            return "Më vjen keq, pata një problem me planifikimin e përgjigjes."

        # --- STEP 2: THE EXECUTOR (Our Code) ---
        tool_result = ""
        logger.info(f"▶️ Executing tool: '{tool_name}' with query: '{tool_query}'")
        if tool_name == "query_private_diary":
            tool_result = query_private_diary(query=tool_query, user_id=user_id)
        elif tool_name == "query_public_library":
            tool_result = query_public_library(query=tool_query)
        elif tool_name == "no_tool_needed":
            tool_result = "Përshëndetje! Si mund t'ju ndihmoj sot?"
        else:
            tool_result = "U zgjodh një mjet i panjohur."

        # --- STEP 3: THE SYNTHESIZER ---
        synthesizer_prompt = f"""
        You are a helpful business assistant in Kosovo.
        Your task is to provide a final, comprehensive answer to the user's question based on the information found.
        Answer ONLY in Albanian.

        User's Original Question: "{query}"

        Information Found:
        ---
        {tool_result}
        ---

        Final Answer:
        """
        try:
            logger.info("✍️ Agent Synthesizer creating final answer...")
            final_response = await self.llm.ainvoke(synthesizer_prompt)
            return str(final_response.content).strip()
        except Exception as e:
            logger.error(f"Agent Synthesizer failed: {e}")
            return "Më vjen keq, pata një problem gjatë formulimit të përgjigjes përfundimtare."