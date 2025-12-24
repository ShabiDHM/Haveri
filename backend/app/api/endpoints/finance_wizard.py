# FILE: backend/app/api/endpoints/finance_wizard.py
# PHOENIX PROTOCOL - FINANCE WIZARD ENDPOINT v3.1 (DEPENDENCY INJECTION FIX)
# 1. CRITICAL FIX: Replaced broken 'db_instance' global import with 'get_db' dependency injection.
# 2. IMPORT FIX: Corrected 'get_current_user' import path.
# 3. LOGIC: Safely handles User ID extraction.

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Any
from app.models.user import UserInDB

# Correct Import Paths
from app.api.endpoints.dependencies import get_current_user
from app.core.db import get_db, get_async_db
from app.services.finance_service import FinanceService
from app.models.finance import WizardState, AuditIssue, TaxCalculation
from app.modules.finance.tax_engine.kosovo_adapter import KosovoTaxAdapter
from app.modules.finance.reporting import generate_monthly_report_pdf

router = APIRouter()
tax_adapter = KosovoTaxAdapter()

# Instantiate Service using the injected DB
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

async def _get_wizard_data(month: int, year: int, user: Any, db: Any, async_db: Any) -> WizardState:
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

    # Use the injected Sync DB
    service = get_finance_service(db)
    
    # 1. Fetch ALL data for the user (Sync)
    all_invoices = service.get_invoices(user_id)
    all_expenses = service.get_expenses(user_id)
    
    # 2. Filter for current month view
    period_invoices = _filter_by_month(all_invoices, month, year)
    period_expenses = _filter_by_month(all_expenses, month, year)

    # 3. Calculate Annual Turnover (YTD)
    annual_turnover = _calculate_annual_turnover(all_invoices, year)

    # 4. Fetch POS Revenue (Async) - Uses the injected Async DB
    pos_revenue = await service.get_monthly_pos_revenue(async_db, user_id, month, year)

    # 5. Run Tax Logic
    calculation_result = tax_adapter.analyze_month(
        period_invoices, 
        period_expenses, 
        month, 
        year, 
        annual_turnover,
        pos_total_revenue=pos_revenue
    )
    
    tax_calc = TaxCalculation(**calculation_result)

    # 6. Run Audits
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
    db: Any = Depends(get_db),          # PHOENIX: Injected Sync DB
    async_db: Any = Depends(get_async_db) # PHOENIX: Injected Async DB
):
    """Returns the JSON state for the frontend wizard UI."""
    return await _get_wizard_data(month, year, current_user, db, async_db)

@router.get("/report/pdf")
async def download_monthly_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    current_user: Any = Depends(get_current_user),
    db: Any = Depends(get_db),          # PHOENIX: Injected Sync DB
    async_db: Any = Depends(get_async_db)
):
    """Generates and downloads the PDF report."""
    # 1. Get the data
    state = await _get_wizard_data(month, year, current_user, db, async_db)
    
    # 2. Generate PDF (Sync)
    pdf_buffer = generate_monthly_report_pdf(state, current_user, month, year)
    
    filename = f"Raporti_Financiar_{month}_{year}.pdf"
    
    # 3. Stream response
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )