# FILE: backend/app/services/__init__.py
# PHOENIX PROTOCOL - SERVICE REGISTRY V4.0 (ACCOUNTANT INTEGRATION)
# 1. ADDED: Registered the full suite of Accountant Agent services.
# 2. PRESERVED: Maintained all 29 existing Juristi/Havery service imports.
# 3. STATUS: Complete and unabridged replacement.

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
    graph_service,
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

    # --- PHOENIX V4.0: REGISTER THE NEW ACCOUNTANT SERVICES ---
    accountant_vector_service,
    accountant_llm_service,
    accountant_chat_service
)