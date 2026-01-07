# FILE: backend/scripts/test_agent.py
# PHOENIX PROTOCOL - AGENT VALIDATION SCRIPT
# 1. PURPOSE: To directly test the AlbanianRAGService and its tools, bypassing the API.
# 2. USAGE: docker compose exec backend python scripts/test_agent.py

import os
import sys
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# --- PATH SETUP ---
# This allows the script to import modules from the 'app' directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# ------------------

from app.services.albanian_rag_service import AlbanianRAGService
from app.core.config import settings

# --- TEST PARAMETERS ---
# IMPORTANT: Replace with a valid User ID from your MongoDB 'users' collection
TEST_USER_ID = "694cd2b4855c49831824b919" 
TEST_QUERY = "qka permban dokumenti kryesor?"
# -----------------------

async def main():
    """
    Initializes the service and runs a test query.
    """
    print("--- [AGENT TEST SCRIPT] ---")
    
    # Load environment variables from the project's .env file
    load_dotenv()
    print("✅ Environment variables loaded.")

    # --- DB CONNECTION ---
    try:
        print("🔌 Connecting to MongoDB...")
        db_client = AsyncIOMotorClient(settings.DATABASE_URI)
        db = db_client.get_database()
        print("✅ MongoDB connection successful.")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return
    # ---------------------

    # --- SERVICE INITIALIZATION ---
    print("🧠 Initializing AlbanianRAGService...")
    try:
        rag_service = AlbanianRAGService(db=db)
        if not rag_service.llm:
            print("❌ Agent LLM not initialized. Check your OPENAI_API_KEY in the .env file.")
            return
        print("✅ RAG Service initialized.")
    except Exception as e:
        print(f"❌ Failed to initialize RAG Service: {e}")
        return
    # --------------------------

    # --- RUN TEST ---
    print("\n--- [EXECUTING TEST QUERY] ---")
    print(f"👤 User ID: {TEST_USER_ID}")
    print(f"❓ Query:   '{TEST_QUERY}'")
    print("--------------------------------\n")
    
    try:
        # This calls the agent's chat method directly
        response = await rag_service.chat(query=TEST_QUERY, user_id=TEST_USER_ID)
        
        print("\n--- [AGENT FINAL RESPONSE] ---")
        print(response)
        print("------------------------------")

    except Exception as e:
        print(f"❌ An error occurred during agent execution: {e}")
    finally:
        db_client.close()
        print("\n🔌 DB connection closed.")
        print("--- [TEST COMPLETE] ---")


if __name__ == "__main__":
    asyncio.run(main())