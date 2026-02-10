# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V6.5 (UNIFIED AI INSIGHTS)
# 1. FIXED: AI Summaries for all KPI cards now receive calculated data for context.
# 2. FIXED: Implemented Keyword Intersector for COGS matching.
# 3. STATUS: 100% Production Ready.

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

from app.core.db import get_db
from app.api.endpoints.dependencies import get_current_user
from app.models.user import UserInDB
from app.services.finance_service import FinanceService
from app.services import llm_service
from app.services import spreadsheet_service

router = APIRouter()
logger = logging.getLogger(__name__)

# --- MODELS ---
class KpiInsightRequest(BaseModel): 
    kpi_type: str 
    year: Optional[int] = None 

class KpiInsightResponse(BaseModel): 
    summary: str
    key_contributors: List[str]

class GeneralInsightResponse(BaseModel): 
    insight: str
    sentiment: str 

class ChatRequest(BaseModel): 
    message: str

# --- HELPERS ---

def _normalize(text: str) -> str:
    if not text: return ""
    return re.sub(r'[^\w\s]', '', str(text).lower()).strip()

def _get_resilient_filter(context_id: str) -> Dict:
    try:
        oid = ObjectId(context_id)
        return {"$or": [{"user_id": context_id}, {"user_id": oid}, {"organization_id": context_id}, {"organization_id": oid}]}
    except:
        return {"$or": [{"user_id": context_id}, {"organization_id": context_id}]}

def _is_fuzzy_match(recipe_name: str, sale_name: str) -> bool:
    r_norm = _normalize(recipe_name)
    s_norm = _normalize(sale_name)
    if not r_norm or not s_norm: return False
    r_words = {w for w in r_norm.split() if len(w) > 2}
    s_words = {w for w in s_norm.split() if len(w) > 2}
    return not r_words.isdisjoint(s_words) or r_norm in s_norm or s_norm in r_norm

def _get_latest_activity_year(db: Database, context_id: str) -> int:
    found_years = []
    f = _get_resilient_filter(context_id)
    curr = datetime.utcnow().year
    try:
        inv = db.invoices.find_one(f, sort=[("issue_date", -1)])
        if inv and isinstance(inv.get("issue_date"), datetime): found_years.append(inv["issue_date"].year)
        exp = db.expenses.find_one(f, sort=[("date", -1)])
        if exp and isinstance(exp.get("date"), datetime): found_years.append(exp["date"].year)
        tx = db.transactions.find_one(f, sort=[("date_time", -1)])
        if tx and isinstance(tx.get("date_time"), datetime): found_years.append(tx["date_time"].year)
    except: pass
    valid = [y for y in found_years if y <= curr]
    return max(valid) if valid else curr

def _safe_float(val: Any) -> float:
    if isinstance(val, (int, float)): return float(val)
    if isinstance(val, str):
        cleaned = re.sub(r'[^\d\.]', '', val)
        try: return float(cleaned) if cleaned else 0.0
        except: return 0.0
    return 0.0

@router.post("/finance/kpi-insight", response_model=KpiInsightResponse)
async def generate_kpi_insight(request: KpiInsightRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    context_id = str(current_user.organization_id) if current_user.organization_id else str(current_user.id)
    resilient_filter = _get_resilient_filter(context_id)
    analysis_year = request.year or _get_latest_activity_year(db, context_id)
    start_dt = datetime(analysis_year, 1, 1); end_dt = datetime(analysis_year, 12, 31, 23, 59, 59)
    summary, contributors, ai_data = "Analiza e padisponueshme.", [], ""

    if request.kpi_type == 'income':
        invoices = list(db.invoices.find({**resilient_filter, "status": "PAID", "issue_date": {"$gte": start_dt, "$lte": end_dt}}))
        total = sum(_safe_float(i.get("total_amount", 0)) for i in invoices)
        ai_data = f"Të hyrat totale për vitin {analysis_year} janë €{total}. Ky është rezultat i {len(invoices)} faturave të paguara."
        contributors = [f"Fatura: {len(invoices)}", f"Viti: {analysis_year}"]
        
    elif request.kpi_type == 'expense':
        expenses = list(db.expenses.find({**resilient_filter, "date": {"$gte": start_dt, "$lte": end_dt}}))
        total = sum(_safe_float(e.get("amount", 0)) for e in expenses)
        ai_data = f"Shpenzimet totale për vitin {analysis_year} janë €{total}. Janë regjistruar {len(expenses)} transaksione shpenzimesh."
        contributors = [f"Transaksione: {len(expenses)}", f"Viti: {analysis_year}"]

    elif request.kpi_type == 'profit':
        inc_list = list(db.invoices.find({**resilient_filter, "status": "PAID", "issue_date": {"$gte": start_dt, "$lte": end_dt}}))
        exp_list = list(db.expenses.find({**resilient_filter, "date": {"$gte": start_dt, "$lte": end_dt}}))
        inc = sum(_safe_float(i.get("total_amount", 0)) for i in inc_list)
        exp = sum(_safe_float(e.get("amount", 0)) for e in exp_list)
        ai_data = f"Analiza e Fitimit Neto për {analysis_year}: Të hyrat €{inc}, Shpenzimet €{exp}, Fitimi €{inc-exp}."
        contributors = [f"Fitimi Neto: €{inc-exp}", f"Të hyrat: €{inc}"]

    elif request.kpi_type == 'cogs':
        inv_items = list(db["inventory"].find(resilient_filter))
        cost_map = {str(i["_id"]): _safe_float(i.get("cost_per_unit", 0)) for i in inv_items}
        recipes = list(db["recipes"].find(resilient_filter))
        prod_costs = {r["product_name"]: sum(_safe_float(ing.get("quantity_required", 0)) * cost_map.get(str(ing.get("inventory_item_id")), 0) for ing in r.get("ingredients", [])) for r in recipes}
        
        sales = list(db["transactions"].find({**resilient_filter, "date_time": {"$gte": start_dt, "$lte": end_dt}}))
        total_cogs, matched_count = 0.0, 0
        for s in sales:
            sale_name = s.get("product_name") or s.get("description") or ""
            unit_cost = 0.0
            for r_name, r_cost in prod_costs.items():
                if _is_fuzzy_match(r_name, sale_name):
                    unit_cost = r_cost; matched_count += 1; break
            total_cogs += (unit_cost * _safe_float(s.get("quantity", 1)))
            
        if total_cogs > 0:
            ai_data = f"Kostoja e mallrave (COGS) për {analysis_year} është llogaritur në €{total_cogs:.2f} bazuar në {matched_count} shitje të përputhura."
            contributors = [f"COGS: €{total_cogs:.2f}", f"Përputhje: {matched_count}"]
        else:
            summary = "Nuk u identifikuan receta të lidhura me shitjet. Sigurohuni që emrat në receta përputhen me produktet e shitura."

    if ai_data:
        try:
            summary = await llm_service.ask_business_consultant(str(current_user.id), f"Vepro si CFO. Analizo këtë KPI shkurt në Shqip: {ai_data}")
        except Exception as e:
            logger.error(f"AI KPI Insight failed: {e}")
            summary = ai_data # Fallback to raw data
            
    return KpiInsightResponse(summary=summary, key_contributors=contributors)

@router.post("/tax/chat", response_model=Dict[str, str])
async def chat_with_tax_bot(request: ChatRequest, current_user: UserInDB = Depends(get_current_user)):
    response = await llm_service.ask_business_consultant(str(current_user.id), request.message)
    return {"response": response}

@router.post("/analyze-spreadsheet")
async def analyze_spreadsheet_endpoint(file: UploadFile = File(...), db: Database = Depends(get_db)):
    try:
        content = await file.read(); filename = file.filename or "unknown"
        mime_type, _ = mimetypes.guess_type(filename); is_image = mime_type and mime_type.startswith('image/')
        def process():
            if is_image: return spreadsheet_service.analyze_scanned_image(content)
            return spreadsheet_service.analyze_financial_spreadsheet(content, filename)
        result = await asyncio.to_thread(process)
        return result
    except Exception as e:
        logger.error(f"Error: {e}"); raise HTTPException(status_code=500, detail="Dështoi.")