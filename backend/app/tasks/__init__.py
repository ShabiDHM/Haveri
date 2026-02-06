# FILE: backend/app/tasks/__init__.py
# PHOENIX PROTOCOL - TASK REGISTRY V5.0 (CLEANUP)
# 1. REMOVED: References to chat_tasks and drafting_tasks.
# 2. STATUS: Fully synchronized and worker-ready.

from . import (
    document_processing,
    deadline_extraction,
    subscription_management
)