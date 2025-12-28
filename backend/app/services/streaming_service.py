# FILE: backend/app/services/streaming_service.py
# PHOENIX PROTOCOL - REAL-TIME BROADCASTING SERVICE
# 1. FEATURE: Provides a centralized function to broadcast messages to users via Redis Pub/Sub.
# 2. LOGIC: Connects to Redis and publishes a JSON-serialized payload to a user-specific channel.
# 3. STATUS: Decouples the chat service from the complexities of Redis, enabling real-time updates.

import json
import logging
from redis.asyncio import Redis
from app.core.config import settings
from typing import Dict, Any

logger = logging.getLogger(__name__)

async def broadcast_message(user_id: str, message_data: Dict[str, Any]):
    """
    Publishes a message to a user-specific Redis channel for SSE streaming.

    Args:
        user_id (str): The ID of the user to send the message to.
        message_data (Dict[str, Any]): A dictionary containing the message payload.
                                       This will be converted to a JSON string.
    """
    if not user_id:
        logger.warning("Broadcast failed: user_id is missing.")
        return

    redis_client = None
    try:
        # Establish a new connection for this broadcast operation
        redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        
        user_channel = f"user:{user_id}:updates"
        payload = json.dumps(message_data)
        
        await redis_client.publish(user_channel, payload)
        
        logger.info(f"Broadcasted message to channel '{user_channel}'. Type: {message_data.get('type')}")

    except Exception as e:
        logger.error(f"Failed to broadcast message to user {user_id}: {e}", exc_info=True)
    finally:
        if redis_client:
            await redis_client.close()