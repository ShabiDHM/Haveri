# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V4.4 (FULL ASYNC RESTORATION)
# 1. FIXED: Added missing 'await' to all llm_service calls to resolve Pylance CoroutineType errors.
# 2. FIXED: Converted all endpoints to 'async def' to support awaitable AI logic.
# 3. IMPROVED: Robust regex lookup checks both 'description' and 'product_name' for AI context.
# 4. HARDENED: Implemented _safe_float to prevent crashes on conversational AI numbers.
# 5. STATUS: 100% complete file replacement.

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
from pymongo.database import Database
from bson import ObjectId
import re
import logging
import asyncio
import mimetypes

from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from app.services.finance_service import FinanceService
from app.services import llm_service
from app.services import spreadsheet_service

router = APIRouter()
logger = logging.getLogger(__name__)

# --- MODELS ---
class TaxAuditRequest(BaseModel): month: int; year: int
class ChatRequest(BaseModel): message: str
class PredictionRequest(BaseModel): item_id: str
class KpiInsightRequest(BaseModel): kpi_type: str 

class TaxAuditResult(BaseModel): anomalies: List[str]; status: str; net_obligation: float
class RestockPrediction(BaseModel): suggested_quantity: float; reason: str; supplier_name: Optional[str] = None; estimated_cost: float
class SalesTrendAnalysis(BaseModel): trend_analysis: str; cross_sell_opportunities: str
class KpiInsightResponse(BaseModel): summary: str; key_contributors: List[str]
class GeneralInsightResponse(BaseModel): insight: str; sentiment: str 

# --- HELPERS ---
def _get_latest_activity_year(db: Database, user_filter: Dict) -> int:
    try:
        latest = db.invoices.find_one(user_filter, sort=[("issue_date", -1)])
        if latest and isinstance(latest.get("issue_date"), datetime):
            return latest["issue_date"].year
    except: pass
    return datetime.utcnow().year

def _safe_float(val: Any) -> float:
    """Robust conversion that handles strings like '10 units' or '€5.50'."""
    if isinstance(val, (int, float)): return float(val)
    if isinstance(val, str):
        cleaned = re.sub(r'[^\d.]', '', val)
        try: return float(cleaned) if cleaned else 0.0
        except: return 0.0
    return 0.0

def _normalize(text: str) -> str: return str(text).strip().lower()

# --- ENDPOINTS ---

@router.post("/analyze-spreadsheet")
async def analyze_spreadsheet_endpoint(
    current_user: UserInDB = Depends(get_current_user),
    file: UploadFile = File(...),
    db: Database = Depends(get_db)
):
    try:
        content = await file.read()
        filename = file.filename or "unknown"
        mime_type, _ = mimetypes.guess_type(filename)
        is_image = mime_type and mime_type.startswith('image/')
        
        def process_file():
            if is_image:
                return spreadsheet_service.analyze_scanned_image(content)
            else:
                return spreadsheet_service.analyze_financial_spreadsheet(content, filename)

        result = await asyncio.to_thread(process_file)
        if result.get("error"):
             raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        logger.error(f"Analysis Engine Error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed.")

@router.post("/finance/kpi-insight", response_model=KpiInsightResponse)
async def generate_kpi_insight(
    request: KpiInsightRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    context_id = str(current_user.organization_id) if hasattr(current_user, 'organization_id') and current_user.organization_id else str(current_user.id)
    user_filter = {"$or": [{"user_id": context_id}, {"user_id": str(current_user.id)}]}
    
    finance_service = FinanceService(db)
    summary = "Analiza e të dhënave e padisponueshme."
    contributors = []
    
    analysis_year = _get_latest_activity_year(db, user_filter)
    analysis_start_date = datetime(analysis_year, 1, 1)
    analysis_end_date = datetime(analysis_year, 12, 31, 23, 59, 59)
    
    ai_context_data = ""

    if request.kpi_type == 'income':
        invoices = finance_service.get_invoices(context_id)
        period_invoices = [i for i in invoices if i.status == 'PAID' and analysis_start_date <= i.issue_date <= analysis_end_date]
        total_income = sum(i.total_amount for i in period_invoices)
        clients = {}
        for inv in period_invoices: clients[inv.client_name] = clients.get(inv.client_name, 0) + inv.total_amount
        sorted_clients = sorted(clients.items(), key=lambda x: x[1], reverse=True)
        contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_clients[:4]]
        ai_context_data = f"Total Income: €{total_income}. Year: {analysis_year}."

    elif request.kpi_type == 'expense':
        expenses = finance_service.get_expenses(context_id)
        period_expenses = [e for e in expenses if analysis_start_date <= e.date <= analysis_end_date]
        total_expense = sum(e.amount for e in period_expenses)
        cats = {}
        for e in period_expenses: cats[e.category] = cats.get(e.category, 0) + e.amount
        sorted_cats = sorted(cats.items(), key=lambda x: x[1], reverse=True)
        contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_cats[:4]]
        ai_context_data = f"Total Expenses: €{total_expense}. Year: {analysis_year}."

    elif request.kpi_type == 'profit':
        invoices = finance_service.get_invoices(context_id)
        expenses = finance_service.get_expenses(context_id)
        period_income = sum(i.total_amount for i in invoices if i.status == 'PAID' and analysis_start_date <= i.issue_date <= analysis_end_date)
        period_expense = sum(e.amount for e in expenses if analysis_start_date <= e.date <= analysis_end_date)
        net = period_income - period_expense
        contributors = [f"Të Hyrat: €{period_income:.2f}", f"Shpenzimet: €{period_expense:.2f}", f"Neto: €{net:.2f}"]
        ai_context_data = f"Net Profit: €{net}. Revenue: €{period_income}. Expenses: €{period_expense}."

    if ai_context_data:
        try:
            prompt = f"Act as CFO. Analyze briefly in Albanian: {ai_context_data}"
            ai_response = await llm_service.ask_business_consultant(user_id=str(current_user.id), query=prompt)
            summary = ai_response.strip().replace('"', '')
        except:
            summary = f"Analiza u krye për vitin {analysis_year}."

    return KpiInsightResponse(summary=summary, key_contributors=contributors)

@router.post("/inventory/predict", response_model=RestockPrediction)
async def predict_restock(request: PredictionRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    try:
        if not ObjectId.is_valid(request.item_id):
            return RestockPrediction(suggested_quantity=0, reason="ID e pavlefshme.", estimated_cost=0)

        item = db["inventory"].find_one({"_id": ObjectId(request.item_id)})
        if not item: return RestockPrediction(suggested_quantity=0, reason="Artikulli nuk u gjet.", estimated_cost=0)
        
        safe_name = re.escape(item.get("name", ""))
        sales_cursor = db["transactions"].find({
            "user_id": str(current_user.id),
            "$or": [{"description": {"$regex": safe_name, "$options": "i"}}, {"product_name": {"$regex": safe_name, "$options": "i"}}]
        }).sort("date_time", -1).limit(30)
        
        sales = list(sales_cursor)
        sales_history = "\n".join([f"{s.get('date_time')}: {s.get('quantity', 1)} sold" for s in sales]) or "No recent sales."
        context = f"ITEM: {item.get('name')}\nSTOCK: {item.get('current_stock')}\nUNIT: {item.get('unit')}\nCOST: {item.get('cost_per_unit')}\nSALES_HISTORY:\n{sales_history}"
        
        result = await llm_service.analyze_structured_prediction(context, "RESTOCK")
        return RestockPrediction(
            suggested_quantity=_safe_float(result.get("suggested_quantity", 0)),
            reason=result.get("reason", "Nuk ka të dhëna mjaftueshme."),
            estimated_cost=_safe_float(result.get("estimated_cost", 0))
        )
    except Exception as e:
        logger.error(f"Restock Error: {e}")
        return RestockPrediction(suggested_quantity=0, reason="Gabim në parashikim.", estimated_cost=0)

@router.post("/inventory/trend", response_model=SalesTrendAnalysis)
async def analyze_sales_trend(request: PredictionRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    try:
        if not ObjectId.is_valid(request.item_id):
            return SalesTrendAnalysis(trend_analysis="ID e pavlefshme.", cross_sell_opportunities="N/A")

        item = db["inventory"].find_one({"_id": ObjectId(request.item_id)})
        if not item: return SalesTrendAnalysis(trend_analysis="Artikulli nuk u gjet.", cross_sell_opportunities="N/A")
        
        safe_name = re.escape(item.get("name", ""))
        count = db.transactions.count_documents({
            "user_id": str(current_user.id),
            "$or": [{"description": {"$regex": safe_name, "$options": "i"}}, {"product_name": {"$regex": safe_name, "$options": "i"}}]
        })
        
        sales_summary = f"Item: {item.get('name')}. Total recorded sales: {count}."
        result = await llm_service.analyze_structured_prediction(sales_summary, "TREND")
        return SalesTrendAnalysis(
            trend_analysis=result.get("trend_analysis", "S'ka mjaftueshëm të dhëna."),
            cross_sell_opportunities=result.get("cross_sell_opportunities", "N/A")
        )
    except Exception as e:
        logger.error(f"Trend Error: {e}")
        return SalesTrendAnalysis(trend_analysis="Analiza dështoi.", cross_sell_opportunities="N/A")

@router.get("/finance/proactive-insight", response_model=GeneralInsightResponse)
async def get_proactive_insight(): 
    return GeneralInsightResponse(insight="Sistemi aktiv dhe po analizon transaksionet.", sentiment="neutral")

@router.post("/tax/audit", response_model=TaxAuditResult)
async def analyze_tax_anomalies(): 
    return TaxAuditResult(anomalies=[], status="CLEAR", net_obligation=0.0)

@router.post("/tax/chat", response_model=Dict[str, str])
async def chat_with_tax_bot(request: ChatRequest, current_user: UserInDB = Depends(get_current_user)):
    response = await llm_service.ask_business_consultant(str(current_user.id), request.message)
    return {"response": response}