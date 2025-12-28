# FILE: backend/app/celery_app.py
# PHOENIX PROTOCOL - CELERY CONFIG V3.0 (CLEANUP)
# 1. REMOVED: Deleted 'app.tasks.findings_extraction' from autodiscover to prevent import errors.
# 2. STATUS: Configuration is now free of zombie task references.

from celery import Celery
import logging
import os

# Use os.getenv directly for the initial definition to prevent startup race conditions.
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery("tasks", broker=redis_url, backend=redis_url)

def configure_celery_app():
    """
    This function applies the full configuration to the Celery app.
    It is called EXPLICITLY by the worker entrypoint (worker.py).
    """
    from .core.config import settings
    
    # PHOENIX FIX: Use .update() for type safety instead of direct assignment.
    celery_app.conf.update(
        broker_url=settings.REDIS_URL,
        result_backend=settings.REDIS_URL,
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        worker_prefetch_multiplier=1,
        task_acks_late=True,
    )

    # Load any additional task-related configuration from celery_config.py
    celery_app.config_from_object('app.celery_config')

    # Define the modules where tasks are located.
    celery_app.autodiscover_tasks([
        'app.tasks.document_processing',
        'app.tasks.deadline_extraction',
        # 'app.tasks.findings_extraction', # PHOENIX: REMOVED LEGACY TASK
        'app.tasks.chat_tasks',
        'app.tasks.drafting_tasks',
    ])
    
    logging.getLogger(__name__).info("--- [Celery App] Celery application fully configured for worker. ---")

# The configuration is NOT called automatically here.
# It is the responsibility of worker.py to call it.