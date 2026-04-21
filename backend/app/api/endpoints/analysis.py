# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V7.0 (DUAL-PILLAR LEGAL + BUSINESS)

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from pymongo.database import Database
from bson import ObjectId
import re
import logging
import asyncio
import mimetypes

# --- DIRECT IMPORTS FOR LINTER STABILITY ---
from app.core.db import get_db
from app.api.endpoints.dependencies import get_current_user
from app.models.user import UserInDB
from app.services.finance_service import FinanceService
from app.services import llm_service
from app.services import spreadsheet_service
from app.services.analytics_service import AnalyticsService
from app.services import vector_store_service  # <--- ADDED FOR LEGAL RETRIEVAL
from app.models.finance import AnalyticsDashboardData

router = APIRouter()
logger = logging.getLogger(__name__)

# --- MODELS ---

class TaxAuditRequest(BaseModel): 
    month: int
    year: int

class ChatRequest(BaseModel): 
    message: str

class PredictionRequest(BaseModel): 
    item_id: str

class KpiInsightRequest(BaseModel): 
    kpi_type: str 
    year: Optional[int] = None 

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

# --- HELPERS ---

def _normalize(text: str) -> str:
    if not text: return ""
    return re.sub(r'[^\w\s]', '', str(text).lower()).strip()

def _get_resilient_filter(context_id: str) -> Dict:
    try:
        oid = ObjectId(context_id)
        return {"$or": [
            {"user_id": context_id}, 
            {"user_id": oid}, 
            {"organization_id": context_id}, 
            {"organization_id": oid}
        ]}
    except:
        return {"$or": [
            {"user_id": context_id}, 
            {"organization_id": context_id}
        ]}

def _safe_float(val: Any) -> float:
    if isinstance(val, (int, float)): return float(val)
    if isinstance(val, str):
        cleaned = re.sub(r'[^\d\.]', '', val)
        try: return float(cleaned) if cleaned else 0.0
        except: return 0.0
    return 0.0

def _get_latest_activity_year(db: Database, context_id: str) -> int:
    found_years = []
    f = _get_resilient_filter(context_id)
    current_year = datetime.utcnow().year
    try:
        inv = db.invoices.find_one(f, sort=[("issue_date", -1)])
        if inv and isinstance(inv.get("issue_date"), datetime): found_years.append(inv["issue_date"].year)
        exp = db.expenses.find_one(f, sort=[("date", -1)])
        if exp and isinstance(exp.get("date"), datetime): found_years.append(exp["date"].year)
        tx = db.transactions.find_one(f, sort=[("date_time", -1)])
        if tx and isinstance(tx.get("date_time"), datetime): found_years.append(tx["date_time"].year)
    except: pass
    
    valid_years = [y for y in found_years if y <= current_year]
    return max(valid_years) if valid_years else current_year

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
        logger.error(f"Spreadsheet Analysis Error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed.")

@router.post("/finance/kpi-insight", response_model=KpiInsightResponse)
async def generate_kpi_insight(request: KpiInsightRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    context_id = str(current_user.organization_id) if current_user.organization_id else str(current_user.id)
    finance_service = FinanceService(db)
    resilient_filter = _get_resilient_filter(context_id)
    analysis_year = request.year or _get_latest_activity_year(db, context_id)
    
    start_dt = datetime(analysis_year, 1, 1)
    end_dt = datetime(analysis_year, 12, 31, 23, 59, 59)
    summary = "Analiza e të dhënave e padisponueshme."
    contributors = []
    ai_context_data = ""

    # --- BUSINESS DATA CALCULATION (unchanged) ---
    if request.kpi_type == 'income':
        invoices = finance_service.get_invoices(context_id, year=analysis_year)
        period_data = [i for i in invoices if i.status == 'PAID']
        total = sum(i.total_amount for i in period_data)
        ai_context_data = f"Të hyrat totale për vitin {analysis_year} janë €{total:.2f}. Bazuar në {len(period_data)} fatura."
        contributors = [f"Fatura të paguara: {len(period_data)}", f"Viti: {analysis_year}"]
        
    elif request.kpi_type == 'expense':
        expenses = finance_service.get_expenses(context_id, year=analysis_year)
        total = sum(e.amount for e in expenses)
        ai_context_data = f"Shpenzimet totale për vitin {analysis_year} janë €{total:.2f}. Janë regjistruar {len(expenses)} transaksione."
        contributors = [f"Shpenzime të regjistruara: {len(expenses)}", f"Viti: {analysis_year}"]

    elif request.kpi_type == 'profit':
        invoices = finance_service.get_invoices(context_id, year=analysis_year)
        expenses = finance_service.get_expenses(context_id, year=analysis_year)
        inc = sum(i.total_amount for i in invoices if i.status == 'PAID')
        exp = sum(e.amount for e in expenses)
        profit = inc - exp
        margin = (profit / inc * 100) if inc > 0 else 0
        ai_context_data = f"Analiza e Profitit {analysis_year}: Të hyrat €{inc:.2f}, Shpenzimet €{exp:.2f}, Fitimi Neto €{profit:.2f}."
        contributors = [f"Fitimi Neto: €{profit:.2f}", f"Marzha: {margin:.1f}%"]

    elif request.kpi_type == 'cogs':
        invoices = finance_service.get_invoices(context_id, year=analysis_year)
        
        business_profile = db.business_profiles.find_one({"user_id": ObjectId(context_id)})
        margin = business_profile.get("target_margin", 30) if business_profile else 30
        
        total_cogs = 0.0
        item_count = 0
        
        for inv in invoices:
            for item in inv.items:
                item_count += 1
                if item.inventory_item_id:
                    try:
                        inv_item = db.inventory.find_one({"_id": ObjectId(item.inventory_item_id)})
                        if inv_item:
                            cost = inv_item.get("cost_per_unit", 0)
                            total_cogs += cost * item.quantity
                            continue
                    except:
                        pass
                cost = item.unit_price / (1 + margin / 100)
                total_cogs += cost * item.quantity
        
        expenses = finance_service.get_expenses(context_id, year=analysis_year)
        cogs_categories = ['cogs_inventory', 'cogs_raw_material', 'furnizim', 'inventory', 'mall', 'stock', 'blerje']
        cogs_expenses_total = 0.0
        
        for exp in expenses:
            category = (exp.category or '').lower()
            if any(cat in category for cat in cogs_categories):
                cogs_expenses_total += exp.amount
                total_cogs += exp.amount
        
        if total_cogs > 0:
            ai_context_data = f"Kosto e Mallrave të Shitura (COGS) për vitin {analysis_year} është €{total_cogs:.2f}. Kjo bazohet në {item_count} artikuj të shitur dhe €{cogs_expenses_total:.2f} shpenzime të lidhura me inventarin."
            contributors = [
                f"Kosto Totale: €{total_cogs:.2f}",
                f"Artikuj të shitur: {item_count}",
                f"Shpenzime inventari: €{cogs_expenses_total:.2f}",
                f"Marzha e aplikuar: {margin}%"
            ]
        else:
            ai_context_data = f"Nuk ka të dhëna për Koston e Mallrave të Shitura (COGS) për vitin {analysis_year}. Shtoni fatura me artikuj për të filluar llogaritjen."
            contributors = [f"Viti: {analysis_year}", "Status: Pa të dhëna"]

    # --- NEW: RETRIEVE LEGAL CONTEXT (Dual‑Pillar) ---
    legal_context = ""
    try:
        # Query legal knowledge base using the KPI type as the search term
        legal_results = vector_store_service.query_public_library(
            query_text=request.kpi_type,
            agent_type='legal',   # <--- CRITICAL: use legal collection
            n_results=3
        )
        if legal_results:
            legal_context = "\n--- BAZA LIGJORE (KOSOVË) ---\n"
            for idx, doc in enumerate(legal_results, 1):
                legal_context += f"LIGJ {idx}: {doc.get('content', '')}\n"
    except Exception as e:
        logger.warning(f"Legal context retrieval failed: {e}")

    # --- BUILD PROMPT WITH BUSINESS + LEGAL ---
    if ai_context_data:
        # Business data exists
        full_context = f"--- TË DHËNAT E BIZNESIT ---\n{ai_context_data}\n"
        if legal_context:
            full_context += legal_context
        else:
            full_context += "\n--- BAZA LIGJORE ---\nNuk u gjetën ligje specifike për këtë KPI.\n"
        
        prompt = (
            f"Vepro si CFO. Bazuar në të dhënat e biznesit dhe ligjet e Kosovës më poshtë, analizo shkurt KPI-n '{request.kpi_type}' në gjuhën shqipe.\n"
            f"Përdor informacionin ligjor për të vlerësuar përputhshmërinë dhe për të sugjeruar përmirësime.\n\n"
            f"{full_context}\n\n"
            f"Përgjigju në 2-3 fjali."
        )
    else:
        # No business data – instruct LLM to report absence
        full_context = "Nuk ka asnjë faturë, shpenzim apo transaksion për këtë periudhë."
        prompt = (
            f"Vepro si CFO. Nuk ka të dhëna financiare për KPI-n '{request.kpi_type}' në sistem.\n"
            f"Përgjigju në gjuhën shqipe duke thënë qartë se nuk ka informacion të mjaftueshëm për të kryer analizën. "
            f"Mos jep leksione të përgjithshme ligjore nëse nuk ke fakte biznesi.\n\n"
            f"{full_context}"
        )

    # --- CALL LLM ---
    try:
        summary = await llm_service.ask_business_consultant(
            user_id=str(current_user.id),
            query=prompt
        )
    except Exception as e:
        logger.error(f"KPI insight LLM failed: {e}")
        summary = f"Analiza përfundoi për vitin {analysis_year} por pati një gabim teknik."

    return KpiInsightResponse(summary=summary, key_contributors=contributors)

@router.post("/inventory/predict", response_model=RestockPrediction)
async def predict_restock(request: PredictionRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    try:
        item = db["inventory"].find_one({"_id": ObjectId(request.item_id)})
        if not item: return RestockPrediction(suggested_quantity=0, reason="Artikulli nuk u gjet.", estimated_cost=0)
        context_id = str(current_user.organization_id) if current_user.organization_id else str(current_user.id)
        safe_name = re.escape(item.get("name", ""))
        sales = list(db["transactions"].find({**_get_resilient_filter(context_id), "$or": [{"description": {"$regex": safe_name, "$options": "i"}}, {"product_name": {"$regex": safe_name, "$options": "i"}}]}).sort("date_time", -1).limit(30))
        history = "\n".join([f"{s.get('date_time')}: {s.get('quantity', 1)} sold" for s in sales])
        result = await llm_service.analyze_structured_prediction(f"ITEM: {item.get('name')}\nSTOCK: {item.get('current_stock')}\nSALES:\n{history}", "RESTOCK")
        if result and isinstance(result, dict):
            return RestockPrediction(suggested_quantity=_safe_float(result.get("suggested_quantity", 0)), reason=str(result.get("reason", "Nuk ka të dhëna.")), estimated_cost=_safe_float(result.get("estimated_cost", 0)))
        return RestockPrediction(suggested_quantity=0, reason="Gabim.", estimated_cost=0)
    except: return RestockPrediction(suggested_quantity=0, reason="Gabim teknik.", estimated_cost=0)

@router.post("/inventory/trend", response_model=SalesTrendAnalysis)
async def analyze_sales_trend(request: PredictionRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    try:
        item = db["inventory"].find_one({"_id": ObjectId(request.item_id)})
        if not item: return SalesTrendAnalysis(trend_analysis="Mungon.", cross_sell_opportunities="N/A")
        context_id = str(current_user.organization_id) if current_user.organization_id else str(current_user.id)
        count = db.transactions.count_documents({**_get_resilient_filter(context_id), "$or": [{"description": {"$regex": re.escape(item.get("name", "")), "$options": "i"}}, {"product_name": {"$regex": re.escape(item.get("name", "")), "$options": "i"}}]})
        result = await llm_service.analyze_structured_prediction(f"Item: {item.get('name')}. Sales: {count}.", "TREND")
        if result and isinstance(result, dict):
            return SalesTrendAnalysis(trend_analysis=str(result.get("trend_analysis", "Trend stabil.")), cross_sell_opportunities=str(result.get("cross_sell_opportunities", "N/A")))
        return SalesTrendAnalysis(trend_analysis="Dështoi.", cross_sell_opportunities="N/A")
    except: return SalesTrendAnalysis(trend_analysis="Gabim.", cross_sell_opportunities="N/A")

@router.get("/finance/proactive-insight", response_model=GeneralInsightResponse)
async def get_proactive_insight(
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db),
    case_id: Optional[str] = Query(None)
):
    if case_id:
        filter_dict = {"case_id": case_id}
    else:
        context_id = str(current_user.organization_id) if current_user.organization_id else str(current_user.id)
        filter_dict = _get_resilient_filter(context_id)
    
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_transactions = list(db.transactions.find({
        **filter_dict,
        "date_time": {"$gte": seven_days_ago}
    }))
    
    if not recent_transactions:
        return GeneralInsightResponse(
            insight="Aktivitet i kufizuar në 7 ditët e fundit. Shfaqni transaksione për analizë më të thellë.",
            sentiment="neutral"
        )
    
    total_sales = sum(t.get("total_amount", t.get("amount", 0)) for t in recent_transactions)
    
    product_sales = {}
    for t in recent_transactions:
        name = t.get("product_name") or t.get("description") or "Unknown"
        amount = t.get("total_amount", t.get("amount", 0))
        product_sales[name] = product_sales.get(name, 0) + amount
    top_product = max(product_sales.items(), key=lambda x: x[1]) if product_sales else (None, 0)
    
    try:
        prompt = (f"Generate a short proactive business insight (in Albanian) based on the last 7 days: "
                  f"total sales €{total_sales:.2f}, top product '{top_product[0]}' with €{top_product[1]:.2f}. "
                  f"Suggest one actionable recommendation.")
        insight = await llm_service.ask_business_consultant(str(current_user.id), prompt)
        sentiment = "positive" if total_sales > 0 else "neutral"
        return GeneralInsightResponse(insight=insight, sentiment=sentiment)
    except Exception as e:
        logger.error(f"Proactive insight LLM failed: {e}")
        return GeneralInsightResponse(
            insight=f"€{total_sales:.2f} shitje në 7 ditët e fundit. Produkti kryesor: {top_product[0]}.",
            sentiment="neutral"
        )

@router.post("/tax/audit", response_model=TaxAuditResult)
async def analyze_tax_anomalies(): 
    return TaxAuditResult(anomalies=[], status="CLEAR", net_obligation=0.0)

@router.post("/tax/chat", response_model=Dict[str, str])
async def chat_with_tax_bot(request: ChatRequest, current_user: UserInDB = Depends(get_current_user)):
    response = await llm_service.ask_business_consultant(str(current_user.id), request.message)
    return {"response": response}