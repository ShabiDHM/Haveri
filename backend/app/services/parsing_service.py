# FILE: backend/app/services/parsing_service.py
# PHOENIX PROTOCOL - PARSING SERVICE V8.1 (SYNTAX CORRECTION)
# 1. FIXED: Corrected indentation inconsistencies that caused Pylance import errors.
# 2. LOGIC: Retains the V8.0 fix for populating the 'transactions' collection for POS analytics.
# 3. STATUS: Validated structure.

import pandas as pd
import io
import logging
from datetime import datetime
from typing import Dict, Any, List
from fastapi import UploadFile, HTTPException
from pymongo.database import Database
from bson import ObjectId

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
        
        clean_val = str(value).replace('€', '').replace('$', '').strip()
        if ',' in clean_val and '.' in clean_val:
            # European format (1.200,00) vs US (1,200.00) heuristic
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
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), sep=',', engine='python', header=0, on_bad_lines='skip')
            await file.seek(0)
            df = df.fillna("")
            headers = [str(h) for h in df.columns.tolist()]
            sample = df.head(5).astype(str).to_dict(orient='records')
            return {"filename": file.filename, "headers": headers, "sample_data": sample}
        except Exception as e:
            logger.error(f"Error previewing file: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to read file. Please ensure it is a valid CSV. Error: {str(e)}")

    def _process_bank_statement_row(self, user_id: str, row: pd.Series, mapping: Dict[str, str]):
        field_to_column = {v: k for k, v in mapping.items()}
        
        description_col = field_to_column.get('description')
        date_col = field_to_column.get('date')
        debit_col = field_to_column.get('debit')
        credit_col = field_to_column.get('credit')

        description = str(row.get(description_col, ''))
        if not description:
            raise ValueError("Row is missing a description.")

        date_str = row.get(date_col)
        parsed_date = pd.to_datetime(date_str, dayfirst=False).to_pydatetime() if pd.notna(date_str) else datetime.now()

        debit_amount = self._normalize_currency(row.get(debit_col, 0.0))
        credit_amount = self._normalize_currency(row.get(credit_col, 0.0))

        if debit_amount > 0:
            expense_data = ExpenseCreate(category="E importuar nga Banka", amount=debit_amount, description=description, date=parsed_date)
            self.finance_service.create_expense(user_id, expense_data)
        elif credit_amount > 0:
            invoice_item = InvoiceItem(description="Të hyra nga banka", quantity=1, unit_price=credit_amount, total=credit_amount)
            invoice_data = InvoiceCreate(client_name=description, items=[invoice_item], tax_rate=0, issue_date=parsed_date, status="PAID")
            self.finance_service.create_invoice(user_id, invoice_data)
        else:
            raise ValueError("Row has neither a valid debit nor credit amount.")

    async def process_import(self, file: UploadFile, user_id: str, mapping: Dict[str, str], import_type: str = 'pos') -> Dict[str, Any]:
        contents = await file.read()
        try:
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), sep=',', engine='python', header=0, on_bad_lines='skip')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")
            
        imported_count = 0
        failed_count = 0
        
        # Get Organization ID if available for context
        user_doc = self.db.users.find_one({"_id": ObjectId(user_id)})
        org_id = user_doc.get("organization_id") if user_doc else None

        if import_type == 'bank':
            for index, row in df.iterrows():
                try:
                    self._process_bank_statement_row(user_id, row, mapping)
                    imported_count += 1
                except Exception as row_error:
                    failed_count += 1
                    logger.warning(f"Skipping bank row {index}: {row_error} | Data: {row.to_dict()}")
                    continue
        else: 
            # LOGIC FOR POS / GENERAL IMPORT
            field_to_column = {v: k for k, v in mapping.items()}
            amount_col = field_to_column.get('amount')
            if not amount_col or amount_col not in df.columns:
                raise HTTPException(status_code=400, detail="Mapping for 'amount' ('Shuma') is missing or incorrect.")

            description_col = field_to_column.get('description')
            date_col = field_to_column.get('date')
            product_col = field_to_column.get('product_name')
            category_col = field_to_column.get('category')
            status_col = field_to_column.get('status')
            
            # If explicit 'Tipi' is mapped, use it. Otherwise assume based on context.
            type_col = field_to_column.get('Tipi')

            transactions_to_insert: List[Dict] = []

            for index, row in df.iterrows():
                try:
                    amount = self._normalize_currency(row.get(amount_col))
                    date_str = row.get(date_col)
                    parsed_date = pd.to_datetime(date_str, dayfirst=False).to_pydatetime() if pd.notna(date_str) else datetime.now()
                    
                    description = str(row.get(description_col, 'Imported Item'))
                    # Critical: Use product_name if mapped, otherwise fallback to description
                    product_name = str(row.get(product_col, description))
                    
                    category = str(row.get(category_col, 'Të Përgjithshme'))
                    status = str(row.get(status_col, 'PAID')).strip().upper()
                    
                    # Determine Transaction Type
                    transaction_type = 'POS' # Default
                    if type_col and row.get(type_col):
                        transaction_type = str(row.get(type_col)).strip().upper()
                    elif amount < 0:
                        transaction_type = 'EXPENSE'
                    
                    # LOGIC BRANCHING
                    if 'EXPENSE' in transaction_type:
                        expense_data = ExpenseCreate(category=category, amount=abs(amount), description=description, date=parsed_date)
                        self.finance_service.create_expense(user_id, expense_data)
                        imported_count += 1
                    
                    elif 'INVOICE' in transaction_type:
                        # Explicitly marked as Invoice (e.g., B2B sale)
                        invoice_item = InvoiceItem(description=product_name, quantity=1, unit_price=abs(amount), total=abs(amount))
                        invoice_data = InvoiceCreate(client_name=description, items=[invoice_item], tax_rate=0, issue_date=parsed_date, status=status)
                        self.finance_service.create_invoice(user_id, invoice_data)
                        imported_count += 1

                    else:
                        # POS / RETAIL TRANSACTION (The Fix)
                        # We insert directly into 'transactions' collection for AnalyticsService to pick up.
                        transaction_doc = {
                            "user_id": str(user_id),
                            "date": parsed_date,
                            "amount": abs(amount),
                            "total_amount": abs(amount),
                            "product_name": product_name,
                            "description": description,
                            "quantity": 1.0, # Default to 1 if not mapped
                            "category": category,
                            "source": "IMPORT",
                            "status": status,
                            "payment_method": "CASH" # Default
                        }
                        if org_id:
                            transaction_doc["organization_id"] = org_id
                        
                        transactions_to_insert.append(transaction_doc)
                        imported_count += 1

                except Exception as row_error:
                    failed_count += 1
                    logger.warning(f"Skipping POS row {index}: {row_error} | Data: {row.to_dict()}")
                    continue

            # Bulk insert transactions if any
            if transactions_to_insert:
                self.db.transactions.insert_many(transactions_to_insert)

        if imported_count > 0:
            return {"status": "success", "imported_count": imported_count, "failed_count": failed_count}
        else:
            raise HTTPException(status_code=400, detail="No valid transactions could be parsed. Check column mapping and file content.")