# FILE: backend/app/services/__init__.py
# PHOENIX PROTOCOL - SERVICE REGISTRY V4.2 (LLM RESTORATION)
# 1. RESTORED: llm_service (required for Accountant and Analysis modules).
# 2. REMOVED: chat_service and drafting_service (Haveri AI tab specific).
# 3. STATUS: Finalized registry.

from . import (
    admin_service,
    business_service,
    calendar_service,
    case_service,
    # PHOENIX: chat_service removed
    conversion_service,
    deadline_service,
    document_service,
    # PHOENIX: drafting_service removed
    email_service,
    embedding_service,
    encryption_service,
    finance_service,
    graph_service,
    inventory_service,
    llm_service, # PHOENIX: RESTORED
    ocr_service,
    parsing_service,
    pdf_service,
    report_service,
    share_service,
    social_service,
    spreadsheet_service,
    storage_service,
    archive_service,
    daily_briefing_service,
    text_extraction_service,
    text_sterilization_service,
    user_service,
    vector_store_service,
    
    # Albanian Specific Services
    albanian_language_detector,
    albanian_metadata_extractor,
    albanian_ner_service,

    # Accountant Services
    accountant_vector_service,
    accountant_llm_service,
    accountant_chat_service
)