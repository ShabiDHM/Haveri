# FILE: backend/app/services/parsing_service.py
# PHOENIX PROTOCOL - PARSING SERVICE V9.5 (CATEGORY SUPPORT FOR BANK IMPORTS)

import pandas as pd
import io
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
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

    def _normalize_currency(self, value: Union[str, float, int, None]) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        if not isinstance(value, str):
            return 0.0

        clean_val = str(value).replace('€', '').replace('$', '').strip()
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

    def _find_inventory_item_by_name(self, user_id: str, product_name: str, case_id: Optional[str] = None) -> Optional[Dict]:
        if not product_name:
            return None
        norm_name = product_name.lower().strip()
        query: Dict[str, Any] = {"$or": [{"user_id": user_id}]}
        user = self.db.users.find_one({"_id": ObjectId(user_id)})
        if user and user.get("organization_id"):
            query["$or"].append({"organization_id": str(user["organization_id"])})
        if case_id:
            query["case_id"] = case_id

        exact = self.db.inventory.find_one({**query, "name": {"$regex": f"^{norm_name}$", "$options": "i"}})
        if exact:
            return exact

        cursor = self.db.inventory.find(query)
        for item in cursor:
            inv_name = item.get("name", "").lower().strip()
            if inv_name and inv_name in norm_name:
                return item
        return None

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

    async def process_import(
        self, 
        file: UploadFile, 
        user_id: str, 
        mapping: Dict[str, str], 
        import_type: str = 'pos', 
        case_id: Optional[str] = None,
        default_category: Optional[str] = None
    ) -> Dict[str, Any]:
        contents = await file.read()
        try:
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), sep=',', engine='python', header=0, on_bad_lines='skip')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")

        imported_count = 0
        failed_count = 0

        user_doc = self.db.users.find_one({"_id": ObjectId(user_id)})
        org_id = user_doc.get("organization_id") if user_doc else None

        if import_type == 'bank':
            field_to_column = {v: k for k, v in mapping.items()}
            description_col = field_to_column.get('description')
            date_col = field_to_column.get('date')
            amount_col = field_to_column.get('amount')
            debit_col = field_to_column.get('debit')
            credit_col = field_to_column.get('credit')

            for index, row in df.iterrows():
                try:
                    description = str(row.get(description_col, ''))
                    if not description:
                        raise ValueError("Row is missing a description.")

                    date_str = row.get(date_col)
                    parsed_date = pd.to_datetime(date_str, dayfirst=False).to_pydatetime() if pd.notna(date_str) else datetime.now()

                    amount = self._normalize_currency(row.get(amount_col, 0.0))
                    debit_amount = self._normalize_currency(row.get(debit_col, 0.0))
                    credit_amount = self._normalize_currency(row.get(credit_col, 0.0))

                    final_amount = amount if amount != 0 else (debit_amount - credit_amount)
                    
                    category = default_category or "E importuar nga Banka"
                    
                    if final_amount > 0:
                        expense_data = ExpenseCreate(category=category, amount=final_amount, description=description, date=parsed_date)
                        self.finance_service.create_expense(user_id, expense_data, case_id)
                        imported_count += 1
                    elif final_amount < 0:
                        invoice_item = InvoiceItem(description=description, quantity=1, unit_price=abs(final_amount), total=abs(final_amount))
                        invoice_data = InvoiceCreate(
                            client_name=description,
                            items=[invoice_item],
                            tax_rate=0,
                            issue_date=parsed_date,
                            due_date=parsed_date + timedelta(days=30),
                            status="PAID"
                        )
                        self.finance_service.create_invoice(user_id, invoice_data, case_id)
                        imported_count += 1
                    else:
                        raise ValueError("Row has zero amount.")
                except Exception as row_error:
                    failed_count += 1
                    logger.warning(f"Skipping bank row {index}: {row_error} | Data: {row.to_dict()}")
                    continue
        else:
            field_to_column = {v: k for k, v in mapping.items()}
            amount_col = field_to_column.get('amount')
            if not amount_col or amount_col not in df.columns:
                raise HTTPException(status_code=400, detail="Mapping for 'amount' is missing or incorrect.")

            description_col = field_to_column.get('description')
            date_col = field_to_column.get('date')
            product_col = field_to_column.get('product_name')
            category_col = field_to_column.get('category')
            status_col = field_to_column.get('status')
            type_col = field_to_column.get('Tipi')

            import_errors_to_insert: List[Dict[str, Any]] = []

            for index, row in df.iterrows():
                try:
                    amount = self._normalize_currency(row.get(amount_col))
                    date_str = row.get(date_col)
                    parsed_date = pd.to_datetime(date_str, dayfirst=False).to_pydatetime() if pd.notna(date_str) else datetime.now()

                    description = str(row.get(description_col, 'Imported Item'))
                    product_name = str(row.get(product_col, description))
                    category = str(row.get(category_col, 'Të Përgjithshme'))
                    status = str(row.get(status_col, 'PAID')).strip().upper()
                    if status not in ['PAID', 'PENDING', 'OVERDUE']:
                        status = 'PAID'

                    transaction_type = 'POS'
                    if type_col and row.get(type_col):
                        transaction_type = str(row.get(type_col)).strip().upper()
                    elif amount < 0:
                        transaction_type = 'EXPENSE'

                    if 'EXPENSE' in transaction_type:
                        expense_data = ExpenseCreate(category=category, amount=abs(amount), description=description, date=parsed_date)
                        self.finance_service.create_expense(user_id, expense_data, case_id)
                        imported_count += 1

                    elif 'INVOICE' in transaction_type:
                        invoice_item = InvoiceItem(description=product_name, quantity=1, unit_price=abs(amount), total=abs(amount))
                        invoice_data = InvoiceCreate(
                            client_name=description,
                            items=[invoice_item],
                            tax_rate=0,
                            issue_date=parsed_date,
                            due_date=parsed_date + timedelta(days=30),
                            status=status,
                            notes=f"Imported from {file.filename}"
                        )
                        self.finance_service.create_invoice(user_id, invoice_data, case_id)
                        imported_count += 1

                    else:
                        inv_item = self._find_inventory_item_by_name(user_id, product_name, case_id)
                        inventory_item_id = None
                        cogs = 0.0
                        if inv_item:
                            inventory_item_id = inv_item["_id"]
                            cogs = float(inv_item.get("cost_per_unit", 0.0)) * 1.0
                        else:
                            import_errors_to_insert.append({
                                "user_id": user_id,
                                "timestamp": datetime.utcnow(),
                                "raw_product_name": product_name,
                                "reason": "No matching inventory item found",
                                "source_file": file.filename,
                                "row_index": index
                            })

                        transaction_doc: Dict[str, Any] = {
                            "user_id": str(user_id),
                            "date_time": parsed_date,
                            "amount": abs(amount),
                            "total_amount": abs(amount),
                            "product_name": product_name,
                            "description": description,
                            "quantity": 1.0,
                            "category": category,
                            "source": "IMPORT",
                            "status": status,
                            "payment_method": "CASH",
                            "inventory_item_id": inventory_item_id,
                            "cogs": cogs
                        }
                        if org_id:
                            transaction_doc["organization_id"] = org_id
                        if case_id:
                            transaction_doc["case_id"] = case_id

                        self.db.transactions.insert_one(transaction_doc)
                        imported_count += 1

                except Exception as row_error:
                    failed_count += 1
                    logger.warning(f"Skipping POS row {index}: {row_error} | Data: {row.to_dict()}")
                    continue

            if import_errors_to_insert:
                self.db.import_errors.insert_many(import_errors_to_insert)
                logger.warning(f"Logged {len(import_errors_to_insert)} missing inventory matches for user {user_id}.")

        if imported_count > 0:
            return {"status": "success", "imported_count": imported_count, "failed_count": failed_count}
        else:
            raise HTTPException(status_code=400, detail="No valid transactions could be parsed. Check column mapping and file content.")