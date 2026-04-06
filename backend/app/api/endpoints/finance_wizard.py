# FILE: backend/app/api/endpoints/finance_wizard.py
# PHOENIX PROTOCOL - FINANCE WIZARD ENDPOINT v3.5 (DEBUG SALES SOURCE)

import logging
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

logger = logging.getLogger(__name__)

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
    
    # ========== DEBUG: Log all invoices for April 2026 ==========
    logger.info("=" * 60)
    logger.info("WIZARD DEBUG - INVOICE BREAKDOWN")
    logger.info("=" * 60)
    
    april_total = 0.0
    for inv in all_invoices:
        if hasattr(inv, 'issue_date') and inv.issue_date:
            if inv.issue_date.month == 4 and inv.issue_date.year == 2026:
                logger.info(f"Invoice: {inv.invoice_number} | Amount: €{inv.total_amount} | Status: {inv.status}")
                april_total += inv.total_amount
    
    logger.info(f"TOTAL SALES FOR APRIL 2026 (from invoices): €{april_total}")
    
    # Also check POS transactions for April 2026
    start_date = datetime(2026, 4, 1)
    end_date = datetime(2026, 5, 1)
    pos_transactions = list(db.transactions.find({
        "user_id": user_id,
        "date_time": {"$gte": start_date, "$lt": end_date}
    }))
    
    pos_total = sum(tx.get("total_amount", 0) for tx in pos_transactions)
    logger.info(f"POS TRANSACTIONS FOR APRIL 2026: {len(pos_transactions)} transactions, total: €{pos_total}")
    logger.info("=" * 60)
    # ========== END DEBUG ==========
    
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
    case_id: Optional[str] = Query(None)
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
    case_id: Optional[str] = Query(None)
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
@router.get("/debug/sales-source")
async def debug_sales_source(
    current_user: Any = Depends(get_current_user),
    db: Any = Depends(get_db),
):
    """DEBUG: Identify where sales numbers are coming from"""
    
    user_id = ObjectId(current_user.id)
    user_id_str = str(current_user.id)
    
    # Get ALL invoices (no filters)
    all_invoices = list(db.invoices.find({"user_id": user_id}))
    
    # Get invoices for April 2026
    start_date = datetime(2026, 4, 1)
    end_date = datetime(2026, 5, 1)
    
    april_invoices = list(db.invoices.find({
        "user_id": user_id,
        "issue_date": {"$gte": start_date, "$lt": end_date}
    }))
    
    # Get POS transactions for April 2026
    pos_transactions = list(db.transactions.find({
        "user_id": user_id_str,
        "date_time": {"$gte": start_date, "$lt": end_date}
    }))
    
    # Get expenses for April 2026
    expenses = list(db.expenses.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }))
    
    # Calculate totals
    invoice_total = sum(inv.get("total_amount", 0) for inv in april_invoices)
    pos_total = sum(tx.get("total_amount", 0) for tx in pos_transactions)
    expense_total = sum(exp.get("amount", 0) for exp in expenses)
    
    return {
        "user_id": user_id_str,
        "period": "April 2026",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "invoices_count": len(april_invoices),
        "invoices_total": invoice_total,
        "invoices_list": [
            {
                "number": inv.get("invoice_number"),
                "amount": inv.get("total_amount"),
                "status": inv.get("status"),
                "date": inv.get("issue_date").isoformat() if inv.get("issue_date") else None
            }
            for inv in april_invoices
        ],
        "pos_transactions_count": len(pos_transactions),
        "pos_transactions_total": pos_total,
        "pos_transactions_list": [
            {
                "product": tx.get("product_name"),
                "amount": tx.get("total_amount"),
                "date": tx.get("date_time").isoformat() if tx.get("date_time") else None
            }
            for tx in pos_transactions[:10]
        ],
        "expenses_count": len(expenses),
        "expenses_total": expense_total,
        "total_sales": invoice_total + pos_total,
        "net_profit": (invoice_total + pos_total) - expense_total
    }