# FILE: backend/app/api/endpoints/finance_wizard.py
# PHOENIX PROTOCOL - FINANCE WIZARD ENDPOINT v3.4 (DEBUG SALES BREAKDOWN)

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Any, Optional
from datetime import datetime
from bson import ObjectId
from app.models.user import UserInDB

from app.api.endpoints.dependencies import get_current_user
from app.core.db import get_db, get_async_db
from app.services.finance_service import FinanceService
from app.models.finance import WizardState, AuditIssue, TaxCalculation
from app.modules.finance.tax_engine.kosovo_adapter import KosovoTaxAdapter
from app.modules.finance.reporting import generate_monthly_report_pdf

router = APIRouter()
tax_adapter = KosovoTaxAdapter()

def get_finance_service(db: Any):
    return FinanceService(db)

def _filter_by_month(items: list, month: int, year: int) -> list:
    filtered = []
    for item in items:
        date_val = getattr(item, "issue_date", getattr(item, "date", None))
        if date_val and date_val.month == month and date_val.year == year:
            filtered.append(item)
    return filtered

def _calculate_annual_turnover(invoices: list, current_year: int) -> float:
    total = 0.0
    for inv in invoices:
        if inv.status == 'CANCELLED': continue
        if inv.issue_date.year == current_year:
            total += inv.total_amount
    return total

def _run_audit_rules(invoices: list, expenses: list) -> List[AuditIssue]:
    issues = []
    for exp in expenses:
        if exp.amount > 10.0 and not exp.receipt_url:
            issues.append(AuditIssue(id=f"missing_receipt_{exp.id}", severity="WARNING", message=f"Shpenzimi '{exp.category}' prej €{exp.amount} nuk ka faturë të bashkangjitur.", related_item_id=str(exp.id), item_type="EXPENSE"))
    for exp in expenses:
        cat_lower = exp.category.lower() if exp.category else ""
        if "court" in cat_lower and not exp.related_case_id:
            issues.append(AuditIssue(id=f"unlinked_court_fee_{exp.id}", severity="CRITICAL", message=f"Taksa Gjyqësore prej €{exp.amount} nuk është lidhur me një Rast Klienti (E pafaturuar).", related_item_id=str(exp.id), item_type="EXPENSE"))
    for inv in invoices:
        if inv.status == "DRAFT":
            issues.append(AuditIssue(id=f"draft_invoice_{inv.id}", severity="WARNING", message=f"Fatura #{inv.invoice_number or '???'} është ende në statusin DRAFT (E pa lëshuar).", related_item_id=str(inv.id), item_type="INVOICE"))
    return issues

async def _get_wizard_data(month: int, year: int, user: Any, db: Any, async_db: Any, case_id: Optional[str] = None) -> WizardState:
    # Safe User ID Extraction
    try:
        if hasattr(user, "id"):
            user_id = str(user.id)
        elif hasattr(user, "_id"):
            user_id = str(user._id)
        elif isinstance(user, dict):
            user_id = str(user.get("id") or user.get("_id"))
        else:
            raise ValueError("Could not determine user ID")
    except Exception as e:
        print(f"User ID Error in Wizard: {e}")
        raise HTTPException(status_code=400, detail="Invalid User ID")

    service = get_finance_service(db)
    
    # Fetch ALL data for the user, optionally filtered by workspace
    all_invoices = service.get_invoices(user_id, case_id)
    all_expenses = service.get_expenses(user_id, case_id)
    
    # Filter for current month
    period_invoices = _filter_by_month(all_invoices, month, year)
    period_expenses = _filter_by_month(all_expenses, month, year)

    # Calculate Annual Turnover (YTD) from all invoices (respects workspace filter)
    annual_turnover = _calculate_annual_turnover(all_invoices, year)

    # Fetch POS Revenue (Async) – also filter by workspace
    pos_revenue = await service.get_monthly_pos_revenue(async_db, user_id, month, year, case_id)

    # Run Tax Logic – correct parameter names: annual_turnover_ytd, pos_total_revenue
    calculation_result = tax_adapter.analyze_month(
        period_invoices,
        period_expenses,
        month,
        year,
        annual_turnover_ytd=annual_turnover,
        pos_total_revenue=pos_revenue
    )
    
    tax_calc = TaxCalculation(**calculation_result)

    # Run Audits
    audit_issues = _run_audit_rules(period_invoices, period_expenses)
    critical_count = len([i for i in audit_issues if i.severity == "CRITICAL"])
    
    return WizardState(
        calculation=tax_calc,
        issues=audit_issues,
        ready_to_close=(critical_count == 0)
    )

@router.get("/state", response_model=WizardState)
async def get_wizard_state(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    current_user: Any = Depends(get_current_user),
    db: Any = Depends(get_db),
    async_db: Any = Depends(get_async_db),
    case_id: Optional[str] = Query(None)  # PHOENIX: workspace filter
):
    """Returns the JSON state for the frontend wizard UI."""
    return await _get_wizard_data(month, year, current_user, db, async_db, case_id)

@router.get("/report/pdf")
async def download_monthly_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    current_user: Any = Depends(get_current_user),
    db: Any = Depends(get_db),
    async_db: Any = Depends(get_async_db),
    case_id: Optional[str] = Query(None)  # PHOENIX: workspace filter
):
    """Generates and downloads the PDF report."""
    state = await _get_wizard_data(month, year, current_user, db, async_db, case_id)
    pdf_buffer = generate_monthly_report_pdf(state, current_user, month, year)
    filename = f"Raporti_Financiar_{month}_{year}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ========== DEBUG ENDPOINT ==========
@router.get("/debug/sales-breakdown")
async def debug_sales_breakdown(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    current_user: Any = Depends(get_current_user),
    db: Any = Depends(get_db),
    async_db: Any = Depends(get_async_db),
    case_id: Optional[str] = Query(None)
):
    """DEBUG: Show exactly what's contributing to sales total"""
    
    try:
        if hasattr(current_user, "id"):
            user_id = str(current_user.id)
        else:
            user_id = str(current_user._id)
    except:
        raise HTTPException(status_code=400, detail="Invalid User ID")
    
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    # Get ALL invoices (including deleted ones) for debugging
    all_invoices = list(db.invoices.find({"user_id": ObjectId(user_id)}))
    
    # Get invoices for the selected month (no status filter)
    month_invoices_raw = list(db.invoices.find({
        "user_id": ObjectId(user_id),
        "issue_date": {"$gte": start_date, "$lt": end_date}
    }))
    
    # Get invoices for the selected month with status filter (what wizard sees)
    month_invoices_filtered = list(db.invoices.find({
        "user_id": ObjectId(user_id),
        "issue_date": {"$gte": start_date, "$lt": end_date},
        "status": {"$nin": ["CANCELLED", "DELETED", "ARCHIVED"]}
    }))
    
    # Get POS transactions for the selected month
    pos_transactions = list(db.transactions.find({
        "user_id": str(user_id),
        "date_time": {"$gte": start_date, "$lt": end_date}
    }))
    
    # Calculate totals
    invoice_total_raw = sum(inv.get("total_amount", 0) for inv in month_invoices_raw)
    invoice_total_filtered = sum(inv.get("total_amount", 0) for inv in month_invoices_filtered)
    pos_total = sum(tx.get("total_amount", 0) for tx in pos_transactions)
    
    # Get service instance for wizard data comparison
    service = FinanceService(db)
    wizard_invoices = service.get_invoices(user_id, case_id)
    wizard_invoices_month = _filter_by_month(wizard_invoices, month, year)
    wizard_invoice_total = sum(inv.total_amount for inv in wizard_invoices_month)
    
    # Also get POS revenue from service
    wizard_pos_revenue = await service.get_monthly_pos_revenue(async_db, user_id, month, year, case_id)
    
    return {
        "user_id": user_id,
        "month": month,
        "year": year,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "case_id": case_id,
        "invoice_count_total_db": len(all_invoices),
        "invoice_count_this_month_raw": len(month_invoices_raw),
        "invoice_count_this_month_filtered": len(month_invoices_filtered),
        "invoices_this_month_raw": [
            {
                "id": str(inv.get("_id")),
                "invoice_number": inv.get("invoice_number"),
                "total_amount": inv.get("total_amount"),
                "status": inv.get("status"),
                "issue_date": str(inv.get("issue_date"))
            }
            for inv in month_invoices_raw[:20]
        ],
        "invoice_total_raw": invoice_total_raw,
        "invoice_total_filtered": invoice_total_filtered,
        "pos_transaction_count_this_month": len(pos_transactions),
        "pos_transactions_this_month": [
            {
                "id": str(tx.get("_id")),
                "product_name": tx.get("product_name"),
                "total_amount": tx.get("total_amount"),
                "date_time": str(tx.get("date_time"))
            }
            for tx in pos_transactions[:20]
        ],
        "pos_total": pos_total,
        "wizard_invoice_total": wizard_invoice_total,
        "wizard_pos_revenue": wizard_pos_revenue,
        "wizard_total_sales": wizard_invoice_total + wizard_pos_revenue,
        "explanation": {
            "invoice_filter_used": "status NOT IN ['CANCELLED', 'DELETED', 'ARCHIVED']",
            "pos_filter_used": "date_time in month range"
        }
    }