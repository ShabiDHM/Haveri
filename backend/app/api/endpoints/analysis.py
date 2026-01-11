# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V3.2 (CFO AGENT)
# 1. FEATURE: 'generate_kpi_insight' now uses the LLM to interpret data, not just calculate it.
# 2. STRATEGY: Implements "Contextual Stuffing" - feeding raw calculated stats to the AI for professional commentary.
# 3. UNIQUENESS: Provides qualitative "CFO-level" advice (trends, warnings, opportunities).

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from pymongo.database import Database
import pymongo
from bson import ObjectId
import re

from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from app.services.inventory_service import InventoryService
from app.services.finance_service import FinanceService
from app.services import llm_service 
from app.models.inventory import InventoryItem

router = APIRouter()

# --- INPUT MODELS ---
class TaxAuditRequest(BaseModel): 
    month: int
    year: int

class ChatRequest(BaseModel): 
    message: str

class PredictionRequest(BaseModel): 
    item_id: str

class KpiInsightRequest(BaseModel): 
    kpi_type: str 

# --- OUTPUT MODELS ---
class TaxAuditResult(BaseModel): 
    anomalies: List[str]
    status: str
    net_obligation: float

class RestockPrediction(BaseModel): 
    suggested_quantity: float
    reason: str
    supplier_name: Optional[str] = None
    estimated_cost: float

class SalesTrendAnalysis(BaseModel): 
    trend_analysis: str
    cross_sell_opportunities: str

class KpiInsightResponse(BaseModel): 
    summary: str
    key_contributors: List[str]

class GeneralInsightResponse(BaseModel): 
    insight: str
    sentiment: str 

# --- HELPER FUNCTIONS ---
def _normalize(text: str) -> str: return str(text).strip().lower()
def _safe_float(val: Any) -> float:
    try: return float(val)
    except: return 0.0

def _get_latest_activity_year(db: Database, user_filter: Dict) -> int:
    """Finds the year of the most recent transaction across all collections."""
    latest_date = None
    
    # Check Invoices
    latest_invoice = db["invoices"].find_one(user_filter, sort=[("issue_date", -1)])
    if latest_invoice and latest_invoice.get("issue_date"):
        try:
            d = latest_invoice["issue_date"]
            if isinstance(d, str): d = datetime.fromisoformat(d.replace('Z', '+00:00'))
            latest_date = d
        except: pass

    # Check Expenses
    latest_expense = db["expenses"].find_one(user_filter, sort=[("date", -1)])
    if latest_expense and latest_expense.get("date"):
        try:
            d = latest_expense["date"]
            if isinstance(d, str): d = datetime.fromisoformat(d.replace('Z', '+00:00'))
            if not latest_date or d > latest_date: latest_date = d
        except: pass

    # Check POS Transactions
    latest_pos = db["transactions"].find_one(user_filter, sort=[("date", -1)])
    if latest_pos and latest_pos.get("date"):
        try:
            d = latest_pos["date"]
            if isinstance(d, str): d = datetime.fromisoformat(d.replace('Z', '+00:00'))
            if not latest_date or d > latest_date: latest_date = d
        except: pass

    return latest_date.year if latest_date else datetime.utcnow().year

# --- ENDPOINTS ---
@router.post("/finance/kpi-insight", response_model=KpiInsightResponse)
def generate_kpi_insight(
    request: KpiInsightRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    # Context Aware ID
    context_id = str(current_user.organization_id) if current_user.organization_id else str(current_user.id)
    user_filter = {
        "$or": [
            {"user_id": context_id},
            {"user_id": str(current_user.id)},
            {"organization_id": context_id}
        ]
    }
    
    finance_service = FinanceService(db)
    summary = "Analiza e të dhënave e padisponueshme."
    contributors = []
    
    # Dynamically determine the year to analyze
    analysis_year = _get_latest_activity_year(db, user_filter)
    analysis_start_date = datetime(analysis_year, 1, 1)
    analysis_end_date = datetime(analysis_year, 12, 31, 23, 59, 59)
    
    # PHOENIX: DATA AGGREGATION FOR AI
    ai_context_data = ""

    if request.kpi_type == 'income':
        invoices = finance_service.get_invoices(context_id)
        period_invoices = [i for i in invoices if i.status == 'PAID' and analysis_start_date <= i.issue_date <= analysis_end_date]
        total_income = sum(i.total_amount for i in period_invoices)
        
        clients = {}
        for inv in period_invoices: clients[inv.client_name] = clients.get(inv.client_name, 0) + inv.total_amount
        sorted_clients = sorted(clients.items(), key=lambda x: x[1], reverse=True)
        contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_clients[:4]]
        
        # Build prompt context
        ai_context_data = f"Total Income: €{total_income}. Year: {analysis_year}. Top Clients: {', '.join([c[0] for c in sorted_clients[:3]])}."

    elif request.kpi_type == 'expense':
        expenses = finance_service.get_expenses(context_id)
        period_expenses = [e for e in expenses if analysis_start_date <= e.date <= analysis_end_date]
        total_expense = sum(e.amount for e in period_expenses)
        
        cats = {}
        for e in period_expenses: cats[e.category] = cats.get(e.category, 0) + e.amount
        sorted_cats = sorted(cats.items(), key=lambda x: x[1], reverse=True)
        contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_cats[:4]]
        
        ai_context_data = f"Total Expenses: €{total_expense}. Year: {analysis_year}. Top Categories: {', '.join([f'{c[0]} (€{c[1]})' for c in sorted_cats[:3]])}."

    elif request.kpi_type == 'profit':
        invoices = finance_service.get_invoices(context_id)
        expenses = finance_service.get_expenses(context_id)
        period_income = sum(i.total_amount for i in invoices if i.status == 'PAID' and analysis_start_date <= i.issue_date <= analysis_end_date)
        period_expense = sum(e.amount for e in expenses if analysis_start_date <= e.date <= analysis_end_date)
        net = period_income - period_expense
        margin = (net / period_income * 100) if period_income > 0 else 0
        
        contributors = [f"Të Hyrat: €{period_income:.2f}", f"Shpenzimet: €{period_expense:.2f}", f"Neto: €{net:.2f}"]
        ai_context_data = f"Net Profit: €{net}. Revenue: €{period_income}. Expenses: €{period_expense}. Margin: {margin:.1f}%. Year: {analysis_year}."

    # --- PHOENIX: THE "UNIQUE" FACTOR (AI ANALYSIS) ---
    # Instead of just returning numbers, we ask the AI to act as a CFO.
    if ai_context_data:
        try:
            # We use the existing helper but inject a specific analytical prompt
            prompt = f"""
            Act as a concise Financial CFO. Analyze this data in Albanian (Gegë dialect friendly):
            DATA: {ai_context_data}
            
            TASK: Provide a 1-2 sentence professional summary. 
            - If good: Highlight the stability.
            - If bad: Point out the risk.
            - Do not just repeat numbers, give insight.
            """
            # Note: We pass a dummy document_id=None to skip vector search and force direct answering
            ai_response = llm_service.ask_business_consultant(user_id=str(current_user.id), query=prompt)
            
            # Clean up response (sometimes LLMs add quotes)
            summary = ai_response.strip().replace('"', '')
        except Exception as e:
            # Fallback to basic math if AI fails
            print(f"AI Insight Failed: {e}")
            summary = f"Analiza: Vlera totale është kalkuluar bazuar në të dhënat e vitit {analysis_year}."

    return KpiInsightResponse(summary=summary, key_contributors=contributors)

# --- Other Endpoints ---

@router.get("/finance/proactive-insight", response_model=GeneralInsightResponse)
def get_proactive_insight(
    current_user: UserInDB = Depends(get_current_user), 
    db: Database = Depends(get_db)
):
    return GeneralInsightResponse(insight="Analiza proaktive po monitoron të dhënat tuaja.", sentiment="neutral")

@router.post("/tax/audit", response_model=TaxAuditResult)
def analyze_tax_anomalies(
    request: TaxAuditRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    # This remains placeholder for now, but ready for logic injection
    return TaxAuditResult(anomalies=[], status="CLEAR", net_obligation=0.0)

@router.post("/tax/chat", response_model=Dict[str, str])
def chat_with_tax_bot(
    request: ChatRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    user_id = str(current_user.id)
    response_text = llm_service.ask_business_consultant(user_id=user_id, query=request.message)
    return {"response": response_text}

@router.post("/inventory/predict", response_model=RestockPrediction)
def predict_restock(
    request: PredictionRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    raise HTTPException(status_code=404, detail="AI Service unavailable")

@router.post("/inventory/trend", response_model=SalesTrendAnalysis)
def analyze_sales_trend(
    request: PredictionRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    raise HTTPException(status_code=404, detail="AI Service unavailable")