# FILE: backend/app/tasks/subscription_management.py
# PHOENIX PROTOCOL - CELERY DB CONNECTION FIX V2.0
# 1. FIX: Implemented the standard 'ensure_db_connection' pattern to initialize the database within the worker process.
# 2. FIX: The 'check_subscriptions' task now passes the live DB instance to the admin_service, preventing crashes.

from app.celery_app import celery_app
from ..services import admin_service
from celery.schedules import crontab
import json
import logging
# PHOENIX FIX: Import the dynamic db module
from ..core import db

logger = logging.getLogger(__name__)

# PHOENIX FIX: Standard helper to initialize DB connection inside the worker
def ensure_db_connection():
    """
    Ensures that the Celery worker has an active connection to Mongo.
    This is required because workers do not run the FastAPI lifespan events.
    """
    if db.db_instance is None:
        logger.info("--- [Celery/Subscription] Initializing MongoDB Connection... ---")
        db.connect_to_mongo()

def log_structured(task_name: str, status: str, message: str = "", **extra):
    log_entry = {"task_name": task_name, "status": status, "message": message, **extra}
    # Use standard logger for better integration with Celery's logging system
    logger.info(json.dumps(log_entry))

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Sets up the periodic task schedule (Celery Beat)."""
    sender.add_periodic_task(
        crontab(hour=0, minute=5), # Run daily at 00:05 UTC
        check_subscriptions.s(),
        name='Check for expired subscriptions daily',
    )

@celery_app.task(name="check_subscriptions")
def check_subscriptions():
    """
    Thin wrapper task that delegates the subscription check to the admin_service.
    """
    task_name = "nightly_subscription_check"
    log_structured(task_name, "initiated")
    try:
        # PHOENIX FIX: Ensure the DB connection is live before using it
        ensure_db_connection()
        # PHOENIX FIX: Pass the live db_instance to the service layer
        num_expired = admin_service.expire_subscriptions(db=db.db_instance)
        log_structured(task_name, "success", f"{num_expired} subscriptions expired.")
    except Exception as e:
        log_structured(task_name, "failed", str(e))