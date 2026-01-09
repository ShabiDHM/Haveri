# FILE: backend/app/models/common.py
# PHOENIX PROTOCOL - MODEL VALIDATION V2.0 (STRICT OBJECTID FIX)
# 1. CRITICAL FIX: The 'python_schema' was previously set to 'is_instance_schema(ObjectId)', which REJECTED string inputs from Python code.
#    - Updated to use a 'union_schema' that accepts both 'ObjectId' instances AND 'str' (validating the string as an ObjectId).
# 2. RESULT: Models can now be instantiated with dictionaries containing string IDs without crashing.

from bson import ObjectId
from typing import Any
from pydantic_core import core_schema

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: Any
    ) -> core_schema.CoreSchema:
        
        # Validation function: Checks validity and returns an ObjectId instance
        def validate(v: Any) -> ObjectId:
            if isinstance(v, ObjectId):
                return v
            if isinstance(v, str) and ObjectId.is_valid(v):
                return ObjectId(v)
            raise ValueError("Invalid ObjectId")

        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                # Allow actual ObjectId instances
                core_schema.is_instance_schema(ObjectId),
                # Allow strings, but run them through the validator to convert to ObjectId
                core_schema.no_info_after_validator_function(
                    validate,
                    core_schema.str_schema()
                )
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )