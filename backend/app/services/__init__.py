# FILE: backend/app/services/__init__.py
# PHOENIX PROTOCOL - SERVICES INIT V3.0 (GRAPH SERVICE INTEGRATION)
# 1. ADDED: Added 'graph_service' to the list of available services.
# 2. STATUS: Prepares the application for "Interconnected Intelligence" features.

from . import (
    admin_service,
    business_service,
    calendar_service,
    case_service,
    chat_service,
    conversion_service,
    deadline_service,
    document_service,
    drafting_service,
    email_service,
    embedding_service,
    encryption_service,
    finance_service,
    graph_service, # <-- ADDED FOR INTERCONNECTED INTELLIGENCE
    inventory_service,
    llm_service,
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
)