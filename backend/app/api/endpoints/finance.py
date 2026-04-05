# FILE: backend/app/api/endpoints/finance.py
# PHOENIX PROTOCOL - FINANCE ENDPOINTS V17.13 (CATEGORY SUPPORT FOR IMPORT)

import json
import logging
import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse, Response
from typing import List, Annotated, Optional, Any, Dict
from pymongo.database import Database
import pymongo
from pydantic import BaseModel
from datetime import datetime, timedelta
from bson import ObjectId

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

class PosTransactionCreate(BaseModel):
    inventory_item_id: str
    quantity: float = 1.0
    total_price: float
    product_name: Optional[str] = None
    description: Optional[str] = None
    transaction_date: Optional[datetime] = None
    payment_method: Optional[str] = "CASH"
    notes: Optional[str] = None

# --- PARTNER / CLIENT ENDPOINTS ---

@router.get("/partners", response_model=List[PartnerOut])
def get_partners(current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db)):
    return FinanceService(db).get_partners(str(current_user.id))

@router.put("/partners/{partner_id}", response_model=PartnerOut)
def update_partner(
    partner_id: str,
    partner_update: PartnerUpdate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    return FinanceService(db).update_partner(str(current_user.id), partner_id, partner_update)

@router.delete("/partners/{partner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_partner(
    partner_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    FinanceService(db).delete_partner(str(current_user.id), partner_id)

# --- DATA IMPORT & POS ENDPOINTS ---

@router.post("/import/preview")
async def preview_import_file(file: UploadFile = File(...), db: Database = Depends(get_db)):
    service = ParsingService(db)
    return await service.preview_file(file)

@router.post("/import/confirm")
async def confirm_import(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    file: UploadFile = File(...),
    mapping: str = Form(...),
    importType: str = Form('pos'),
    defaultCategory: Optional[str] = Form(None),
    case_id: Optional[str] = Query(None),
    db: Database = Depends(get_db)
):
    try:
        mapping_dict = json.loads(mapping)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mapping format")
    service = ParsingService(db)
    return await service.process_import(
        file, 
        str(current_user.id), 
        mapping_dict, 
        import_type=importType, 
        case_id=case_id,
        default_category=defaultCategory
    )

@router.post("/import/clients")
async def import_clients(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Database = Depends(get_db)
):
    return await FinanceService(db).import_partners(str(current_user.id), file)

@router.get("/import/transactions", response_model=List[PosTransactionOut])
async def get_imported_transactions(
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
    db: Any = Depends(get_async_db),
    case_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None)
):
    user_id_str = str(current_user.id)
    
    logger = logging.getLogger(__name__)
    logger.info(f"[DEBUG] get_imported_transactions: user_id={user_id_str}, case_id={case_id}, year={year}")
    
    filter_criteria: Dict[str, Any] = {"user_id": user_id_str}
    if case_id:
        filter_criteria["case_id"] = case_id
        logger.info(f"[DEBUG] Adding case_id filter: {case_id}")
    
    if year:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year + 1, 1, 1)
        filter_criteria["date_time"] = {"$gte": start_date, "$lt": end_date}
        logger.info(f"[DEBUG] Adding year filter: {year}")
    
    filtered_count = await db["transactions"].count_documents(filter_criteria)
    logger.info(f"[DEBUG] POS transactions after filters: {filtered_count}")
    
    cursor = db["transactions"].find(filter_criteria).sort("date_time", pymongo.DESCENDING)
    transactions = await cursor.to_list(length=None)
    
    for tx in transactions:
        if "date_time" in tx and "date" not in tx:
            tx["date"] = tx["date_time"]
        elif "date" not in tx:
            tx["date"] = None
    
    return transactions

@router.post("/transactions", response_model=PosTransactionOut, status_code=status.HTTP_201_CREATED)
def create_pos_transaction(
    transaction_data: PosTransactionCreate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    case_id: Optional[str] = Query(None)
):
    service = FinanceService(db)
    data = transaction_data.model_dump()
    
    if not data.get("transaction_date"):
        data["transaction_date"] = datetime.now()
    if not data.get("product_name"):
        data["product_name"] = data.get("description", "Produkt POS")
    
    result = service.create_pos_transaction(
        user_id=str(current_user.id),
        data=data,
        case_id=case_id
    )
    
    if isinstance(result, dict):
        if 'date_time' in result and 'date' not in result:
            result['date'] = result['date_time']
        if 'date' in result and isinstance(result['date'], str):
            try:
                result['date'] = datetime.fromisoformat(result['date'].replace('Z', '+00:00'))
            except:
                pass
    
    return result

@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends()
):
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
def get_invoices(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    case_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None)
):
    return FinanceService(db).get_invoices(str(current_user.id), case_id, year)

@router.post("/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_in: InvoiceCreate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends(),
    case_id: Optional[str] = Query(None)
):
    new_invoice_db: InvoiceInDB = FinanceService(db).create_invoice(str(current_user.id), invoice_in, case_id)
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
def download_invoice_pdf(
    invoice_id: str, 
    current_user: Annotated[UserInDB, Depends(get_current_user)], 
    db: Database = Depends(get_db), 
    lang: Optional[str] = Query("sq")
):
    service = FinanceService(db)
    invoice = service.get_invoice(str(current_user.id), invoice_id)
    pdf_buffer = report_service.generate_invoice_pdf(invoice, db, str(current_user.id), lang=lang or "sq")
    filename = f"Invoice_{invoice.invoice_number}.pdf"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"',
        'Access-Control-Allow-Origin': 'https://www.haveri.tech',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'Content-Disposition, Content-Type, Content-Length',
        'Cache-Control': 'no-cache'
    }
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers=headers
    )

@router.post("/invoices/{invoice_id}/archive", response_model=ArchiveItemOut)
async def archive_invoice(invoice_id: str, current_user: Annotated[UserInDB, Depends(get_current_user)], db: Database = Depends(get_db), case_id: Optional[str] = Query(None), lang: Optional[str] = Query("sq")):
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

# --- EXPORT INVOICES TO EXCEL ---
@router.get("/invoices/export/excel")
async def export_invoices_excel(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    case_id: Optional[str] = Query(None),
    invoice_ids: Optional[List[str]] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    day: Optional[int] = Query(None),
    lang: Optional[str] = Query("sq")
):
    user_id_str = str(current_user.id)
    
    if invoice_ids:
        oids = []
        for id_str in invoice_ids:
            try:
                oids.append(ObjectId(id_str))
            except:
                pass
        invoices = list(db.invoices.find({"_id": {"$in": oids}, "user_id": user_id_str}))
    else:
        query: dict = {"user_id": user_id_str}
        if case_id:
            query["case_id"] = case_id
        
        if year:
            start_date = datetime(year, 1, 1)
            end_date = None
            if month:
                start_date = datetime(year, month, 1)
                if day:
                    start_date = datetime(year, month, day)
                    end_date = start_date + timedelta(days=1)
                else:
                    if month == 12:
                        end_date = datetime(year + 1, 1, 1)
                    else:
                        end_date = datetime(year, month + 1, 1)
            else:
                end_date = datetime(year + 1, 1, 1)
            
            query["issue_date"] = {"$gte": start_date}
            if end_date:
                query["issue_date"]["$lt"] = end_date
        
        invoices = list(db.invoices.find(query).sort("issue_date", -1))
    
    if not invoices:
        raise HTTPException(status_code=404, detail="Nuk u gjet asnjë faturë për eksport.")
    
    data = []
    for inv in invoices:
        items_list = []
        for item in inv.get('items', []):
            desc = item.get('description', '')
            qty = item.get('quantity', 1)
            price = item.get('unit_price', 0)
            items_list.append(f"{desc} x{qty} @ {price}")
        items_str = ", ".join(items_list)
        
        data.append({
            "Numri i Faturës": inv.get("invoice_number", ""),
            "Klienti": inv.get("client_name", ""),
            "NIPT i Klientit": inv.get("client_tax_id", ""),
            "Data e Lëshimit": inv.get("issue_date", ""),
            "Data e Pagesës": inv.get("due_date", ""),
            "Nëntotali": inv.get("subtotal", 0),
            "Norma e Tatimit (%)": inv.get("tax_rate", 0),
            "Shuma Totale": inv.get("total_amount", 0),
            "Statusi": inv.get("status", ""),
            "Artikujt": items_str,
            "Shënime": inv.get("notes", ""),
        })
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name="Faturat", index=False)
    output.seek(0)
    
    filename = f"faturat_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )

# --- EXPORT EXPENSES TO EXCEL ---
@router.get("/expenses/export/excel")
async def export_expenses_excel(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    case_id: Optional[str] = Query(None),
    expense_ids: Optional[List[str]] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    day: Optional[int] = Query(None),
    lang: Optional[str] = Query("sq")
):
    user_id_str = str(current_user.id)
    
    if expense_ids:
        oids = []
        for id_str in expense_ids:
            try:
                oids.append(ObjectId(id_str))
            except:
                pass
        expenses = list(db.expenses.find({"_id": {"$in": oids}, "user_id": user_id_str}))
    else:
        query: dict = {"user_id": user_id_str}
        if case_id:
            query["case_id"] = case_id
        
        if year:
            start_date = datetime(year, 1, 1)
            end_date = None
            if month:
                start_date = datetime(year, month, 1)
                if day:
                    start_date = datetime(year, month, day)
                    end_date = start_date + timedelta(days=1)
                else:
                    if month == 12:
                        end_date = datetime(year + 1, 1, 1)
                    else:
                        end_date = datetime(year, month + 1, 1)
            else:
                end_date = datetime(year + 1, 1, 1)
            
            query["date"] = {"$gte": start_date}
            if end_date:
                query["date"]["$lt"] = end_date
        
        expenses = list(db.expenses.find(query).sort("date", -1))
    
    if not expenses:
        raise HTTPException(status_code=404, detail="Nuk u gjet asnjë shpenzim për eksport.")
    
    data = []
    for exp in expenses:
        data.append({
            "Kategoria": exp.get("category", ""),
            "Shuma": exp.get("amount", 0),
            "Data": exp.get("date", ""),
            "Përshkrimi": exp.get("description", ""),
            "Statusi": exp.get("status", "PAID"),
        })
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name="Shpenzimet", index=False)
    output.seek(0)
    
    filename = f"shpenzimet_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )

# --- EXPENSES ---

@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    graph_service: GraphService = Depends(),
    case_id: Optional[str] = Query(None)
):
    return FinanceService(db).create_expense(str(current_user.id), expense_in, case_id)

@router.get("/expenses", response_model=List[ExpenseOut])
def get_expenses(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db),
    case_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None)
):
    return FinanceService(db).get_expenses(str(current_user.id), case_id, year)

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

# --- ANALYTICS ENDPOINT ---
@router.get("/analytics/dashboard", response_model=AnalyticsDashboardData)
async def get_dashboard_data(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    sync_db: Database = Depends(get_db),
    days: int = 365,
    year: Optional[int] = Query(None),
    case_id: Optional[str] = Query(None)
):
    analytics_service = AnalyticsService(sync_db)
    return await analytics_service.get_dashboard_data(user_id=str(current_user.id), days=days, year=year, case_id=case_id)