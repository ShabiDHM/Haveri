# FILE: backend/app/services/finance_service.py
# PHOENIX PROTOCOL - FINANCE SERVICE V6.2 (SAFE LOGGING)
# 1. FIX: Switched from 'structlog' to standard 'logging' to prevent import errors if structlog is missing.
# 2. LOGIC: Maintained the Unified Import Router logic.

import logging
from datetime import datetime, timezone
from bson import ObjectId
from pymongo.database import Database
from fastapi import HTTPException, UploadFile
from typing import Any, List, Dict

from app.models.finance import (
    InvoiceCreate, InvoiceInDB, InvoiceUpdate, InvoiceItem, 
    ExpenseCreate, ExpenseInDB, ExpenseUpdate
)

logger = logging.getLogger(__name__)

class FinanceService:
    def __init__(self, db: Database):
        self.db = db

    # --- POS / INTEGRATION HUB LOGIC ---
    async def get_monthly_pos_revenue(self, async_db: Any, user_id: str, month: int, year: int) -> float:
        try:
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)

            pipeline = [
                {
                    "$match": {
                        "user_id": ObjectId(user_id),
                        "date_time": {
                            "$gte": start_date,
                            "$lt": end_date
                        }
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total_revenue": {"$sum": "$total_amount"}
                    }
                }
            ]

            result = await async_db["transactions"].aggregate(pipeline).to_list(length=1)
            if result:
                return float(result[0]["total_revenue"])
            return 0.0
        except Exception as e:
            logger.error(f"Error calculating POS revenue: {e}")
            return 0.0

    def delete_pos_transaction(self, user_id: str, transaction_id: str) -> None:
        try:
            oid = ObjectId(transaction_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid Transaction ID")
        
        result = self.db.transactions.delete_one({"_id": oid, "user_id": str(user_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")

    # --- INVOICE LOGIC ---
    def _generate_invoice_number(self, user_id: str) -> str:
        count = self.db.invoices.count_documents({"user_id": ObjectId(user_id)})
        year = datetime.now().year
        return f"Faktura-{year}-{count + 1:04d}"

    def create_invoice(self, user_id: str, data: InvoiceCreate) -> InvoiceInDB:
        subtotal = sum(item.quantity * item.unit_price for item in data.items)
        for item in data.items:
            item.total = item.quantity * item.unit_price
        tax_amount = (subtotal * data.tax_rate) / 100
        total_amount = subtotal + tax_amount
        
        issue_date = data.issue_date or datetime.now(timezone.utc)
        
        invoice_doc = data.model_dump()
        invoice_doc.update({
            "user_id": ObjectId(user_id),
            "invoice_number": self._generate_invoice_number(user_id),
            "issue_date": issue_date,
            "due_date": data.due_date or issue_date,
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "total_amount": total_amount,
            "status": data.status or "DRAFT",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        
        result = self.db.invoices.insert_one(invoice_doc)
        invoice_doc["_id"] = result.inserted_id
        return InvoiceInDB(**invoice_doc)

    def get_invoices(self, user_id: str) -> list[InvoiceInDB]:
        cursor = self.db.invoices.find({"user_id": ObjectId(user_id)}).sort("created_at", -1)
        return [InvoiceInDB(**doc) for doc in cursor]

    def get_invoice(self, user_id: str, invoice_id: str) -> InvoiceInDB:
        try: oid = ObjectId(invoice_id)
        except: raise HTTPException(status_code=400, detail="Invalid Invoice ID")
        doc = self.db.invoices.find_one({"_id": oid, "user_id": ObjectId(user_id)})
        if not doc: raise HTTPException(status_code=404, detail="Invoice not found")
        return InvoiceInDB(**doc)

    def update_invoice(self, user_id: str, invoice_id: str, update_data: InvoiceUpdate) -> InvoiceInDB:
        try: oid = ObjectId(invoice_id)
        except: raise HTTPException(status_code=400, detail="Invalid Invoice ID")
        
        existing = self.db.invoices.find_one({"_id": oid, "user_id": ObjectId(user_id)})
        if not existing: raise HTTPException(status_code=404, detail="Invoice not found")
        if existing.get("is_locked"): raise HTTPException(status_code=403, detail="Cannot edit a locked/closed invoice.")

        update_dict = update_data.model_dump(exclude_unset=True)
        
        if "items" in update_dict or "tax_rate" in update_dict:
            items_data = update_dict.get("items", existing["items"])
            tax_rate = update_dict.get("tax_rate", existing["tax_rate"])
            subtotal = 0.0
            new_items = []
            for item in items_data:
                q = item["quantity"] if isinstance(item, dict) else item.quantity
                p = item["unit_price"] if isinstance(item, dict) else item.unit_price
                row_total = q * p
                subtotal += row_total
                item_dict = item if isinstance(item, dict) else item.model_dump()
                item_dict["total"] = row_total
                new_items.append(item_dict)
            
            tax_amount = (subtotal * tax_rate) / 100
            total_amount = subtotal + tax_amount
            update_dict.update({"items": new_items, "subtotal": subtotal, "tax_amount": tax_amount, "total_amount": total_amount})

        update_dict["updated_at"] = datetime.now(timezone.utc)
        result = self.db.invoices.find_one_and_update({"_id": oid}, {"$set": update_dict}, return_document=True)
        return InvoiceInDB(**result)

    def update_invoice_status(self, user_id: str, invoice_id: str, status: str) -> InvoiceInDB:
        try: oid = ObjectId(invoice_id)
        except: raise HTTPException(status_code=400, detail="Invalid Invoice ID")
        result = self.db.invoices.find_one_and_update(
            {"_id": oid, "user_id": ObjectId(user_id)},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}},
            return_document=True
        )
        if not result: raise HTTPException(status_code=404, detail="Invoice not found")
        return InvoiceInDB(**result)

    def delete_invoice(self, user_id: str, invoice_id: str) -> None:
        try: oid = ObjectId(invoice_id)
        except: raise HTTPException(status_code=400, detail="Invalid Invoice ID")
        existing = self.db.invoices.find_one({"_id": oid, "user_id": ObjectId(user_id)})
        if existing and existing.get("is_locked"): raise HTTPException(status_code=403, detail="Cannot delete a locked/closed invoice.")
        result = self.db.invoices.delete_one({"_id": oid, "user_id": ObjectId(user_id)})
        if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Invoice not found")

    # --- EXPENSE LOGIC ---
    def create_expense(self, user_id: str, data: ExpenseCreate) -> ExpenseInDB:
        expense_doc = data.model_dump()
        expense_doc.update({
            "user_id": ObjectId(user_id),
            "created_at": datetime.now(timezone.utc),
            "receipt_url": None
        })
        result = self.db.expenses.insert_one(expense_doc)
        expense_doc["_id"] = result.inserted_id
        return ExpenseInDB(**expense_doc)

    def get_expenses(self, user_id: str) -> list[ExpenseInDB]:
        cursor = self.db.expenses.find({"user_id": ObjectId(user_id)}).sort("date", -1)
        return [ExpenseInDB(**doc) for doc in cursor]

    def update_expense(self, user_id: str, expense_id: str, update_data: ExpenseUpdate) -> ExpenseInDB:
        try: oid = ObjectId(expense_id)
        except: raise HTTPException(status_code=400, detail="Invalid Expense ID")
        existing = self.db.expenses.find_one({"_id": oid, "user_id": ObjectId(user_id)})
        if not existing: raise HTTPException(status_code=404, detail="Expense not found")
        if existing.get("is_locked"): raise HTTPException(status_code=403, detail="Cannot edit a locked expense.")

        update_dict = update_data.model_dump(exclude_unset=True)
        result = self.db.expenses.find_one_and_update({"_id": oid}, {"$set": update_dict}, return_document=True)
        return ExpenseInDB(**result)

    def delete_expense(self, user_id: str, expense_id: str) -> None:
        try: oid = ObjectId(expense_id)
        except: raise HTTPException(status_code=400, detail="Invalid Expense ID")
        existing = self.db.expenses.find_one({"_id": oid, "user_id": ObjectId(user_id)})
        if existing and existing.get("is_locked"): raise HTTPException(status_code=403, detail="Cannot delete a locked expense.")
        result = self.db.expenses.delete_one({"_id": oid, "user_id": ObjectId(user_id)})
        if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Expense not found")

    def upload_expense_receipt(self, user_id: str, expense_id: str, file: UploadFile) -> str:
        try: oid = ObjectId(expense_id)
        except: raise HTTPException(status_code=400, detail="Invalid Expense ID")
        expense = self.db.expenses.find_one({"_id": oid, "user_id": ObjectId(user_id)})
        if not expense: raise HTTPException(status_code=404, detail="Expense not found")
        
        from app.services.storage_service import upload_file_raw
        
        folder = f"expenses/{user_id}"
        storage_key = upload_file_raw(file, folder)
        self.db.expenses.update_one({"_id": oid}, {"$set": {"receipt_url": storage_key}})
        return storage_key

    # --- PHOENIX: UNIFIED IMPORT ROUTER ---
    def import_unified_transactions(self, user_id: str, transactions: List[Dict[str, Any]]) -> Dict[str, int]:
        counts = {"INVOICE": 0, "EXPENSE": 0, "POS": 0, "UNKNOWN": 0}
        
        for row in transactions:
            try:
                row_type = str(row.get("Tipi", "POS")).upper().strip()
                date_str = str(row.get("Data", datetime.now().strftime("%Y-%m-%d")))
                try: dt = datetime.strptime(date_str, "%Y-%m-%d")
                except: dt = datetime.now()
                
                description = str(row.get("Përshkrimi", "Imported Item"))
                category = str(row.get("Kategoria", "General"))
                amount = float(row.get("Shuma", 0.0))
                status = str(row.get("Statusi", "PAID")).upper()
                
                if row_type == "INVOICE":
                    inv_in = InvoiceCreate(
                        client_name=description, 
                        issue_date=dt,
                        status=status,
                        items=[InvoiceItem(description=category, quantity=1, unit_price=amount)],
                        tax_rate=18.0
                    )
                    self.create_invoice(user_id, inv_in)
                    counts["INVOICE"] += 1
                    
                elif row_type == "EXPENSE":
                    exp_in = ExpenseCreate(
                        category=category,
                        amount=abs(amount),
                        description=description,
                        date=dt
                    )
                    self.create_expense(user_id, exp_in)
                    counts["EXPENSE"] += 1
                    
                elif row_type == "POS":
                    pos_doc = {
                        "user_id": str(user_id), 
                        "description": description,
                        "category": category,
                        "amount": amount,
                        "total_amount": amount,
                        "date_time": dt,
                        "payment_method": "CASH", 
                        "status": status,
                        "source": "IMPORT"
                    }
                    self.db.transactions.insert_one(pos_doc)
                    counts["POS"] += 1
                else:
                    counts["UNKNOWN"] += 1

            except Exception as e:
                logger.error(f"Import Error on row {row}: {e}")
                counts["UNKNOWN"] += 1
                continue
                
        return counts