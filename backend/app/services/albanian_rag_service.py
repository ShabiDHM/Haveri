# FILE: backend/app/services/albanian_rag_service.py
# PHOENIX PROTOCOL - AGENTIC RAG SERVICE V2.4 (BULLETPROOF INPUT)
# 1. CRITICAL FIX: The agent input is now a JSON string containing both the query and user_id.
# 2. REASON: This forces the agent's parser to correctly handle the user_id, resolving the persistent ValidationError with tool calls.
# 3. ROBUSTNESS: This pattern is more stable and less dependent on LangChain's internal variable handling.

import os
import logging
import json # PHOENIX FIX: Import json
from typing import List, Optional, Any
from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import tool
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic.v1 import BaseModel, Field, SecretStr
from bson import ObjectId

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
OPENROUTER_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.environ.get("OPENAI_MODEL", "deepseek/deepseek-chat")

# --- TOOL DEFINITIONS ---

class PrivateDiaryInput(BaseModel):
    query: str = Field(description="The question to search for in the user's private documents.")
    user_id: str = Field(description="The ID of the user owning the data.")

@tool("query_private_diary", args_schema=PrivateDiaryInput)
def query_private_diary_tool(query: str, user_id: str) -> str:
    """Access the user's 'Private Diary' (Personal Knowledge Base). Use this FIRST."""
    from . import vector_store_service
    if not user_id or user_id == 'undefined':
        return "CRITICAL ERROR: user_id was not provided to the tool."
    results = vector_store_service.query_private_diary(user_id=user_id, query_text=query)
    if not results:
        return "No private records found."
    return "\n\n".join([f"[SOURCE: {r['source']}]\n{r['content']}" for r in results])

class PublicLibraryInput(BaseModel):
    query: str = Field(description="The topic to search for in the public laws and regulations.")

@tool("query_public_library", args_schema=PublicLibraryInput)
def query_public_library_tool(query: str) -> str:
    """Access the 'Public Library' (Official Laws & Regulations). Use this for compliance."""
    from . import vector_store_service
    results = vector_store_service.query_public_library(query_text=query, agent_type='business')
    if not results:
        return "No public records found."
    return "\n\n".join([f"[SOURCE: {r['source']}]\n{r['content']}" for r in results])

# --- AGENT SERVICE ---

class AlbanianRAGService:
    def __init__(self, db: Any):
        self.db = db
        self.tools = [query_private_diary_tool, query_public_library_tool]
        
        api_key = os.environ.get("OPENAI_API_KEY")
        
        if api_key:
            self.llm = ChatOpenAI(
                model=OPENROUTER_MODEL,
                api_key=SecretStr(api_key), 
                base_url=OPENROUTER_BASE_URL,
                temperature=0.0,
                streaming=False
            )
        else:
            self.llm = None
            logger.warning("Agent Service initialized without API Key. AI features will fail.")

        # -- RESEARCHER PROMPT (ReAct) --
        # PHOENIX FIX: Updated prompt to handle a JSON string as input.
        researcher_template = """
        You are a smart business assistant for a company in Kosovo. Your goal is to answer the user's question in Albanian.
        
        Your input will be a JSON string containing two keys: "user_question" and "user_id".
        You MUST parse this input to understand the question and to get the user_id for your tools.

        When using the 'query_private_diary' tool, you MUST include the 'user_id' from the input.

        TOOLS:
        {tools}

        RESPONSE FORMAT:
        Question: the original user question from the JSON input
        Thought: your reasoning process
        Action: the action to take, one of [{tool_names}]
        Action Input: a JSON object with the required parameters for the action. For 'query_private_diary', this MUST include the 'user_id'.
        Observation: the result from the tool
        ... (repeat Thought/Action/Observation as needed)
        Thought: I now have enough information to answer the user's question.
        Final Answer: your comprehensive answer in Albanian.

        Begin!

        Input: {input}
        Thought: {agent_scratchpad}
        """
        self.researcher_prompt = PromptTemplate.from_template(researcher_template)

        if self.llm:
            agent = create_react_agent(self.llm, self.tools, self.researcher_prompt)
            self.researcher_executor = AgentExecutor(
                agent=agent, 
                tools=self.tools, 
                verbose=True, 
                handle_parsing_errors=True
            )
        else:
            self.researcher_executor = None

    async def _get_case_summary(self, case_id: str) -> str:
        try:
            if not self.db or not case_id: return ""
            case = await self.db.cases.find_one({"_id": ObjectId(case_id)})
            if not case: return ""
            return f"PROJECT CONTEXT: {case.get('title', 'Untitled')} - {case.get('description', '')}"
        except Exception:
            return ""

    async def chat(self, query: str, user_id: str, case_id: Optional[str] = None) -> str:
        if not self.researcher_executor or not self.llm:
            return "Sistemi AI nuk është konfiguruar. Ju lutem kontrolloni API Key."

        case_summary = await self._get_case_summary(case_id) if case_id else ""
        full_query = f"{case_summary}\n\nUSER QUESTION: {query}"

        try:
            logger.info(f"🤖 Agent Researcher starting for User: {user_id}")
            
            # PHOENIX FIX: Create a structured JSON input string.
            structured_input = {
                "user_question": full_query,
                "user_id": user_id
            }
            input_json_str = json.dumps(structured_input)

            draft_result = await self.researcher_executor.ainvoke({
                "input": input_json_str,
                "chat_history": [] 
            })
            draft_answer = draft_result.get("output", "Nuk u gjenerua përgjigje.")

            logger.info("🧐 Agent Critic reviewing...")
            critic_prompt = f"""
            Review this draft answer. If good, say "OK". Otherwise, provide critique in Albanian.
            Question: {query}
            Draft: {draft_answer}
            """
            critic_response = await self.llm.ainvoke(critic_prompt)
            critique = critic_response.content

            if "OK" in str(critique) and len(str(critique)) < 10:
                return draft_answer

            logger.info("✍️ Agent Reviser polishing...")
            revision_prompt = f"""
            Rewrite the draft in Albanian to address the critique.
            Draft: {draft_answer}
            Critique: {critique}
            Final Answer:
            """
            final_response = await self.llm.ainvoke(revision_prompt)
            return str(final_response.content)

        except Exception as e:
            logger.error(f"Agent execution failed: {e}", exc_info=True)
            return "Më vjen keq, pata një problem gjatë arsyetimit. Ju lutem provoni përsëri."