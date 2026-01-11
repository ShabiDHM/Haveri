# FILE: backend/app/services/__init__.py
# PHOENIX PROTOCOL - SERVICES INIT V2.0
# 1. REMOVED: Deleted imports for 'document_processing_service' and 'albanian_document_processor'.
# 2. REASON: These files were deleted as their intelligence was consolidated into the unified Celery worker.
# 3. STATUS: Resolves the circular import error and allows the application to start.

from . import (
    admin_service,
    business_service,
    calendar_service,
    case_service,
    chat_service,
    conversion_service,
    deadline_service,
    # document_processing_service, # PHOENIX: Removed, logic migrated to Celery task
    document_service,
    drafting_service,
    email_service,
    embedding_service,
    encryption_service,
    llm_service,
    ocr_service,
    report_service,
    storage_service,
    text_extraction_service,
    text_sterilization_service,
    user_service,
    vector_store_service,
    spreadsheet_service,
    archive_service,
    finance_service,
    pdf_service,
    social_service,
    inventory_service,
    daily_briefing_service,
    parsing_service,
    share_service,
    
    # Albanian Specific Services
    albanian_language_detector,
    albanian_metadata_extractor,
    albanian_ner_service,
)