# FILE: backend/app/api/endpoints/finance.py
# PHOENIX PROTOCOL - FINANCE ENDPOINTS V13.3 (DELETE TRANSACTION)
# 1. VERIFIED: Added 'delete_transaction' endpoint.
# 2. STATUS: Production Ready.

import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import List, Annotated, Optional, Any, Dict
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo.database import Database
import pymongo 

from app.models.user import UserInDB
from app.models.finance import (
    InvoiceCreate, InvoiceOut, InvoiceUpdate, 
    ExpenseCreate, ExpenseOut, ExpenseUpdate,
    AnalyticsDashboardData, SalesTrendPoint, TopProductItem,
    CaseFinancialSummary, PosTransactionOut
)
from app.models.archive import ArchiveItemOut 
from app.services.finance_service import FinanceService
from app.services.archive_service import ArchiveService
from app.services.parsing_service import ParsingService 
from app.services import report_service
from app.api.endpoints.dependencies import get_current_user, get_db, get_async_db, get_current_active_user

router = APIRouter(tags=["Finance"])

# --- DATA IMPORT ENDPOINTS ---
@router.post("/import/preview")
async def preview_import_file(file: UploadFile = File(...), db: Database = Depends(get_db)):
    service = ParsingService(db)
    return await service.preview_file(file)

@router.post("/import/confirm")
async def confirm_import(current_user: Annotated[UserInDB, Depends(get_current_user)], file: UploadFile = File(...), mapping: str = Form(...), db: Database = Depends(get_db)):
    try: mapping_dict = json.loads(mapping)
    except Exception: raise HTTPException(status_code=400, detail="Invalid mapping format")
    service = ParsingService(db)
    return await service.process_import(file, str(current_user.id), mapping_dict)

@router.get("/import/transactions", response_model=List[PosTransactionOut])
async def get_imported_transactions(
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
    db: Any = Depends(get_async_db)
):
    """
    Retrieves all imported POS transactions for the current user.
    """
    user_id_str = str(current_user.id)
    cursor = db["transactions"].find({"user_id": user_id_str}).sort("date", pymongo.DESCENDING)
    transactions = await cursor.to_list(length=None) 
    return transactions

@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    """
    Deletes a specific POS transaction by ID.
    """
    FinanceService(db).delete_pos_transaction(str(current_user.id), transaction_id)

# --- ANALYTICS ENDPOINTS ---
@router.get("/case-summary", response_model=List[CaseFinancialSummary])
async def get_case_financial_summaries(current_user: Annotated[UserInDB, Depends(get_current_active_user)], db: Any = Depends(get_async_db)):
    user_oid = ObjectId(current_user.id)
    invoice_pipeline = [{"$match": {"user_id": user_oid, "status": {"$ne": "CANCELLED"}, "related_case_id": {"$exists": True, "$ne": None}}}, {"$group": {"_id": "$related_case_id", "total_billed": {"$sum": "$total_amount"}}}]
    expense_pipeline = [{"$match": {"user_id": user_oid, "related_case_id": {"$exists": True, "$ne": None}}}, {"$group": {"_id": "$related_case_id", "total_expenses": {"$sum": "$amount"}}}]
    billed_data, expense_data = await asyncio.gather(db["invoices"].aggregate(invoice_pipeline).to_list(length=None), db["expenses"].aggregate(expense_pipeline).to_list(length=None))
    billed_map = {item['_id']: item['total_billed'] for item in billed_data}
    expense_map = {item['_id']: item['total_expenses'] for item in expense_data}
    all_case_ids = set(billed_map.keys()) | set(expense_map.keys())
    if not all_case_ids: return []
    case_oids = [ObjectId(cid) for cid in all_case_ids if ObjectId.is_valid(cid)]
    cases = await db["cases"].find({"_id": {"$in": case_oids}}, {"title": 1, "case_number": 1}).to_list(length=len(case_oids))
    case_map = {str(c["_id"]): c for c in cases}
    summaries = []
    for case_id in all_case_ids:
        if case_id in case_map:
            billed = billed_map.get(case_id, 0.0)
            expenses = expense_map.get(case_id, 0.0)
            summaries.append(CaseFinancialSummary(case_id=case_id, case_title=case_map[case_id].get("title", "Pa Titull"), case_number=case_map[case_id].get("case_number", ""), total_billed=billed, total_expenses=expenses, net_balance=billed - expenses))
    return sorted(summaries, key=lambda s: s.total_billed, reverse=True)

@router.get("/analytics/dashboard", response_model=AnalyticsDashboardData)
async def get_analytics_dashboard(
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
    db: Any = Depends(get_async_db),
    days: int = 30
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    user_oid = ObjectId(current_user.id)

    # 1. Manual Invoices (Profit = Revenue for services)
    inv_pipeline = [
        {"$match": {"user_id": user_oid, "issue_date": {"$gte": start_date, "$lte": end_date}, "status": {"$ne": "CANCELLED"}}},
        {"$unwind": "$items"},
        {"$project": {"date": "$issue_date", "amount": {"$multiply": ["$items.quantity", "$items.unit_price"]}, "product": "$items.description", "quantity": "$items.quantity"}}
    ]
    # 2. Manual Expenses (Negative impact)
    exp_pipeline = [
        {"$match": {"user_id": user_oid, "date": {"$gte": start_date, "$lte": end_date}}},
        {"$project": {"date": "$date", "amount": {"$multiply": ["$amount", -1]}}}
    ]
    # 3. POS Transactions (Includes 'net_profit' field from inventory engine)
    pos_pipeline = [
        {"$match": {"user_id": str(user_oid), "date": {"$gte": start_date, "$lte": end_date}}},
        {"$project": {
            "date": "$date", 
            "amount": "$amount", 
            "net_profit": "$net_profit", # Fetch real profit
            "product": "$description", 
            "quantity": "$quantity"
        }}
    ]
    
    inv_data, exp_data, pos_data = await asyncio.gather(
        db["invoices"].aggregate(inv_pipeline).to_list(length=None),
        db["expenses"].aggregate(exp_pipeline).to_list(length=None),
        db["transactions"].aggregate(pos_pipeline).to_list(length=None)
    )
    
    # --- PROFIT CALCULATION ENGINE ---
    inv_revenue = sum(item['amount'] for item in inv_data)
    pos_revenue = sum(item['amount'] for item in pos_data)
    pos_profit = sum(item.get('net_profit', item['amount']) for item in pos_data)
    expenses_total = sum(item['amount'] for item in exp_data) # This is negative
    total_revenue = inv_revenue + pos_revenue
    total_count = len(inv_data) + len(pos_data)
    total_net_profit = inv_revenue + pos_profit + expenses_total

    # --- Trend & Product Logic ---
    all_income = inv_data + pos_data 
    trend_map: Dict[str, float] = {}
    product_map: Dict[str, Dict[str, float]] = {}

    for item in all_income:
        d = item["date"]
        if isinstance(d, str): d = datetime.fromisoformat(d)
        date_key = d.strftime("%Y-%m-%d")
        trend_map[date_key] = trend_map.get(date_key, 0.0) + item['amount']
        
        prod_name = item.get("product", "Shërbim")
        if prod_name not in product_map: product_map[prod_name] = {"qty": 0, "rev": 0.0}
        product_map[prod_name]["qty"] += item.get('quantity', 0)
        product_map[prod_name]["rev"] += item['amount']

    for exp in exp_data:
        d = exp["date"]
        if isinstance(d, str): d = datetime.fromisoformat(d)
        date_key = d.strftime("%Y-%m-%d")
        trend_map[date_key] = trend_map.get(date_key, 0.0) + exp['amount']

    sales_trend = [SalesTrendPoint(date=k, amount=round(v, 2)) for k, v in sorted(trend_map.items())]
    sorted_products = sorted(product_map.items(), key=lambda i: i[1]['rev'], reverse=True)[:5]
    top_products = [TopProductItem(product_name=k, total_quantity=v['qty'], total_revenue=round(v['rev'], 2)) for k, v in sorted_products]

    return AnalyticsDashboardData(
        total_revenue_period=round(total_revenue, 2),
        total_transactions_period=total_count,
        sales_trend=sales_trend,
        top_products=top_products,
        total_profit_period=round(total_net_profit, 2)
    )

# --- INVOICES ---
@router.get("/invoices", response_model=List[InvoiceOut])
def get_invoices(current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).get_invoices(str(current_user.id))

@router.post("/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(invoice_in: InvoiceCreate, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).create_invoice(str(current_user.id), invoice_in)

@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice_details(invoice_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).get_invoice(str(current_user.id), invoice_id)

@router.put("/invoices/{invoice_id}", response_model=InvoiceOut)
def update_invoice(invoice_id: str, invoice_update: InvoiceUpdate, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).update_invoice(str(current_user.id), invoice_id, invoice_update)

@router.put("/invoices/{invoice_id}/status", response_model=InvoiceOut)
def update_invoice_status(invoice_id: str, status_update: InvoiceUpdate, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    if not status_update.status: raise HTTPException(status_code=400, detail="Status is required")
    return FinanceService(db).update_invoice_status(str(current_user.id), invoice_id, status_update.status)

@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(invoice_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    FinanceService(db).delete_invoice(str(current_user.id), invoice_id)

@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db), lang: Optional[str] = Query("sq")):
    service = FinanceService(db)
    invoice = service.get_invoice(str(current_user.id), invoice_id)
    pdf_buffer = report_service.generate_invoice_pdf(invoice, db, str(current_user.id), lang=lang or "sq")
    filename = f"Invoice_{invoice.invoice_number}.pdf"
    headers = {'Content-Disposition': f'inline; filename="{filename}"'}
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)

@router.post("/invoices/{invoice_id}/archive", response_model=ArchiveItemOut)
async def archive_invoice(invoice_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db), case_id: Optional[str] = Query(None), lang: Optional[str] = Query("sq")):
    finance_service = FinanceService(db)
    archive_service = ArchiveService(db)
    invoice = finance_service.get_invoice(str(current_user.id), invoice_id)
    pdf_buffer = report_service.generate_invoice_pdf(invoice, db, str(current_user.id), lang=lang or "sq")
    pdf_content = pdf_buffer.getvalue()
    filename = f"Invoice_{invoice.invoice_number}.pdf"
    title = f"Fatura #{invoice.invoice_number} - {invoice.client_name}"
    archived_item = await archive_service.save_generated_file(user_id=str(current_user.id), filename=filename, content=pdf_content, category="INVOICE", title=title, case_id=case_id)
    return archived_item

# --- EXPENSES ---
@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(expense_in: ExpenseCreate, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).create_expense(str(current_user.id), expense_in)

@router.get("/expenses", response_model=List[ExpenseOut])
def get_expenses(current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).get_expenses(str(current_user.id))

@router.put("/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: str, expense_update: ExpenseUpdate, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).update_expense(str(current_user.id), expense_id, expense_update)

@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    FinanceService(db).delete_expense(str(current_user.id), expense_id)

@router.put("/expenses/{expense_id}/receipt", status_code=status.HTTP_200_OK)
def upload_expense_receipt(expense_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], file: UploadFile = File(...), db: Database = Depends(get_db)):
    service = FinanceService(db)
    storage_key = service.upload_expense_receipt(str(current_user.id), expense_id, file)
    return {"status": "success", "storage_key": storage_key}