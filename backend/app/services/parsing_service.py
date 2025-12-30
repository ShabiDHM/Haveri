# FILE: backend/app/services/parsing_service.py
# PHOENIX PROTOCOL - PARSING SERVICE V5.0 (ROBUST MAPPING FIX)
# 1. FIX: The service now correctly uses the user-provided mapping to find columns like 'Shuma' and 'Përshkrimi'.
# 2. FIX: Resolves the '€0.00' and 'Imported Transaction' bug by correctly extracting data from the CSV.
# 3. ROBUSTNESS: This version is now fully language-agnostic for CSV headers.

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

    def _normalize_currency(self, value) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        if not isinstance(value, str):
            return 0.0
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
        except (ValueError, TypeError):
            return 0.0

    async def preview_file(self, file: UploadFile) -> Dict[str, Any]:
        try:
            contents = await file.read()
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8', sep=None, engine='python', header=0)
            await file.seek(0)
            df = df.fillna("")
            headers = df.columns.tolist()
            sample = df.head(5).astype(str).to_dict(orient='records')
            return {"filename": file.filename, "headers": headers, "sample_data": sample}
        except Exception as e:
            logger.error(f"Error previewing file: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    async def process_import(self, file: UploadFile, user_id: str, mapping: Dict[str, str]) -> Dict[str, Any]:
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8', sep=None, engine='python', header=0)
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")
            
        imported_count = 0
        failed_count = 0
        
        # PHOENIX FIX: Create a reverse map to find CSV header from standard field name
        # e.g., {'amount': 'Shuma', 'description': 'Përshkrimi'}
        field_to_column = {v: k for k, v in mapping.items()}

        for index, row in df.iterrows():
            try:
                # Use the reverse map to find the correct column name (e.g., 'Shuma')
                amount_col = field_to_column.get('amount')
                description_col = field_to_column.get('description')
                date_col = field_to_column.get('date')
                product_col = field_to_column.get('product_name')
                category_col = field_to_column.get('category')
                status_col = field_to_column.get('status')
                type_col = field_to_column.get('Tipi') # 'Tipi' is what frontend sends

                amount = self._normalize_currency(row.get(amount_col))
                if amount == 0.0:
                    failed_count += 1
                    continue

                date_str = row.get(date_col)
                parsed_date = pd.to_datetime(date_str, dayfirst=True).to_pydatetime() if pd.notna(date_str) else datetime.now()
                
                description = str(row.get(description_col, 'Imported Item'))
                product_name = str(row.get(product_col, description))
                category = str(row.get(category_col, 'Të Përgjithshme'))
                status = str(row.get(status_col, 'PAID')).strip().upper()
                transaction_type = str(row.get(type_col, 'INVOICE')).strip().upper()

                if 'EXPENSE' in transaction_type:
                    expense_data = ExpenseCreate(
                        category=category,
                        amount=abs(amount),
                        description=description,
                        date=parsed_date,
                        currency="EUR"
                    )
                    self.finance_service.create_expense(user_id, expense_data)
                else:
                    invoice_item = InvoiceItem(
                        description=product_name,
                        quantity=1,
                        unit_price=abs(amount),
                        total=abs(amount)
                    )
                    invoice_data = InvoiceCreate(
                        client_name=description,
                        items=[invoice_item],
                        tax_rate=0,
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