# FILE: backend/app/tasks/__init__.py
# PHOENIX PROTOCOL - TASK REGISTRY V5.0 (CLEANUP)
# 1. REMOVED: References to chat_tasks and drafting_tasks.
# 2. STATUS: Fully synchronized and worker-ready.

from . import (
    document_processing,
    deadline_extraction,
    subscription_management
)# FILE: backend/app/tasks/__init__.py
# PHOENIX PROTOCOL - TASK REGISTRY V5.1 (STABILITY FIX)
# 1. FIXED: Emptied file to resolve Circular Import / Partial Initialization error.
# 2. STATUS: Minimalist state to ensure backend boot stability.

# (This file is intentionally left blank)