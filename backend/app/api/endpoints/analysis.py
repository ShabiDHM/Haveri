# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V2.1 (LLM INTEGRATION)
# 1. FEATURE: 'chat_with_tax_bot' now uses the 'llm_service' RAG pipeline instead of hardcoded if/else statements.
# 2. LOGIC: This enables dynamic, context-aware answers grounded in the Legal Knowledge Base.

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
from app.services import llm_service  # PHOENIX: Imported LLM Service
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

# --- HELPER ---
def _get_item_from_db(db: Database, user_id: str, item_id: str) -> Optional[InventoryItem]:
    try:
        oid = ObjectId(item_id)
    except:
        return None
    
    doc = db["inventory"].find_one({"_id": oid, "user_id": user_id})
    if doc:
        doc["id"] = str(doc["_id"])
        return InventoryItem(**doc)
    return None

# --- FINANCE INTELLIGENCE ENDPOINTS ---
@router.post("/finance/kpi-insight", response_model=KpiInsightResponse)
def generate_kpi_insight(
    request: KpiInsightRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    finance_service = FinanceService(db)
    
    summary = "Analiza e të dhënave e padisponueshme."
    contributors = []
    
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    
    if request.kpi_type == 'income':
        invoices = finance_service.get_invoices(user_id)
        recent_invoices = [i for i in invoices if i.status == 'PAID' and i.issue_date >= cutoff_date]
        total_income = sum(i.total_amount for i in recent_invoices)
        if total_income == 0:
            summary = "Nuk u gjetën fatura të paguara në 30 ditët e fundit."
        else:
            clients: Dict[str, float] = {}
            for inv in recent_invoices:
                clients[inv.client_name] = clients.get(inv.client_name, 0) + inv.total_amount
            sorted_clients = sorted(clients.items(), key=lambda x: x[1], reverse=True)
            top_client = sorted_clients[0]
            summary = f"Të hyrat prej €{total_income:.2f} (30 ditët e fundit) vijnë kryesisht nga {len(sorted_clients)} klientë aktivë. '{top_client[0]}' është kontribuesi kryesor."
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_clients[:4]]

    elif request.kpi_type == 'expense':
        expenses = finance_service.get_expenses(user_id)
        recent_expenses = [e for e in expenses if e.date >= cutoff_date]
        total_expense = sum(e.amount for e in recent_expenses)
        if total_expense == 0:
            summary = "Nuk ka shpenzime të regjistruara në 30 ditët e fundit."
        else:
            cats: Dict[str, float] = {}
            for e in recent_expenses:
                cats[e.category] = cats.get(e.category, 0) + e.amount
            sorted_cats = sorted(cats.items(), key=lambda x: x[1], reverse=True)
            top_cat = sorted_cats[0]
            summary = f"Dalja totale: €{total_expense:.2f}. Shpenzimet janë të përqendruara në '{top_cat[0]}', që përbën {int((top_cat[1]/total_expense)*100)}% të kostove."
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_cats[:4]]

    elif request.kpi_type == 'profit':
        invoices = finance_service.get_invoices(user_id)
        expenses = finance_service.get_expenses(user_id)
        recent_income = sum(i.total_amount for i in invoices if i.status == 'PAID' and i.issue_date >= cutoff_date)
        recent_expense = sum(e.amount for e in expenses if e.date >= cutoff_date)
        net = recent_income - recent_expense
        if recent_income > 0:
            margin = (net / recent_income) * 100
            status_text = "e shëndetshme" if margin > 20 else "e ulët"
            summary = f"Fitimi Neto është €{net:.2f} me një marzhë {status_text} prej {margin:.1f}%."
            contributors = [f"Të Hyrat: €{recent_income:.2f}", f"Shpenzimet: €{recent_expense:.2f}", f"Rezultati Neto: €{net:.2f}"]
        else:
            summary = f"Humbje neto prej €{abs(net):.2f} për shkak të mungesës së të hyrave në këtë periudhë."
            contributors = [f"Shpenzimet: €{recent_expense:.2f}"]

    elif request.kpi_type == 'cogs':
        inv_items = list(db["inventory"].find({"user_id": user_id}, {"_id": 1, "name": 1, "cost_per_unit": 1}))
        cost_by_id = {str(i["_id"]): i.get("cost_per_unit", 0) for i in inv_items}
        cost_by_name = {i["name"].lower().strip(): i.get("cost_per_unit", 0) for i in inv_items}
        recipes = list(db["recipes"].find({"user_id": user_id}))
        product_costs: Dict[str, float] = {} 
        for r in recipes:
            r_cost = 0
            for ing in r.get("ingredients", []):
                i_id = ing.get("inventory_item_id")
                qty = ing.get("quantity_required", 0)
                if i_id in cost_by_id:
                    r_cost += cost_by_id[i_id] * qty
            if r_cost > 0: product_costs[r["product_name"].lower().strip()] = r_cost
        sales = list(db["transactions"].find({"user_id": user_id, "date": {"$gte": cutoff_date}}))
        total_cogs = 0.0
        item_cogs_breakdown = {}
        for sale in sales:
            p_name_sold = sale.get("product_name", "").lower().strip()
            qty = sale.get("quantity", 0)
            unit_cost = 0
            if p_name_sold in product_costs:
                unit_cost = product_costs[p_name_sold]
            else:
                for recipe_name, cost in product_costs.items():
                    if recipe_name in p_name_sold:
                        unit_cost = cost; break 
            if unit_cost == 0 and p_name_sold in cost_by_name:
                unit_cost = cost_by_name[p_name_sold]
            line_cost = unit_cost * qty
            total_cogs += line_cost
            if line_cost > 0:
                original_name = sale.get("product_name", p_name_sold)
                item_cogs_breakdown[original_name] = item_cogs_breakdown.get(original_name, 0) + line_cost
        if total_cogs > 0:
            sorted_cogs = sorted(item_cogs_breakdown.items(), key=lambda x: x[1], reverse=True)
            top_item = sorted_cogs[0]
            summary = f"Kosto totale e materialeve të shitura është €{total_cogs:.2f}. Artikulli me koston më të lartë ishte '{top_item[0]}'."
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_cogs[:4]]
        else:
            summary = "Nuk u identifikua asnjë kosto. Sigurohuni që artikujt në Stok kanë 'Kosto për Njësi' dhe emrat e Recetave përputhen me emrat e produkteve të shitura."
            contributors = ["Verifikoni kostot e lëndës së parë."]

    return KpiInsightResponse(summary=summary, key_contributors=contributors)

@router.get("/finance/proactive-insight", response_model=GeneralInsightResponse)
def get_proactive_insight(
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    finance_service = FinanceService(db)
    cutoff_30 = datetime.utcnow() - timedelta(days=30)
    invoices = finance_service.get_invoices(user_id)
    expenses = finance_service.get_expenses(user_id)
    income = sum(i.total_amount for i in invoices if i.status == 'PAID' and i.issue_date >= cutoff_30)
    outflow = sum(e.amount for e in expenses if e.date >= cutoff_30)
    if income == 0 and outflow == 0:
        return GeneralInsightResponse(insight="Mirësevini! Filloni të shtoni Fatura dhe Shpenzime për të aktivizuar analizat e AI.", sentiment="neutral")
    if income > outflow * 1.5:
        return GeneralInsightResponse(insight=f"Performancë e shkëlqyer! Të hyrat (€{income:.0f}) janë ndjeshëm më të larta se shpenzimet (€{outflow:.0f}).", sentiment="positive")
    elif outflow > income:
        cats: Dict[str, float] = {}
        for e in expenses:
             if e.date >= cutoff_30: cats[e.category] = cats.get(e.category, 0) + e.amount
        top_cat = max(cats, key=lambda k: cats[k]) if cats else "Të Përgjithshme"
        return GeneralInsightResponse(insight=f"Kujdes: Shpenzimet (€{outflow:.0f}) tejkalojnë Të Hyrat (€{income:.0f}). Shkaktari kryesor është '{top_cat}'.", sentiment="negative")
    else:
        return GeneralInsightResponse(insight="Performancë stabile. Të hyrat po balancojnë shpenzimet. Fokusohuni në rritjen e vëllimit të shitjeve.", sentiment="neutral")

# --- AI ENDPOINTS ---

@router.post("/tax/audit", response_model=TaxAuditResult)
def analyze_tax_anomalies(
    request: TaxAuditRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    finance_service = FinanceService(db)
    all_expenses = finance_service.get_expenses(user_id)
    period_expenses = [e for e in all_expenses if e.date.month == request.month and e.date.year == request.year]
    anomalies = []
    marketing_found = False
    for exp in period_expenses:
        cat = exp.category.lower(); desc = (exp.description or "").lower(); amount = exp.amount
        if any(x in desc for x in ['dhurat', 'gift', 'drek', 'lunch', 'dark', 'dinner']) and amount > 50:
            anomalies.append(f"Potencialisht e pa-zbritshme: Shpenzimi '{exp.category}' prej €{amount} përmban fjalë kyçe për përdorim personal.")
        if 'general' in cat or 'pergjithshme' in cat:
            if amount > 500: anomalies.append(f"Rrezik Auditi: Shpenzim i madh (€{amount}) i kategorizuar si 'Të Përgjithshme'. Ju lutem ri-klasifikoni.")
        if 'marketing' in cat or 'reklam' in cat: marketing_found = True
        if ('rrog' in cat or 'pag' in cat) and amount % 100 == 0 and amount > 0:
             anomalies.append(f"Kontroll Page: U detektua pagesë page prej €{amount}. Sigurohuni që Tatimi në Burim është deklaruar.")
    if not marketing_found and len(period_expenses) > 5:
        anomalies.append("Mundësi: Nuk u gjetën shpenzime Marketingu. Këto janë 100% të zbritshme.")
    status_code = "CLEAR"
    if len(anomalies) > 0: status_code = "WARNING"
    if any("Rrezik Auditi" in a for a in anomalies): status_code = "CRITICAL"
    return TaxAuditResult(anomalies=anomalies, status=status_code, net_obligation=0.0)

@router.post("/tax/chat", response_model=Dict[str, str])
def chat_with_tax_bot(
    request: ChatRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    # PHOENIX: Replaced hardcoded logic with dynamic RAG call
    user_id = str(current_user.id)
    response_text = llm_service.ask_business_consultant(user_id=user_id, query=request.message)
    return {"response": response_text}

@router.post("/inventory/predict", response_model=RestockPrediction)
def predict_restock(
    request: PredictionRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    item = _get_item_from_db(db, user_id, request.item_id)
    if not item: raise HTTPException(404, "Artikulli nuk u gjet")
    safe_name = re.escape(item.name)
    pipeline = [{"$match": {"user_id": user_id, "product_name": {"$regex": safe_name, "$options": "i"}}}, {"$group": {"_id": None, "total_sold": {"$sum": "$quantity"}}}]
    result = list(db["transactions"].aggregate(pipeline))
    daily_sales = 0.0
    if result and result[0].get('total_sold', 0) > 0:
        daily_sales = result[0]['total_sold'] / 30.0
    if daily_sales == 0:
        return RestockPrediction(suggested_quantity=0, reason="Nuk ka mjaftueshëm të dhëna shitjeje për parashikim.", supplier_name="I panjohur", estimated_cost=0)
    days_left = item.current_stock / daily_sales if daily_sales > 0 else float('inf')
    suggested_qty = daily_sales * 14
    reason = f"Bazuar në mesataren e shitjes prej {daily_sales:.1f} njësi/ditë, stoku mjafton për ~{int(days_left)} ditë."
    if days_left < 3: reason = f"URGJENTE: Me ritmin aktual ({daily_sales:.1f}/ditë), stoku do të mbarojë në {int(days_left)} ditë!"
    return RestockPrediction(suggested_quantity=round(suggested_qty, 1), reason=reason, supplier_name="Furnitori Kryesor", estimated_cost=round(suggested_qty * item.cost_per_unit, 2))

@router.post("/inventory/trend", response_model=SalesTrendAnalysis)
def analyze_sales_trend(
    request: PredictionRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    item = _get_item_from_db(db, user_id, request.item_id)
    if not item: raise HTTPException(404, "Artikulli nuk u gjet")
    trend_msg = get_real_trend_analysis(db, user_id, item.name)
    cross_sell_msg = get_real_cross_sell(db, user_id, item.name)
    return SalesTrendAnalysis(trend_analysis=trend_msg, cross_sell_opportunities=cross_sell_msg)

def get_real_trend_analysis(db: Database, user_id: str, item_name: str) -> str:
    safe_name = re.escape(item_name)
    pipeline = [{"$match": {"user_id": user_id, "product_name": {"$regex": safe_name, "$options": "i"}}}, {"$project": {"day_of_week": {"$dayOfWeek": "$date"}}}, {"$group": {"_id": "$day_of_week", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": 1}]
    try:
        res = list(db["transactions"].aggregate(pipeline))
        if res:
            days = ["", "E Diel", "E Hënë", "E Martë", "E Mërkurë", "E Enjte", "E Premte", "E Shtunë"]
            return f"Dita me më shumë shitje: {days[res[0]['_id']]}."
    except: pass
    return "Nuk ka të dhëna për trendin."

def get_real_cross_sell(db: Database, user_id: str, item_name: str) -> str:
    safe_name = re.escape(item_name)
    dates_cursor = db["transactions"].find({"user_id": user_id, "product_name": {"$regex": safe_name, "$options": "i"}}, {"date": 1}).sort("date", -1).limit(20)
    target_dates = [d['date'].strftime("%Y-%m-%d") for d in dates_cursor if d.get('date')]
    if not target_dates: return "Nuk ka mjaftueshëm të dhëna për korrelacion."
    try:
        recent_txs = list(db["transactions"].find({"user_id": user_id, "product_name": {"$not": re.compile(safe_name, re.IGNORECASE)}}).sort("date", -1).limit(200))
        correlated: Dict[str, int] = {}
        for tx in recent_txs:
            if not tx.get('date'): continue
            tx_date = tx['date'].strftime("%Y-%m-%d")
            if tx_date in target_dates:
                p_name = tx.get("product_name")
                if p_name: correlated[p_name] = correlated.get(p_name, 0) + 1
        if correlated:
            best_match = max(correlated, key=lambda k: correlated[k])
            return f"Klientët shpesh blejnë '{best_match}' në të njëjtën ditë."
    except Exception as e:
        print(f"Analysis error: {e}")
    return "Nuk u gjet ndonjë lidhje e fortë me produkte të tjera."