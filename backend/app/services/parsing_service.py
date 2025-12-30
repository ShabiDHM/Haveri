# FILE: backend/app/services/parsing_service.py
# PHOENIX PROTOCOL - DIAGNOSTIC TRACER V1.0
# THIS IS A TEMPORARY FILE FOR LOGGING. DO NOT DEPLOY.
# It adds print statements to trace the data flow during import.

import pandas as pd
import io
import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import UploadFile, HTTPException
from pymongo.database import Database

from app.models.finance import InvoiceCreate, ExpenseCreate, InvoiceItem
from app.services.finance_service import FinanceService

logger = logging.getLogger(__name__)

class ParsingService:
    def __init__(self, db: Any):
        self.db = db
        self.finance_service = FinanceService(db)

    # ... (helper functions like _normalize_currency and preview_file remain the same) ...
    def _normalize_currency(self, value) -> float:
        if isinstance(value, (int, float)): return float(value)
        if not isinstance(value, str): return 0.0
        clean_val = str(value).replace('€', '').replace('$', '').strip()
        if ',' in clean_val and '.' in clean_val:
            if clean_val.find(',') > clean_val.find('.'): clean_val = clean_val.replace('.', '').replace(',', '.')
            else: clean_val = clean_val.replace(',', '')
        elif ',' in clean_val: clean_val = clean_val.replace(',', '.')
        try: return float(clean_val)
        except (ValueError, TypeError): return 0.0

    async def preview_file(self, file: UploadFile) -> Dict[str, Any]:
        try:
            contents = await file.read()
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), sep=',', engine='python', header=0)
            await file.seek(0)
            df = df.fillna("")
            headers = [str(h) for h in df.columns.tolist()]
            sample = df.head(5).astype(str).to_dict(orient='records')
            return {"filename": file.filename, "headers": headers, "sample_data": sample}
        except Exception as e:
            logger.error(f"Error previewing file: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to read file. Please ensure it is a valid CSV. Error: {str(e)}")


    async def process_import(self, file: UploadFile, user_id: str, mapping: Dict[str, str]) -> Dict[str, Any]:
        print("\n--- [PHOENIX TRACE] STARTING IMPORT PROCESS ---")
        try:
            # --- TRACE POINT 1: RAW MAPPING ---
            print(f"--- [PHOENIX TRACE] 1. Received Mapping: {mapping}")

            contents = await file.read()
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), sep=',', engine='python', header=0)
            
            # --- TRACE POINT 2: DATAFRAME HEAD ---
            print(f"--- [PHOENIX TRACE] 2. DataFrame Head:\n{df.head(2).to_string()}")

            field_to_column = {v: k for k, v in mapping.items()}
            # --- TRACE POINT 3: REVERSED MAPPING ---
            print(f"--- [PHOENIX TRACE] 3. Reversed Mapping (field -> column): {field_to_column}")

            amount_col = field_to_column.get('amount')
            if not amount_col or amount_col not in df.columns:
                print(f"--- [PHOENIX TRACE] ERROR: 'amount' column ('{amount_col}') not found in DataFrame columns: {df.columns.tolist()}")
                raise HTTPException(status_code=400, detail="Mapping for 'amount' is missing or incorrect.")

            # --- TRACE POINT 4: PROCESSING FIRST ROW ---
            print("\n--- [PHOENIX TRACE] 4. Processing First Data Row...")
            first_row = df.iloc[0]
            
            amount_val = first_row.get(field_to_column.get('amount'))
            desc_val = first_row.get(field_to_column.get('description'))
            date_val = first_row.get(field_to_column.get('date'))

            print(f"    - Raw Amount Value ('{field_to_column.get('amount')}'): {amount_val}")
            print(f"    - Raw Description Value ('{field_to_column.get('description')}'): {desc_val}")
            print(f"    - Raw Date Value ('{field_to_column.get('date')}'): {date_val}")

            normalized_amount = self._normalize_currency(amount_val)
            print(f"    - Normalized Amount: {normalized_amount}")
            
            # This part is just for the log, the real loop will process all rows
            if normalized_amount > 0:
                print("--- [PHOENIX TRACE] SUCCESS: First row seems processable.")
            else:
                print("--- [PHOENIX TRACE] WARNING: First row amount is zero or invalid.")

        except Exception as e:
            print(f"--- [PHOENIX TRACE] CRITICAL ERROR during trace: {e}")
            raise HTTPException(status_code=500, detail=f"Internal Server Error during diagnostics: {e}")

        # The rest of the function will not run for this diagnostic test.
        # We only want the log output.
        print("--- [PHOENIX TRACE] DIAGNOSTIC RUN COMPLETE. ---")
        raise HTTPException(status_code=418, detail="Diagnostic run complete. Check backend logs.")