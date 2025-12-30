# FILE: backend/app/services/parsing_service.py
# PHOENIX PROTOCOL - PARSING SERVICE V4.0 (DATA ROUTING ENGINE)
# 1. RE-ENGINEERED: Instead of saving to a generic 'transactions' collection, this service now intelligently routes data.
# 2. FIX: Reads the 'Tipi' (Type) column from the CSV.
# 3. FIX: Calls 'finance_service.create_invoice' for INVOICE/POS types.
# 4. FIX: Calls 'finance_service.create_expense' for EXPENSE types.
# 5. FIX: Correctly passes 'issue_date' and 'status' to ensure historical accuracy.

import pandas as pd
import io
import logging
from datetime import datetime
from typing import List, Dict, Any
from fastapi import UploadFile, HTTPException
from pymongo.database import Database

# PHOENIX: Import correct models and services
from app.models.finance import InvoiceCreate, ExpenseCreate, InvoiceItem
from app.services.finance_service import FinanceService

logger = logging.getLogger(__name__)

class ParsingService:
    def __init__(self, db: Any):
        self.db = db
        self.finance_service = FinanceService(db)

    def _normalize_currency(self, value) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        if not isinstance(value, str):
            return 0.0
        # This logic handles formats like "€1,234.56" or "1.234,56"
        clean_val = value.replace('€', '').replace('$', '').strip()
        if ',' in clean_val and '.' in clean_val:
            if clean_val.find(',') > clean_val.find('.'):
                clean_val = clean_val.replace('.', '').replace(',', '.')
            else:
                clean_val = clean_val.replace(',', '')
        elif ',' in clean_val:
            clean_val = clean_val.replace(',', '.')
        try:
            return float(clean_val)
        except ValueError:
            return 0.0

    async def preview_file(self, file: UploadFile) -> Dict[str, Any]:
        try:
            contents = await file.read()
            filename = file.filename or "unknown_file"
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8', sep=None, engine='python')
            await file.seek(0)
            df = df.fillna("")
            headers = df.columns.tolist()
            sample = df.head(5).astype(str).to_dict(orient='records')
            return {"filename": filename, "headers": headers, "sample_data": sample}
        except Exception as e:
            logger.error(f"Error previewing file: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    async def process_import(self, file: UploadFile, user_id: str, mapping: Dict[str, str]) -> Dict[str, Any]:
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8', sep=None, engine='python')
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")
            
        # PHOENIX: Reverse mapping to go from desired field -> csv column name
        field_to_column = {v: k for k, v in mapping.items()}

        imported_count = 0
        failed_count = 0
        
        for index, row in df.iterrows():
            try:
                # Get common fields
                amount = self._normalize_currency(row.get(field_to_column.get('amount')))
                if amount == 0.0: continue

                date_str = row.get(field_to_column.get('date'))
                parsed_date = pd.to_datetime(date_str).to_pydatetime() if date_str else datetime.now()
                
                description = str(row.get(field_to_column.get('description'), 'Imported Item'))
                product_name = str(row.get(field_to_column.get('product_name'), description))
                category = str(row.get(field_to_column.get('category'), 'Të Përgjithshme'))
                status = str(row.get(field_to_column.get('status'), 'PAID')).upper()
                transaction_type = str(row.get(field_to_column.get('Tipi', 'INVOICE'))).upper()

                # --- DATA ROUTING LOGIC ---
                if 'EXPENSE' in transaction_type:
                    # Create an Expense
                    expense_data = ExpenseCreate(
                        category=category,
                        amount=abs(amount),
                        description=description,
                        date=parsed_date,
                        currency="EUR"
                    )
                    self.finance_service.create_expense(user_id, expense_data)
                else:
                    # Create an Invoice (for both POS and INVOICE types)
                    invoice_item = InvoiceItem(
                        description=product_name,
                        quantity=1,
                        unit_price=abs(amount),
                        total=abs(amount)
                    )
                    invoice_data = InvoiceCreate(
                        client_name=description,
                        items=[invoice_item],
                        tax_rate=0, # Assuming no tax from simple CSV
                        issue_date=parsed_date,
                        status=status
                    )
                    self.finance_service.create_invoice(user_id, invoice_data)
                
                imported_count += 1

            except Exception as row_error:
                failed_count += 1
                logger.warning(f"Skipping row {index}: {row_error} | Data: {row.to_dict()}")
                continue

        if imported_count > 0:
            return {"status": "success", "imported_count": imported_count, "failed_count": failed_count}
        else:
            raise HTTPException(status_code=400, detail="No valid transactions were parsed from the file.")