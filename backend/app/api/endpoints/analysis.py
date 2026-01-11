# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V3.7 (FULL RESTORATION)
# 1. FIX: Restored the full logic for 'generate_kpi_insight' (Income, Expense, Profit, COGS) which was accidentally truncated.
# 2. INTEGRITY: Kept the robust 're.escape' fixes for Inventory/Sales endpoints.
# 3. RESULT: Smart Analyst now works for BOTH Financial KPIs and Inventory predictions.

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
from pymongo.database import Database
from bson import ObjectId
import re
import logging

from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from app.services.finance_service import FinanceService
from app.services import llm_service 

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

# --- HELPER ---
def _get_latest_activity_year(db: Database, user_filter: Dict) -> int:
    try:
        latest = db.invoices.find_one(user_filter, sort=[("issue_date", -1)])
        if latest and isinstance(latest.get("issue_date"), datetime):
            return latest["issue_date"].year
    except: pass
    return datetime.utcnow().year

def _safe_float(val: Any) -> float:
    try: return float(val)
    except: return 0.0

def _normalize(text: str) -> str: return str(text).strip().lower()

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
    
    date_filter = {"$gte": analysis_start_date, "$lte": analysis_end_date}
    
    ai_context_data = ""

    if request.kpi_type == 'income':
        invoices = finance_service.get_invoices(context_id)
        period_invoices = [i for i in invoices if i.status == 'PAID' and analysis_start_date <= i.issue_date <= analysis_end_date]
        total_income = sum(i.total_amount for i in period_invoices)
        
        clients = {}
        for inv in period_invoices: clients[inv.client_name] = clients.get(inv.client_name, 0) + inv.total_amount
        sorted_clients = sorted(clients.items(), key=lambda x: x[1], reverse=True)
        contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_clients[:4]]
        
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

    elif request.kpi_type == 'cogs':
        # 1. Fetch Inventory & Recipes
        inv_items = list(db["inventory"].find(user_filter, {"_id": 1, "name": 1, "cost_per_unit": 1}))
        recipes = list(db["recipes"].find(user_filter))
        
        cost_by_id = {str(i["_id"]): _safe_float(i.get("cost_per_unit", 0)) for i in inv_items}
        cost_by_name = {_normalize(i["name"]): _safe_float(i.get("cost_per_unit", 0)) for i in inv_items}
        
        product_costs = {} 
        for r in recipes:
            r_cost = 0.0
            for ing in r.get("ingredients", []):
                i_id = ing.get("inventory_item_id")
                qty = _safe_float(ing.get("quantity_required", 0))
                if i_id in cost_by_id: r_cost += cost_by_id[i_id] * qty
            if r_cost > 0: product_costs[_normalize(r.get("product_name", ""))] = r_cost

        # 2. Fetch Sales
        sales = list(db["transactions"].find({**user_filter, "$or": [{"date": date_filter}, {"date_time": date_filter}]}))
        
        total_cogs_inventory = 0.0
        item_cogs_breakdown = {}
        
        # 3. Calculate COGS
        for sale in sales:
            p_name_raw = sale.get("description") or sale.get("product_name") or ""
            p_name_norm = _normalize(p_name_raw)
            qty = _safe_float(sale.get("quantity", 1))
            unit_cost = 0.0
            
            if p_name_norm in product_costs: unit_cost = product_costs[p_name_norm]
            elif p_name_norm in cost_by_name: unit_cost = cost_by_name[p_name_norm]
            else:
                for r_name, r_cost in product_costs.items():
                    if r_name in p_name_norm or p_name_norm in r_name: 
                        unit_cost = r_cost; break
            
            if unit_cost == 0:
                for i_name, i_cost in cost_by_name.items():
                    if i_name in p_name_norm or p_name_norm in i_name: 
                        unit_cost = i_cost; break
            
            line_cost = unit_cost * qty
            total_cogs_inventory += line_cost
            if line_cost > 0: 
                item_cogs_breakdown[p_name_raw] = item_cogs_breakdown.get(p_name_raw, 0) + line_cost

        # 4. Fallback: Expense-Based COGS
        total_cogs_expenses = 0.0
        expense_breakdown = {}
        if total_cogs_inventory == 0:
            expenses = finance_service.get_expenses(context_id)
            cogs_keywords = ['furnizim', 'blerje malli', 'kosto', 'stock', 'import']
            for e in expenses:
                if analysis_start_date <= e.date <= analysis_end_date:
                    if any(kw in _normalize(e.category) for kw in cogs_keywords) or any(kw in _normalize(e.description or "") for kw in cogs_keywords):
                        total_cogs_expenses += e.amount
                        expense_breakdown[e.category] = expense_breakdown.get(e.category, 0) + e.amount

        # 5. Build Result
        if total_cogs_inventory > 0:
            sorted_cogs = sorted(item_cogs_breakdown.items(), key=lambda x: x[1], reverse=True)
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_cogs[:4]]
            ai_context_data = f"Calculated COGS (Recipe-based): €{total_cogs_inventory}. Year: {analysis_year}. Top Cost Drivers: {', '.join([c[0] for c in sorted_cogs[:3]])}."
        elif total_cogs_expenses > 0:
            sorted_exps = sorted(expense_breakdown.items(), key=lambda x: x[1], reverse=True)
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_exps[:4]]
            ai_context_data = f"Estimated COGS (Expense-based): €{total_cogs_expenses}. Year: {analysis_year}. Note: Precise inventory tracking missing."
        else:
            summary = f"Nuk u identifikua kosto për vitin {analysis_year}. Sigurohuni që keni 'Receta' të lidhura ose shpenzime me kategorinë 'Furnizime'."
            contributors = ["Shtoni Receta ose Kosto në Stok."]

    if ai_context_data:
        try:
            prompt = f"""
            Act as a concise Financial CFO. Analyze this data in Albanian (Gegë dialect friendly):
            DATA: {ai_context_data}
            
            TASK: Provide a 1-2 sentence professional summary. 
            - Focus on efficiency and margins.
            - Do not just repeat numbers.
            """
            # Note: passing user_id helps vector store if we wanted RAG, but here we use context stuffing
            ai_response = llm_service.ask_business_consultant(user_id=str(current_user.id), query=prompt)
            summary = ai_response.strip().replace('"', '')
        except Exception as e:
            logger.error(f"AI Insight Failed: {e}")
            summary = f"Analiza: Kalkulimi përfundoi me sukses. ({analysis_year})"

    return KpiInsightResponse(summary=summary, key_contributors=contributors)

@router.post("/inventory/predict", response_model=RestockPrediction)
def predict_restock(request: PredictionRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    try:
        if not ObjectId.is_valid(request.item_id):
            return RestockPrediction(suggested_quantity=0, reason="ID e pavlefshme.", estimated_cost=0)

        item = db["inventory"].find_one({"_id": ObjectId(request.item_id)})
        if not item:
            return RestockPrediction(suggested_quantity=0, reason="Artikulli nuk u gjet.", estimated_cost=0)
        
        safe_name = re.escape(item.get("name", ""))
        
        sales = db["transactions"].find({
            "user_id": str(current_user.id),
            "description": {"$regex": safe_name, "$options": "i"} 
        }).sort("date_time", -1).limit(20)
        
        sales_history = "\n".join([f"{s.get('date_time')}: {s.get('quantity')} sold" for s in sales]) or "No recent sales."

        context = f"ITEM: {item.get('name')}\nSTOCK: {item.get('current_stock')}\nSALES:\n{sales_history}"
        
        result = llm_service.analyze_structured_prediction(context, "RESTOCK")
        
        return RestockPrediction(
            suggested_quantity=float(result.get("suggested_quantity", 0)),
            reason=result.get("reason", "Nuk ka të dhëna mjaftueshme për parashikim."),
            estimated_cost=float(result.get("estimated_cost", 0))
        )
    except Exception as e:
        logger.error(f"Restock Pred Error: {e}")
        return RestockPrediction(suggested_quantity=0, reason="Gabim në analizë.", estimated_cost=0)

@router.post("/inventory/trend", response_model=SalesTrendAnalysis)
def analyze_sales_trend(request: PredictionRequest, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    try:
        if not ObjectId.is_valid(request.item_id):
            return SalesTrendAnalysis(trend_analysis="ID e pavlefshme.", cross_sell_opportunities="N/A")

        item = db["inventory"].find_one({"_id": ObjectId(request.item_id)})
        if not item:
             return SalesTrendAnalysis(trend_analysis="Artikulli nuk u gjet.", cross_sell_opportunities="N/A")
        
        safe_name = re.escape(item.get("name", ""))
        
        count = db.transactions.count_documents({
            "user_id": str(current_user.id),
            "description": {"$regex": safe_name, "$options": "i"}
        })
        
        sales_summary = f"Item: {item.get('name')}. Total Lifetime Sales: {count} transactions."
        
        result = llm_service.analyze_structured_prediction(sales_summary, "TREND")
        
        return SalesTrendAnalysis(
            trend_analysis=result.get("trend_analysis", "S'ka mjaftueshëm të dhëna shitjeje."),
            cross_sell_opportunities=result.get("cross_sell_opportunities", "N/A")
        )
    except Exception as e:
        logger.error(f"Trend Analysis Error: {e}")
        return SalesTrendAnalysis(trend_analysis="Analiza dështoi përkohësisht.", cross_sell_opportunities="N/A")

# --- PLACEHOLDERS TO PREVENT 404s ---
@router.get("/finance/proactive-insight", response_model=GeneralInsightResponse)
def get_proactive_insight(): return GeneralInsightResponse(insight="Sistemi aktiv.", sentiment="neutral")

@router.post("/tax/audit", response_model=TaxAuditResult)
def analyze_tax_anomalies(): return TaxAuditResult(anomalies=[], status="CLEAR", net_obligation=0.0)

@router.post("/tax/chat", response_model=Dict[str, str])
def chat_with_tax_bot(request: ChatRequest, current_user: UserInDB = Depends(get_current_user)):
    return {"response": llm_service.ask_business_consultant(str(current_user.id), request.message)}