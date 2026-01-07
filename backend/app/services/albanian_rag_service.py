# FILE: backend/app/services/albanian_rag_service.py
# PHOENIX PROTOCOL - AGENTIC RAG SERVICE V3.4 (PROMPT FIX)
# 1. CRITICAL FIX: Re-instated the essential '{tool_names}' variable in the agent's prompt template.
# 2. REASON: The `create_react_agent` function requires '{tool_names}' to function. Its removal was the direct cause of the "Prompt missing required variables" crash.
# 3. ROBUSTNESS: The prompt has been refined to be fully compliant with the LangChain ReAct agent contract, ensuring stable tool selection.

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

        # PHOENIX FIX: Restored the prompt to its correct, fully-featured state.
        researcher_template = """
        You are a smart business assistant for Kosovo. Answer the user's question in Albanian.
        You have access to tools. You must use them to find the answer.
        
        TOOLS:
        ------
        {tools}
        
        RESPONSE FORMAT:
        --------------------
        Question: The input question you must answer
        Thought: You should always think about what to do.
        Action: The action to take, must be one of [{tool_names}]
        Action Input: The input to the action.
        Observation: The result of the action.
        ... (this Thought/Action/Action Input/Observation can repeat N times)
        Thought: I now have enough information to answer the user's question.
        Final Answer: The final answer to the original input question, in Albanian.
        
        Begin!
        
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
        researcher_executor = AgentExecutor(agent=agent, tools=request_specific_tools, verbose=True, handle_parsing_errors=True)
        
        case_summary = await self._get_case_summary(case_id) if case_id else ""
        full_query = f"{case_summary}\n\nUSER QUESTION: {query}"

        try:
            logger.info(f"🤖 Agent Researcher starting for User: {user_id}")
            
            draft_result = await researcher_executor.ainvoke({"input": full_query, "chat_history": []})
            draft_answer = draft_result.get("output", "").strip()

            if not draft_answer:
                logger.error("Agent returned an empty 'output'.")
                return "Pata një problem me formulimin e përgjigjes. Provoni ta riformuloni pyetjen tuaj."
            
            logger.info("🧐 Agent Critic reviewing...")
            critic_prompt = f'Review this draft. If good, say "OK". Otherwise, critique in Albanian.\nQuestion: {query}\nDraft: {draft_answer}'
            critic_response = await self.llm.ainvoke(critic_prompt)
            critique = critic_response.content

            if "OK" in str(critique) and len(str(critique)) < 10:
                return draft_answer

            logger.info("✍️ Agent Reviser polishing...")
            revision_prompt = f"Rewrite the draft in Albanian to address the critique.\nDraft: {draft_answer}\nCritique: {critique}\nFinal Answer:"
            final_response = await self.llm.ainvoke(revision_prompt)
            return str(final_response.content)

        except Exception as e:
            logger.error(f"Agent execution failed: {e}", exc_info=True)
            return "Më vjen keq, pata një problem gjatë arsyetimit. Ju lutem provoni përsëri."