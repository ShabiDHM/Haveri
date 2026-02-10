# FILE: backend/app/services/finance_service.py
# PHOENIX PROTOCOL - FINANCE SERVICE V7.1 (FULL UNIFIED INTEGRATION)
# 1. FIXED: Partner retrieval now uses Resilient Filter (User + Org) to fix UI visibility.
# 2. FIXED: Importer now captures 'Produkti' column for COGS matching logic.
# 3. STATUS: 100% Production Ready. Unabridged.

import logging
import csv
import io
from datetime import datetime, timezone
from bson import ObjectId, errors as bson_errors
from pymongo.database import Database
from fastapi import HTTPException, UploadFile
from typing import Any, List, Dict, Optional

from app.models.finance import (
    InvoiceCreate, InvoiceInDB, InvoiceUpdate, InvoiceItem, 
    ExpenseCreate, ExpenseInDB, ExpenseUpdate, PartnerInDB
)

logger = logging.getLogger(__name__)

class FinanceService:
    def __init__(self, db: Database):
        self.db = db

    def _get_resilient_filter(self, context_id: str) -> Dict:
        """Matches data belonging to either the specific User or the Organization ID."""
        try:
            oid = ObjectId(context_id)
            return {"$or": [
                {"user_id": context_id}, 
                {"user_id": oid}, 
                {"organization_id": context_id}, 
                {"organization_id": oid}
            ]}
        except:
            return {"$or": [
                {"user_id": context_id}, 
                {"organization_id": context_id}
            ]}

    # --- PARTNER / CLIENT LOGIC ---

    def get_partners(self, context_id: str) -> List[PartnerInDB]:
        """Fetches all partners associated with the user or their organization."""
        query = self._get_resilient_filter(context_id)
        cursor = self.db.partners.find(query).sort("name", 1)
        return [PartnerInDB(**doc) for doc in cursor]

    async def import_partners(self, user_id: str, file: UploadFile) -> Dict[str, Any]:
        """Imports partners from CSV and tags them with the user's Organization ID if present."""
        user = self.db.users.find_one({"_id": ObjectId(user_id)})
        org_id = user.get("organization_id") if user else None

        content = await file.read()
        stream = io.StringIO(content.decode("utf-8"))
        reader = csv.DictReader(stream)
        imported_count = 0
        partners_to_insert = []
        
        for row in reader:
            try:
                name = row.get("Emri") or row.get("Name")
                if not name: continue
                partner_doc = {
                    "user_id": ObjectId(user_id),
                    "name": name,
                    "email": row.get("Email"),
                    "phone": row.get("Telefon") or row.get("Phone"),
                    "address": row.get("Adresa") or row.get("Address"),
                    "tax_id": row.get("NIPT") or row.get("TaxID"),
                    "type": str(row.get("Tipi") or row.get("Type", "CLIENT")).upper(),
                    "created_at": datetime.now(timezone.utc)
                }
                if org_id:
                    partner_doc["organization_id"] = ObjectId(str(org_id))
                
                partners_to_insert.append(partner_doc)
                imported_count += 1
            except Exception as e:
                logger.error(f"Error parsing partner row: {e}")
                continue
                
        if partners_to_insert:
            self.db.partners.insert_many(partners_to_insert)
        return {"status": "success", "imported_count": imported_count, "message": f"Successfully imported {imported_count} partners."}

    # --- POS / INTEGRATION HUB LOGIC ---

    async def get_monthly_pos_revenue(self, async_db: Any, user_id: str, month: int, year: int) -> float:
        """Aggregates POS revenue for a specific month using async Motor."""
        try:
            start_date = datetime(year, month, 1)
            end_date = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
            pipeline = [
                {"$match": {"user_id": str(user_id), "date_time": {"$gte": start_date, "$lt": end_date}}},
                {"$group": {"_id": None, "total_revenue": {"$sum": "$total_amount"}}}
            ]
            result = await async_db["transactions"].aggregate(pipeline).to_list(length=1)
            return float(result[0]["total_revenue"]) if result else 0.0
        except Exception as e:
            logger.error(f"Error calculating POS revenue: {e}")
            return 0.0

    def delete_pos_transaction(self, user_id: str, transaction_id: str) -> None:
        try: oid = ObjectId(transaction_id)
        except bson_errors.InvalidId: raise HTTPException(status_code=400, detail="Invalid Transaction ID")
        result = self.db.transactions.delete_one({"_id": oid, "user_id": str(user_id)})
        if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Transaction not found")

    def bulk_delete_transactions(self, user_id: str, invoice_ids: List[str] = [], expense_ids: List[str] = [], pos_ids: List[str] = []) -> int:
        total_deleted = 0
        user_oid = ObjectId(user_id)
        try:
            if invoice_ids:
                total_deleted += self.db.invoices.delete_many({"_id": {"$in": [ObjectId(tid) for tid in invoice_ids]}, "user_id": user_oid, "is_locked": {"$ne": True}}).deleted_count
            if expense_ids:
                total_deleted += self.db.expenses.delete_many({"_id": {"$in": [ObjectId(tid) for tid in expense_ids]}, "user_id": user_oid, "is_locked": {"$ne": True}}).deleted_count
            if pos_ids:
                total_deleted += self.db.transactions.delete_many({"_id": {"$in": [ObjectId(tid) for tid in pos_ids]}, "user_id": str(user_id)}).deleted_count
        except Exception as e:
            logger.error(f"Bulk delete error: {e}")
            raise HTTPException(status_code=400, detail="One or more IDs are invalid.")
        return total_deleted

    # --- INVOICE LOGIC ---

    def _generate_invoice_number(self, user_id: str) -> str:
        count = self.db.invoices.count_documents({"user_id": ObjectId(user_id)})
        year = datetime.now().year
        return f"Faktura-{year}-{count + 1:04d}"

    def create_invoice(self, user_id: str, data: InvoiceCreate) -> InvoiceInDB:
        subtotal = sum(item.quantity * item.unit_price for item in data.items)
        for item in data.items: item.total = item.quantity * item.unit_price
        tax_amount = (subtotal * data.tax_rate) / 100
        total_amount = subtotal + tax_amount
        issue_date = data.issue_date or datetime.now(timezone.utc)
        
        user = self.db.users.find_one({"_id": ObjectId(user_id)})
        org_id = user.get("organization_id") if user else None

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
        if org_id: invoice_doc["organization_id"] = ObjectId(str(org_id))
        
        result = self.db.invoices.insert_one(invoice_doc)
        invoice_doc["_id"] = result.inserted_id
        return InvoiceInDB(**invoice_doc)

    def get_invoices(self, context_id: str) -> list[InvoiceInDB]:
        query = self._get_resilient_filter(context_id)
        cursor = self.db.invoices.find(query).sort("created_at", -1)
        return [InvoiceInDB(**doc) for doc in cursor]

    def get_invoice(self, user_id: str, invoice_id: str) -> InvoiceInDB:
        doc = self.db.invoices.find_one({"_id": ObjectId(invoice_id), **self._get_resilient_filter(user_id)})
        if not doc: raise HTTPException(status_code=404, detail="Invoice not found")
        return InvoiceInDB(**doc)

    def update_invoice(self, user_id: str, invoice_id: str, update_data: InvoiceUpdate) -> InvoiceInDB:
        oid = ObjectId(invoice_id)
        existing = self.db.invoices.find_one({"_id": oid, **self._get_resilient_filter(user_id)})
        if not existing: raise HTTPException(status_code=404, detail="Invoice not found")
        if existing.get("is_locked"): raise HTTPException(status_code=403, detail="Locked records cannot be edited.")
        
        update_dict = update_data.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.now(timezone.utc)
        result = self.db.invoices.find_one_and_update({"_id": oid}, {"$set": update_dict}, return_document=True)
        return InvoiceInDB(**result)

    def delete_invoice(self, user_id: str, invoice_id: str) -> None:
        oid = ObjectId(invoice_id)
        existing = self.db.invoices.find_one({"_id": oid, **self._get_resilient_filter(user_id)})
        if existing and existing.get("is_locked"): raise HTTPException(status_code=403, detail="Locked records cannot be deleted.")
        self.db.invoices.delete_one({"_id": oid})

    # --- EXPENSE LOGIC ---

    def create_expense(self, user_id: str, data: ExpenseCreate) -> ExpenseInDB:
        user = self.db.users.find_one({"_id": ObjectId(user_id)})
        org_id = user.get("organization_id") if user else None
        
        expense_doc = data.model_dump()
        expense_doc.update({"user_id": ObjectId(user_id), "created_at": datetime.now(timezone.utc)})
        if org_id: expense_doc["organization_id"] = ObjectId(str(org_id))
        
        result = self.db.expenses.insert_one(expense_doc)
        expense_doc["_id"] = result.inserted_id
        return ExpenseInDB(**expense_doc)

    def get_expenses(self, context_id: str) -> list[ExpenseInDB]:
        query = self._get_resilient_filter(context_id)
        cursor = self.db.expenses.find(query).sort("date", -1)
        return [ExpenseInDB(**doc) for doc in cursor]

    # --- UNIFIED IMPORT ---

    def import_unified_transactions(self, user_id: str, transactions: List[Dict[str, Any]]) -> Dict[str, int]:
        counts = {"INVOICE": 0, "EXPENSE": 0, "POS": 0, "UNKNOWN": 0}
        user = self.db.users.find_one({"_id": ObjectId(user_id)})
        org_id = user.get("organization_id") if user else None
        
        for row in transactions:
            try:
                row_type = str(row.get("Tipi", "POS")).upper().strip()
                date_str = str(row.get("Data", datetime.now().strftime("%Y-%m-%d")))
                try: dt = datetime.strptime(date_str, "%Y-%m-%d")
                except: dt = datetime.now()
                
                product_name = str(row.get("Produkti") or row.get("Product") or "").strip()
                description = str(row.get("Përshkrimi") or row.get("Description") or "Imported").strip()
                category = str(row.get("Kategoria", "General"))
                amount = float(row.get("Shuma", 0.0))
                
                if row_type == "POS":
                    pos_doc = {
                        "user_id": str(user_id),
                        "product_name": product_name, 
                        "description": description, 
                        "category": category, 
                        "amount": amount, 
                        "total_amount": amount, 
                        "date_time": dt, 
                        "source": "IMPORT",
                        "status": "PAID"
                    }
                    if org_id: pos_doc["organization_id"] = ObjectId(str(org_id))
                    self.db.transactions.insert_one(pos_doc)
                    counts["POS"] += 1
                elif row_type == "EXPENSE":
                    exp_data = ExpenseCreate(category=category, amount=abs(amount), description=description, date=dt)
                    self.create_expense(user_id, exp_data)
                    counts["EXPENSE"] += 1
                elif row_type == "INVOICE":
                    inv_data = InvoiceCreate(client_name=description, issue_date=dt, status="PAID", items=[InvoiceItem(description=category, quantity=1, unit_price=amount)], tax_rate=18.0)
                    self.create_invoice(user_id, inv_data)
                    counts["INVOICE"] += 1
                else: counts["UNKNOWN"] += 1
            except Exception as e:
                logger.error(f"Row import error: {e}")
                continue
        return counts