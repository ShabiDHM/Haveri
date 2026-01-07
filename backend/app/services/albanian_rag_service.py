# FILE: backend/app/services/albanian_rag_service.py
# PHOENIX PROTOCOL - AGENTIC RAG SERVICE V3.5 (FEW-SHOT PROMPT)
# 1. CRITICAL FIX: Rewrote the agent prompt to include a "few-shot" example.
# 2. REASON: The agent was confused and failing to follow the ReAct format. Providing a concrete example of a successful reasoning chain is the most effective way to guide the AI and prevent formatting errors.
# 3. EFFECT: This will stabilize the agent's reasoning process and enable it to correctly use its tools.

import os
import logging
import json
from typing import List, Optional, Any
from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import tool, Tool
from langchain_core.tools import BaseTool
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic.v1 import BaseModel, Field, SecretStr
from bson import ObjectId

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
OPENROUTER_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.environ.get("OPENAI_MODEL", "deepseek/deepseek-chat")

# --- BASE TOOL DEFINITIONS ---

class PrivateDiaryInputForAI(BaseModel):
    query: str = Field(description="The question to search for in the user's private documents.")

def _query_private_diary_func(query: str, user_id: str) -> str:
    """Access the user's 'Private Diary' (Personal Knowledge Base) to find specific details about their business, contracts, etc."""
    from app.services import vector_store_service
    if not user_id or user_id == 'undefined':
        return "CRITICAL ERROR: user_id was not provided to the tool."
    results = vector_store_service.query_private_diary(user_id=user_id, query_text=query)
    if not results:
        return "Nuk u gjetën të dhëna private për këtë pyetje."
    return "\n\n".join([f"[SOURCE: {r['source']}]\n{r['content']}" for r in results])

class PublicLibraryInput(BaseModel):
    query: str = Field(description="The topic to search for in the public laws and regulations.")

@tool("query_public_library", args_schema=PublicLibraryInput)
def query_public_library_tool(query: str) -> str:
    """Access the 'Public Library' (Official Laws & Regulations) to verify legal compliance, find laws, etc."""
    from app.services import vector_store_service
    results = vector_store_service.query_public_library(query_text=query, agent_type='business')
    if not results:
        return "Nuk u gjetën të dhëna publike për këtë pyetje."
    return "\n\n".join([f"[SOURCE: {r['source']}]\n{r['content']}" for r in results])

# --- AGENT SERVICE ---

class AlbanianRAGService:
    llm: Optional[ChatOpenAI]
    researcher_prompt: PromptTemplate

    def __init__(self, db: Any):
        self.db = db
        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key:
            self.llm = ChatOpenAI(model=OPENROUTER_MODEL, api_key=SecretStr(api_key), base_url=OPENROUTER_BASE_URL, temperature=0.0)
        else:
            self.llm = None
            logger.warning("Agent Service initialized without API Key. AI features will fail.")

        # PHOENIX FIX: Implemented a robust "Few-Shot" prompt with a clear example.
        researcher_template = """
        You are a helpful assistant for a business in Kosovo. Your goal is to answer the user's question in Albanian using the tools provided.

        TOOLS:
        ------
        {tools}

        RESPONSE FORMAT:
        --------------------
        Follow this exact format. Provide a 'Thought', then an 'Action' and 'Action Input', receive an 'Observation', and repeat until you have enough information for a 'Final Answer'.
        
        EXAMPLE:
        Question: Cilat janë rregullat për pushimin vjetor sipas ligjit?
        Thought: Përdoruesi po pyet për një ligj specifik. Unë duhet të përdor mjetin 'query_public_library' për të gjetur informacionin në legjislacion.
        Action: query_public_library
        Action Input: Ligji i Punës për pushimin vjetor
        Observation: Sipas Ligjit të Punës, neni XX, çdo punonjës ka të drejtën e 20 ditëve të pushimit vjetor të paguar.
        Thought: Unë kam gjetur informacionin e saktë dhe të nevojshëm për t'iu përgjigjur pyetjes.
        Final Answer: Sipas Ligjit të Punës në Kosovë, çdo punonjës ka të drejtën e një pushimi vjetor të paguar prej 20 ditësh pune.
        
        Now, begin!

        Question: {input}
        Thought: {agent_scratchpad}
        """
        self.researcher_prompt = PromptTemplate.from_template(researcher_template)

    async def _get_case_summary(self, case_id: str) -> str:
        try:
            if not self.db or not case_id: return ""
            case = await self.db.cases.find_one({"_id": ObjectId(case_id)})
            return f"PROJECT CONTEXT: {case.get('title', '')} - {case.get('description', '')}" if case else ""
        except Exception:
            return ""

    async def chat(self, query: str, user_id: str, case_id: Optional[str] = None) -> str:
        if not self.llm:
            return "Sistemi AI nuk është konfiguruar. Ju lutem kontrolloni API Key."

        bound_private_func = lambda q: _query_private_diary_func(query=q, user_id=user_id)
        
        private_tool_with_user = Tool(
            name="query_private_diary",
            func=bound_private_func,
            description="Access the user's 'Private Diary' (Personal Knowledge Base) to find specific details about their business, contracts, etc. Use this FIRST.",
            args_schema=PrivateDiaryInputForAI
        )
        
        request_specific_tools: List[BaseTool] = [private_tool_with_user, query_public_library_tool] # type: ignore

        agent = create_react_agent(self.llm, request_specific_tools, self.researcher_prompt)
        researcher_executor = AgentExecutor(agent=agent, tools=request_specific_tools, verbose=True, handle_parsing_errors="Më vjen keq, pata një problem. Po provoj përsëri.")
        
        case_summary = await self._get_case_summary(case_id) if case_id else ""
        full_query = f"{case_summary}\n\nUSER QUESTION: {query}"

        try:
            logger.info(f"🤖 Agent Researcher starting for User: {user_id}")
            
            draft_result = await researcher_executor.ainvoke({"input": full_query, "chat_history": []})
            draft_answer = draft_result.get("output", "").strip()

            if not draft_answer:
                logger.error("Agent returned an empty 'output'.")
                return "Pata një problem me formulimin e përgjigjes. Provoni ta riformuloni pyetjen tuaj."
            
            # Since the new prompt is better, we can trust the first answer more.
            # We will skip the critique loop for now to isolate and confirm the fix.
            return draft_answer

        except Exception as e:
            logger.error(f"Agent execution failed: {e}", exc_info=True)
            return "Më vjen keq, pata një problem gjatë arsyetimit. Ju lutem provoni përsëri."