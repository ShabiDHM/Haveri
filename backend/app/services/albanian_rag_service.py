# FILE: backend/app/services/albanian_rag_service.py
# PHOENIX PROTOCOL - AGENTIC RAG SERVICE V2.9 (STATIC ANALYZER OVERRIDE)
# 1. CRITICAL FIX: Added a '# type: ignore' comment to the `self.tools` assignment.
# 2. REASON: Pylance is failing to correctly infer the return type of the `@tool` decorator, creating a persistent false positive. This override tells the analyzer that the code is correct.
# 3. STATUS: This is the definitive solution to clear the static analysis error without altering the correct runtime behavior.

import os
import logging
import json
from typing import List, Optional, Any
from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import tool
from langchain_core.tools import BaseTool
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic.v1 import BaseModel, Field, SecretStr
from bson import ObjectId

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
OPENROUTER_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.environ.get("OPENAI_MODEL", "deepseek/deepseek-chat")

# --- Encapsulated Tool Input Schema ---
class ToolInput(BaseModel):
    input_json: str = Field(description='A JSON string containing required parameters, such as "query" and "user_id".')

# --- TOOL DEFINITIONS ---

@tool("query_private_diary", args_schema=ToolInput)
def query_private_diary_tool(input_json: str) -> str:
    """Access the user's 'Private Diary'. The input MUST be a JSON string with 'query' and 'user_id' keys."""
    try:
        data = json.loads(input_json)
        query = data["query"]
        user_id = data["user_id"]
    except (json.JSONDecodeError, KeyError) as e:
        return f"Error: Invalid input for query_private_diary. Expected JSON with 'query' and 'user_id'. Error: {e}"

    from . import vector_store_service
    if not user_id or user_id == 'undefined':
        return "CRITICAL ERROR: user_id was missing from the input JSON."
    
    results = vector_store_service.query_private_diary(user_id=user_id, query_text=query)
    if not results:
        return "Nuk u gjetën të dhëna private për këtë pyetje."
        
    formatted_results = "\n\n".join([f"<SOURCE>{r['source']}</SOURCE>\n<CONTENT>{r['content']}</CONTENT>" for r in results])
    return f"<DOCUMENT_RESULTS>\n{formatted_results}\n</DOCUMENT_RESULTS>"

@tool("query_public_library", args_schema=ToolInput)
def query_public_library_tool(input_json: str) -> str:
    """Access the 'Public Library' of laws. The input MUST be a JSON string with a 'query' key."""
    try:
        data = json.loads(input_json)
        query = data["query"]
    except (json.JSONDecodeError, KeyError) as e:
        return f"Error: Invalid input for query_public_library. Expected JSON with 'query'. Error: {e}"

    from . import vector_store_service
    results = vector_store_service.query_public_library(query_text=query, agent_type='business')
    if not results:
        return "Nuk u gjetën të dhëna publike për këtë pyetje."

    formatted_results = "\n\n".join([f"<SOURCE>{r['source']}</SOURCE>\n<CONTENT>{r['content']}</CONTENT>" for r in results])
    return f"<DOCUMENT_RESULTS>\n{formatted_results}\n</DOCUMENT_RESULTS>"

# --- AGENT SERVICE ---

class AlbanianRAGService:
    tools: List[BaseTool]

    def __init__(self, db: Any):
        self.db = db
        # PHOENIX FIX: Override the Pylance false positive. The @tool decorator correctly
        # returns BaseTool objects, but the static analyzer fails to infer this.
        self.tools = [query_private_diary_tool, query_public_library_tool] # type: ignore
        
        api_key = os.environ.get("OPENAI_API_KEY")
        
        if api_key:
            self.llm = ChatOpenAI(model=OPENROUTER_MODEL, api_key=SecretStr(api_key), base_url=OPENROUTER_BASE_URL, temperature=0.0)
        else:
            self.llm = None
            logger.warning("Agent Service initialized without API Key. AI features will fail.")

        researcher_template = """
        You are a smart business assistant for Kosovo. Answer the user's question in Albanian.
        Your input is a JSON string with "user_question" and "user_id".
        Your 'Action Input' for any tool MUST be a single JSON string.
        Example for 'query_private_diary':
        Action Input: {{"input_json": "{{\\"query\\":\\"your question\\",\\"user_id\\":\\"the user id\\"}}"}}
        After an 'Observation', you MUST formulate the 'Final Answer'. Do not get stuck.
        TOOLS: {tools}
        Begin!
        Input: {input}
        Thought: {agent_scratchpad}
        """
        self.researcher_prompt = PromptTemplate.from_template(researcher_template)

        if self.llm:
            agent = create_react_agent(self.llm, self.tools, self.researcher_prompt)
            self.researcher_executor = AgentExecutor(agent=agent, tools=self.tools, verbose=True, handle_parsing_errors=True)
        else:
            self.researcher_executor = None

    async def _get_case_summary(self, case_id: str) -> str:
        try:
            if not self.db or not case_id: return ""
            case = await self.db.cases.find_one({"_id": ObjectId(case_id)})
            return f"PROJECT CONTEXT: {case.get('title', '')} - {case.get('description', '')}" if case else ""
        except Exception:
            return ""

    async def chat(self, query: str, user_id: str, case_id: Optional[str] = None) -> str:
        if not self.researcher_executor or not self.llm:
            return "Sistemi AI nuk është konfiguruar. Ju lutem kontrolloni API Key."

        case_summary = await self._get_case_summary(case_id) if case_id else ""
        full_query = f"{case_summary}\n\nUSER QUESTION: {query}"

        try:
            logger.info(f"🤖 Agent Researcher starting for User: {user_id}")
            
            structured_input = {"user_question": full_query, "user_id": user_id}
            input_json_str = json.dumps(structured_input)

            draft_result = await self.researcher_executor.ainvoke({"input": input_json_str, "chat_history": []})
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