# FILE: backend/app/api/endpoints/finance.py
# PHOENIX PROTOCOL - FINANCE ENDPOINTS V16.8 (FINAL DASHBOARD ROUTE RE-INTEGRATION)
# 1. CRITICAL FIX: Re-integrated GET /analytics/dashboard route into the finance_router structure to satisfy client call /api/v1/finance/analytics/dashboard.
# 2. STATUS: Unabridged. Addressing all outstanding routing errors.

import json
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import List, Annotated, Optional, Any
from pymongo.database import Database
import pymongo 
from pydantic import BaseModel

from app.models.user import UserInDB
from app.models.finance import (
    InvoiceCreate, InvoiceOut, InvoiceUpdate, 
    ExpenseCreate, ExpenseOut, ExpenseUpdate,
    AnalyticsDashboardData, CaseFinancialSummary, PosTransactionOut, 
    InvoiceInDB, PartnerOut, PartnerUpdate
)
from app.models.archive import ArchiveItemOut 
from app.services.finance_service import FinanceService
from app.services.archive_service import ArchiveService
from app.services.parsing_service import ParsingService 
from app.services.graph_service import GraphService
from app.services import report_service
from app.services.analytics_service import AnalyticsService
from app.api.endpoints.dependencies import get_current_user, get_db, get_async_db, get_current_active_user

router = APIRouter(tags=["Finance"])

class BulkDeleteRequest(BaseModel):
    invoice_ids: Optional[List[str]] = []
    expense_ids: Optional[List[str]] = []
    pos_ids: Optional[List[str]] = []

# --- PARTNER / CLIENT ENDPOINTS ---

@router.get("/partners", response_model=List[PartnerOut])
def get_partners(current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    """Fetches all clients and suppliers for the current context."""
    return FinanceService(db).get_partners(str(current_user.id))

@router.put("/partners/{partner_id}", response_model=PartnerOut)
def update_partner(
    partner_id: str,
    partner_update: PartnerUpdate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    """Updates specific partner details (name, NIPT, contact info)."""
    return FinanceService(db).update_partner(str(current_user.id), partner_id, partner_update)

@router.delete("/partners/{partner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_partner(
    partner_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    """Removes a partner from the database."""
    FinanceService(db).delete_partner(str(current_user.id), partner_id)

# --- DATA IMPORT & POS ENDPOINTS ---

@router.post("/import/preview")
async def preview_import_file(file: UploadFile = File(...), db: Database = Depends(get_db)):
    """Provides a JSON preview of CSV/Excel data before processing."""
    service = ParsingService(db)
    return await service.preview_file(file)

@router.post("/import/confirm")
async def confirm_import(
    current_user: Annotated[UserInDB, Depends(get_current_user)], 
    file: UploadFile = File(...), 
    mapping: str = Form(...), 
    importType: str = Form('pos'),
    db: Database = Depends(get_db)
):
    """Finalizes data import using user-defined column mapping."""
    try: 
        mapping_dict = json.loads(mapping)
    except Exception: 
        raise HTTPException(status_code=400, detail="Invalid mapping format")
    
    service = ParsingService(db)
    return await service.process_import(file, str(current_user.id), mapping_dict, import_type=importType)

@router.post("/import/clients")
async def import_clients(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Database = Depends(get_db)
):
    """Specialized bulk importer for Partners."""
    return await FinanceService(db).import_partners(str(current_user.id), file)

@router.get("/import/transactions", response_model=List[PosTransactionOut])
async def get_imported_transactions(
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
    db: Any = Depends(get_async_db)
):
    """Retrieves raw transactions stored in the operational collection."""
    user_id_str = str(current_user.id)
    cursor = db["transactions"].find({"user_id": user_id_str}).sort("date", pymongo.DESCENDING)
    transactions = await cursor.to_list(length=None) 
    return transactions

@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends()
):
    """Deletes a single POS/Bank transaction and syncs with the Graph DB."""
    FinanceService(db).delete_pos_transaction(str(current_user.id), transaction_id)
    try:
        graph_service.delete_node(transaction_id) 
    except:
        pass

@router.post("/transactions/bulk-delete", status_code=status.HTTP_200_OK)
def bulk_delete_transactions(
    request: BulkDeleteRequest,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends()
):
    """Performs massive cleanup of invoices, expenses, or POS records."""
    service = FinanceService(db)
    deleted_count = service.bulk_delete_transactions(
        user_id=str(current_user.id), 
        invoice_ids=request.invoice_ids or [],
        expense_ids=request.expense_ids or [],
        pos_ids=request.pos_ids or []
    )
    
    try:
        if request.invoice_ids:
            for iid in request.invoice_ids: graph_service.delete_node(iid)
        if request.expense_ids:
            for eid in request.expense_ids: graph_service.delete_node(eid)
    except:
        pass

    return {"status": "success", "deleted_count": deleted_count}


# --- INVOICES (Sales Management) ---

@router.get("/invoices", response_model=List[InvoiceOut])
def get_invoices(current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).get_invoices(str(current_user.id))

@router.post("/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_in: InvoiceCreate, 
    current_user: Annotated[UserInDB, Depends(get_current_user)], 
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends()
):
    new_invoice_db: InvoiceInDB = FinanceService(db).create_invoice(str(current_user.id), invoice_in)
    try:
        graph_service.add_or_update_client_and_invoice(new_invoice_db)
    except:
        pass
    return new_invoice_db

@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice_details(invoice_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).get_invoice(str(current_user.id), invoice_id)

@router.put("/invoices/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: str, 
    invoice_update: InvoiceUpdate, 
    current_user: Annotated[UserInDB, Depends(get_current_user)], 
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends()
):
    updated_invoice_db = FinanceService(db).update_invoice(str(current_user.id), invoice_id, invoice_update)
    try:
        graph_service.add_or_update_client_and_invoice(updated_invoice_db)
    except:
        pass
    return updated_invoice_db

@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: str, 
    current_user: Annotated[UserInDB, Depends(get_current_user)], 
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends()
):
    FinanceService(db).delete_invoice(str(current_user.id), invoice_id)
    try:
        graph_service.delete_node(invoice_id)
    except:
        pass

@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db), lang: Optional[str] = Query("sq")):
    """Generates and streams a PDF for download."""
    service = FinanceService(db)
    invoice = service.get_invoice(str(current_user.id), invoice_id)
    pdf_buffer = report_service.generate_invoice_pdf(invoice, db, str(current_user.id), lang=lang or "sq")
    filename = f"Invoice_{invoice.invoice_number}.pdf"
    headers = {'Content-Disposition': f'inline; filename="{filename}"'}
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)

@router.post("/invoices/{invoice_id}/archive", response_model=ArchiveItemOut)
async def archive_invoice(invoice_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db), case_id: Optional[str] = Query(None), lang: Optional[str] = Query("sq")):
    """Converts invoice to PDF and saves it to the Archive / Workspace."""
    finance_service = FinanceService(db)
    archive_service_instance = ArchiveService(db)
    invoice = finance_service.get_invoice(str(current_user.id), invoice_id)
    pdf_buffer = report_service.generate_invoice_pdf(invoice, db, str(current_user.id), lang=lang or "sq")
    pdf_content = pdf_buffer.getvalue()
    
    archived_item = await archive_service_instance.save_generated_file(
        user_id=str(current_user.id), 
        filename=f"Fatura_{invoice.invoice_number}.pdf", 
        file_content=pdf_content, 
        category="INVOICE", 
        title=f"Fatura #{invoice.invoice_number} - {invoice.client_name}", 
        case_id=case_id
    )
    return archived_item


# --- EXPENSES (Accounts Payable) ---

@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreate, 
    current_user: Annotated[UserInDB, Depends(get_current_user)], 
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends()
):
    return FinanceService(db).create_expense(str(current_user.id), expense_in)

@router.get("/expenses", response_model=List[ExpenseOut])
def get_expenses(current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).get_expenses(str(current_user.id))

@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: str, 
    current_user: Annotated[UserInDB, Depends(get_current_user)], 
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends()
):
    FinanceService(db).delete_expense(str(current_user.id), expense_id)
    try:
        graph_service.delete_node(expense_id)
    except:
        pass

# --- ANALYTICS ENDPOINT (Re-introduced to fix 404) ---
@router.get("/analytics/dashboard", response_model=AnalyticsDashboardData)
async def get_dashboard_data(
    days: Annotated[int, Query(default=365)], 
    current_user: Annotated[UserInDB, Depends(get_current_user)], 
    db: Database = Depends(get_db)
):
    """Handles the main dashboard data call: /api/v1/finance/analytics/dashboard"""
    # This calls the AnalyticsService which has the COGS fix implemented
    analytics_service = AnalyticsService(db)
    return await analytics_service.get_dashboard_data(user_id=str(current_user.id), days=days)