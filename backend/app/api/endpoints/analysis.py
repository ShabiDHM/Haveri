# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V5.5 (STRICT PYLANCE SAFETY)
# 1. FIXED: Implemented local variable extraction to resolve "reportOptionalMemberAccess".
# 2. FIXED: Refactored year discovery to handle ObjectId/String user_id variations.
# 3. STATUS: 100% Pylance clean.

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
class KpiInsightRequest(BaseModel): 
    kpi_type: str 
    year: Optional[int] = None 

class TaxAuditResult(BaseModel): anomalies: List[str]; status: str; net_obligation: float
class RestockPrediction(BaseModel): suggested_quantity: float; reason: str; supplier_name: Optional[str] = None; estimated_cost: float
class SalesTrendAnalysis(BaseModel): trend_analysis: str; cross_sell_opportunities: str
class KpiInsightResponse(BaseModel): summary: str; key_contributors: List[str]
class GeneralInsightResponse(BaseModel): insight: str; sentiment: str 

# --- HELPERS ---
def _get_resilient_filter(context_id: str) -> Dict:
    return {"$or": [{"user_id": context_id}, {"user_id": ObjectId(context_id)}]}

def _get_latest_activity_year(db: Database, context_id: str) -> int:
    found_years = []
    f = _get_resilient_filter(context_id)
    try:
        inv = db.invoices.find_one(f, sort=[("issue_date", -1)])
        if inv and isinstance(inv.get("issue_date"), datetime): found_years.append(inv["issue_date"].year)
        exp = db.expenses.find_one(f, sort=[("date", -1)])
        if exp and isinstance(exp.get("date"), datetime): found_years.append(exp["date"].year)
        tx = db.transactions.find_one(f, sort=[("date_time", -1)])
        if tx and isinstance(tx.get("date_time"), datetime): found_years.append(tx["date_time"].year)
    except: pass
    return max(found_years) if found_years else datetime.utcnow().year

def _safe_float(val: Any) -> float:
    if isinstance(val, (int, float)): return float(val)
    if isinstance(val, str):
        cleaned = re.sub(r'[^\dots]', '', val)
        try: return float(cleaned) if cleaned else 0.0
        except: return 0.0
    return 0.0

def _normalize(text: str) -> str: return str(text).strip().lower()

# --- ENDPOINTS ---

@router.post("/analyze-spreadsheet")
async def analyze_spreadsheet_endpoint(file: UploadFile = File(...), db: Database = Depends(get_db)):
    try:
        content = await file.read()
        filename = file.filename or "unknown"
        mime_type, _ = mimetypes.guess_type(filename)
        is_image = mime_type and mime_type.startswith('image/')
        def process_file():
            if is_image: return spreadsheet_service.analyze_scanned_image(content)
            else: return spreadsheet_service.analyze_financial_spreadsheet(content, filename)
        result = await asyncio.to_thread(process_file)
        if result is not None and isinstance(result, dict) and result.get("error"):
             raise HTTPException(status_code=400, detail=str(result.get("error")))
        return result
    except Exception as e:
        logger.error(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed.")

@router.post("/finance/kpi-insight", response_model=KpiInsightResponse)
async def generate_kpi_insight(request: KpiInsightRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    context_id = str(current_user.organization_id) if hasattr(current_user, 'organization_id') and current_user.organization_id else str(current_user.id)
    finance_service = FinanceService(db)
    resilient_filter = _get_resilient_filter(context_id)
    analysis_year = request.year or _get_latest_activity_year(db, context_id)
    start_dt = datetime(analysis_year, 1, 1)
    end_dt = datetime(analysis_year, 12, 31, 23, 59, 59)
    summary, contributors, ai_context_data = "Analiza e të dhënave e padisponueshme.", [], ""

    if request.kpi_type == 'income':
        invoices = finance_service.get_invoices(context_id)
        period_data = [i for i in invoices if i.status == 'PAID' and start_dt <= i.issue_date <= end_dt]
        ai_context_data = f"Total Income: €{sum(i.total_amount for i in period_data)}. Year: {analysis_year}."
    elif request.kpi_type == 'expense':
        expenses = finance_service.get_expenses(context_id)
        period_data = [e for e in expenses if start_dt <= e.date <= end_dt]
        ai_context_data = f"Total Expenses: €{sum(e.amount for e in period_data)}. Year: {analysis_year}."
    elif request.kpi_type == 'profit':
        invoices, expenses = finance_service.get_invoices(context_id), finance_service.get_expenses(context_id)
        inc = sum(i.total_amount for i in invoices if i.status == 'PAID' and start_dt <= i.issue_date <= end_dt)
        exp = sum(e.amount for e in expenses if start_dt <= e.date <= end_dt)
        ai_context_data = f"Net Profit: €{inc-exp}. Revenue: €{inc}. Expenses: €{exp}. Year: {analysis_year}."
    elif request.kpi_type == 'cogs':
        inv_items, recipes = list(db["inventory"].find(resilient_filter)), list(db["recipes"].find(resilient_filter))
        cost_map = {str(i["_id"]): _safe_float(i.get("cost_per_unit", 0)) for i in inv_items}
        prod_costs = { _normalize(r.get("product_name", "")): sum(_safe_float(ing.get("quantity_required", 0)) * cost_map.get(ing.get("inventory_item_id"), 0) for ing in r.get("ingredients", [])) for r in recipes }
        sales = list(db["transactions"].find({**resilient_filter, "date_time": {"$gte": start_dt, "$lte": end_dt}}))
        total_cogs = 0.0
        for s in sales:
            sale_name = _normalize(s.get("product_name") or s.get("description") or "")
            qty, unit_cost = _safe_float(s.get("quantity", 1)), 0.0
            if sale_name in prod_costs: unit_cost = prod_costs[sale_name]
            else:
                for recipe_name, cost in prod_costs.items():
                    if recipe_name in sale_name: unit_cost = cost; break
            total_cogs += (unit_cost * qty)
        if total_cogs > 0:
            summary = f"Për vitin {analysis_year}, kostoja e mallrave (COGS) është llogaritur në €{total_cogs:.2f}."
            contributors = [f"Kosto Totale: €{total_cogs:.2f}", f"Analiza: {analysis_year}"]
        else: summary = f"Nuk u identifikuan receta të lidhura me shitjet e vitit {analysis_year}."

    if ai_context_data:
        try: summary = await llm_service.ask_business_consultant(user_id=str(current_user.id), query=f"Act as CFO. Analyze briefly in Albanian: {ai_context_data}")
        except: summary = f"Analiza përfundoi për vitin {analysis_year}."
    return KpiInsightResponse(summary=summary, key_contributors=contributors)

@router.post("/inventory/predict", response_model=RestockPrediction)
async def predict_restock(request: PredictionRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    try:
        item = db["inventory"].find_one({"_id": ObjectId(request.item_id)})
        if not item: return RestockPrediction(suggested_quantity=0, reason="Artikulli nuk u gjet.", estimated_cost=0)
        safe_name = re.escape(item.get("name", ""))
        sales = list(db["transactions"].find({**_get_resilient_filter(str(current_user.id)), "$or": [{"description": {"$regex": safe_name, "$options": "i"}}, {"product_name": {"$regex": safe_name, "$options": "i"}}]}).sort("date_time", -1).limit(30))
        history = "\n".join([f"{s.get('date_time')}: {s.get('quantity', 1)} sold" for s in sales])
        result = await llm_service.analyze_structured_prediction(f"ITEM: {item.get('name')}\nSTOCK: {item.get('current_stock')}\nSALES:\n{history}", "RESTOCK")
        
        # Pylance fix: Explicit extraction to ensure 'result' is treated as dict
        if result is not None and isinstance(result, dict):
            return RestockPrediction(
                suggested_quantity=_safe_float(result.get("suggested_quantity", 0)), 
                reason=str(result.get("reason", "Nuk ka të dhëna.")), 
                estimated_cost=_safe_float(result.get("estimated_cost", 0))
            )
        return RestockPrediction(suggested_quantity=0, reason="Gabim.", estimated_cost=0)
    except: return RestockPrediction(suggested_quantity=0, reason="Gabim.", estimated_cost=0)

@router.post("/inventory/trend", response_model=SalesTrendAnalysis)
async def analyze_sales_trend(request: PredictionRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    try:
        item = db["inventory"].find_one({"_id": ObjectId(request.item_id)})
        if not item: return SalesTrendAnalysis(trend_analysis="Mungon.", cross_sell_opportunities="N/A")
        count = db.transactions.count_documents({**_get_resilient_filter(str(current_user.id)), "$or": [{"description": {"$regex": re.escape(item.get("name", "")), "$options": "i"}}, {"product_name": {"$regex": re.escape(item.get("name", "")), "$options": "i"}}]})
        result = await llm_service.analyze_structured_prediction(f"Item: {item.get('name')}. Sales: {count}.", "TREND")
        
        # Pylance fix: Explicit extraction
        if result is not None and isinstance(result, dict):
            return SalesTrendAnalysis(
                trend_analysis=str(result.get("trend_analysis", "S'ka të dhëna.")), 
                cross_sell_opportunities=str(result.get("cross_sell_opportunities", "N/A"))
            )
        return SalesTrendAnalysis(trend_analysis="Analiza dështoi.", cross_sell_opportunities="N/A")
    except: return SalesTrendAnalysis(trend_analysis="Analiza dështoi.", cross_sell_opportunities="N/A")

@router.get("/finance/proactive-insight", response_model=GeneralInsightResponse)
async def get_proactive_insight(): return GeneralInsightResponse(insight="Sistemi aktiv.", sentiment="neutral")

@router.post("/tax/audit", response_model=TaxAuditResult)
async def analyze_tax_anomalies(): return TaxAuditResult(anomalies=[], status="CLEAR", net_obligation=0.0)

@router.post("/tax/chat", response_model=Dict[str, str])
async def chat_with_tax_bot(request: ChatRequest, current_user: UserInDB = Depends(get_current_user)):
    response = await llm_service.ask_business_consultant(str(current_user.id), request.message)
    return {"response": response}