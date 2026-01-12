# FILE: backend/app/services/inbound_service.py
# PHOENIX PROTOCOL - INBOUND EMAIL SERVICE V1.0
# 1. LOGIC: Parses the 'to' address to extract the user's secret token.
# 2. INTEGRATION: Finds the user and uses the existing ParsingService and FinanceService to import data.

import logging
from pymongo.database import Database
from fastapi import HTTPException, status, UploadFile
from app.services.parsing_service import ParsingService
from app.services.finance_service import FinanceService

logger = logging.getLogger(__name__)

class InboundService:
    def __init__(self, db: Database):
        self.db = db
        self.parsing_service = ParsingService(db)
        self.finance_service = FinanceService(db)

    async def process_inbound_attachment(self, to_address: str, file: UploadFile):
        """
        Main logic to process an attachment from an inbound email.
        """
        # 1. Extract token from email address (e.g., 'token@in.haveri.tech')
        try:
            token = to_address.split('@')[0]
            if not token:
                raise ValueError("Email 'to' address is malformed.")
        except Exception:
            logger.error(f"Could not parse token from email address: {to_address}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid 'to' address format.")

        # 2. Find the user by the inbound email token
        owner_user = self.db.users.find_one({"inbound_email_token": token, "organization_role": "OWNER"})
        
        if not owner_user:
            logger.warning(f"No owner user found for inbound email token: {token}")
            # Raise a 404 to indicate the token is invalid
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching user found for this email address.")

        user_id = str(owner_user["_id"])
        logger.info(f"Found user {user_id} for token {token}. Processing attachment: {file.filename}")

        # 3. Use existing ParsingService to preview/validate the file
        # We can reuse the auto-mapping logic if the columns are standard.
        # For simplicity, we'll assume a standard format: Data, Përshkrimi, Kategoria, Shuma, Tipi
        # In a production system, this mapping could be configurable per-user.
        standard_mapping = {
            "Data": "Data",
            "Përshkrimi": "Përshkrimi",
            "Kategoria": "Kategoria",
            "Shuma": "Shuma",
            "Tipi": "Tipi"
        }
        
        try:
            # Re-using the process_import logic from ParsingService
            import_result = await self.parsing_service.process_import(
                file=file,
                user_id=user_id,
                mapping=standard_mapping
            )
            logger.info(f"Successfully imported {import_result.get('imported_count')} transactions for user {user_id}.")
            return import_result
        except Exception as e:
            logger.error(f"Error during file processing for user {user_id}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Failed to process file: {str(e)}")