# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V2.4 (HYBRID COGS & YTD)
# 1. FIX: Changed default timeframe from 'Last 30 Days' to 'Year-to-Date' (YTD) to match Dashboard.
# 2. FEATURE: Added Hybrid COGS Logic. If Inventory calculation yields 0, it falls back to summing Expenses (Category: 'Cost of Goods'/'Blerje').
# 3. RESULT: Ensures the Analyst provides insights even for users who don't use the advanced Inventory module.

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

def _normalize(text: str) -> str:
    """Helper to normalize strings for comparison."""
    return str(text).strip().lower()

def _safe_float(val: Any) -> float:
    try:
        return float(val)
    except:
        return 0.0

# --- FINANCE INTELLIGENCE ENDPOINTS ---
@router.post("/finance/kpi-insight", response_model=KpiInsightResponse)
def generate_kpi_insight(
    request: KpiInsightRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    user_oid = ObjectId(user_id)
    
    # Robust User Filter (Matches String OR ObjectId)
    user_filter = {"$or": [{"user_id": user_id}, {"user_id": user_oid}]}
    
    finance_service = FinanceService(db)
    summary = "Analiza e të dhënave e padisponueshme."
    contributors = []
    
    # PHOENIX FIX: Switch to YTD (Year-To-Date) instead of 30 days to capture all relevant data
    now = datetime.utcnow()
    start_of_year = datetime(now.year, 1, 1)
    
    # Fallback to 30 days only if specifically requested or for trend analysis, 
    # but for "Insights" explaining a dashboard card, YTD is safer.
    analysis_start_date = start_of_year
    
    if request.kpi_type == 'income':
        invoices = finance_service.get_invoices(user_id)
        # Filter for YTD
        recent_invoices = [i for i in invoices if i.status == 'PAID' and i.issue_date >= analysis_start_date]
        total_income = sum(i.total_amount for i in recent_invoices)
        
        if total_income == 0:
            summary = f"Nuk u gjetën fatura të paguara për vitin {now.year}."
        else:
            clients: Dict[str, float] = {}
            for inv in recent_invoices:
                clients[inv.client_name] = clients.get(inv.client_name, 0) + inv.total_amount
            sorted_clients = sorted(clients.items(), key=lambda x: x[1], reverse=True)
            top_client = sorted_clients[0]
            summary = f"Të hyrat YTD prej €{total_income:.2f} vijnë kryesisht nga {len(sorted_clients)} klientë. '{top_client[0]}' është kontribuesi kryesor."
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_clients[:4]]

    elif request.kpi_type == 'expense':
        expenses = finance_service.get_expenses(user_id)
        recent_expenses = [e for e in expenses if e.date >= analysis_start_date]
        total_expense = sum(e.amount for e in recent_expenses)
        if total_expense == 0:
            summary = f"Nuk ka shpenzime të regjistruara për vitin {now.year}."
        else:
            cats: Dict[str, float] = {}
            for e in recent_expenses:
                cats[e.category] = cats.get(e.category, 0) + e.amount
            sorted_cats = sorted(cats.items(), key=lambda x: x[1], reverse=True)
            top_cat = sorted_cats[0]
            summary = f"Dalja totale YTD: €{total_expense:.2f}. Shpenzimet dominohen nga '{top_cat[0]}' ({int((top_cat[1]/total_expense)*100)}%)."
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_cats[:4]]

    elif request.kpi_type == 'profit':
        invoices = finance_service.get_invoices(user_id)
        expenses = finance_service.get_expenses(user_id)
        
        ytd_income = sum(i.total_amount for i in invoices if i.status == 'PAID' and i.issue_date >= analysis_start_date)
        ytd_expense = sum(e.amount for e in expenses if e.date >= analysis_start_date)
        net = ytd_income - ytd_expense
        
        if ytd_income > 0:
            margin = (net / ytd_income) * 100
            status_text = "e shëndetshme" if margin > 20 else "e ulët"
            summary = f"Fitimi Neto YTD është €{net:.2f} (Marzha: {margin:.1f}%). {status_text.capitalize()}."
            contributors = [f"Të Hyrat: €{ytd_income:.2f}", f"Shpenzimet: €{ytd_expense:.2f}", f"Neto: €{net:.2f}"]
        else:
            summary = f"Humbje neto YTD prej €{abs(net):.2f}. Mungojnë të hyrat e mjaftueshme për të mbuluar shpenzimet."
            contributors = [f"Shpenzimet: €{ytd_expense:.2f}"]

    elif request.kpi_type == 'cogs':
        # --- METHOD A: INVENTORY & RECIPES (The Precise Way) ---
        inv_items = list(db["inventory"].find(user_filter, {"_id": 1, "name": 1, "cost_per_unit": 1}))
        recipes = list(db["recipes"].find(user_filter))
        
        cost_by_id = {str(i["_id"]): _safe_float(i.get("cost_per_unit", 0)) for i in inv_items}
        cost_by_name = {_normalize(i["name"]): _safe_float(i.get("cost_per_unit", 0)) for i in inv_items}
        
        product_costs: Dict[str, float] = {} 
        for r in recipes:
            r_cost = 0.0
            for ing in r.get("ingredients", []):
                i_id = ing.get("inventory_item_id")
                qty = _safe_float(ing.get("quantity_required", 0))
                if i_id in cost_by_id:
                    r_cost += cost_by_id[i_id] * qty
            
            p_name_norm = _normalize(r.get("product_name", ""))
            if r_cost > 0: 
                product_costs[p_name_norm] = r_cost

        # Fetch Transactions YTD
        sales_query = {**user_filter, "date": {"$gte": analysis_start_date}}
        sales = list(db["transactions"].find(sales_query))
        
        total_cogs_inventory = 0.0
        item_cogs_breakdown: Dict[str, float] = {}
        
        for sale in sales:
            p_name_raw = sale.get("product_name", "")
            p_name_norm = _normalize(p_name_raw)
            qty = _safe_float(sale.get("quantity", 0))
            unit_cost = 0.0
            
            # Match Logic (Recipe Exact -> Inventory Exact -> Recipe Partial -> Inventory Partial)
            if p_name_norm in product_costs: unit_cost = product_costs[p_name_norm]
            elif p_name_norm in cost_by_name: unit_cost = cost_by_name[p_name_norm]
            else:
                for r_name, r_cost in product_costs.items():
                    if r_name in p_name_norm or p_name_norm in r_name: unit_cost = r_cost; break
            if unit_cost == 0:
                for i_name, i_cost in cost_by_name.items():
                    if i_name in p_name_norm or p_name_norm in i_name: unit_cost = i_cost; break

            line_cost = unit_cost * qty
            total_cogs_inventory += line_cost
            if line_cost > 0:
                item_cogs_breakdown[p_name_raw] = item_cogs_breakdown.get(p_name_raw, 0) + line_cost

        # --- METHOD B: EXPENSE CATEGORIES (The Fallback Way) ---
        # If Inventory Logic returns 0, we check if the user is just logging "COGS" as an expense.
        total_cogs_expenses = 0.0
        expense_breakdown: Dict[str, float] = {}
        
        if total_cogs_inventory == 0:
            expenses = finance_service.get_expenses(user_id)
            # Keywords for COGS expenses
            cogs_keywords = ['cost of goods', 'blerje', 'furnizim', 'kosto', 'mall', 'stock', 'stok']
            
            for e in expenses:
                if e.date >= analysis_start_date:
                    cat_norm = _normalize(e.category)
                    if any(kw in cat_norm for kw in cogs_keywords):
                        total_cogs_expenses += e.amount
                        expense_breakdown[e.category] = expense_breakdown.get(e.category, 0) + e.amount

        # --- DECISION LOGIC ---
        if total_cogs_inventory > 0:
            # Case 1: Advanced User (Has Recipes/Inventory Costs)
            sorted_cogs = sorted(item_cogs_breakdown.items(), key=lambda x: x[1], reverse=True)
            top_item = sorted_cogs[0]
            summary = f"Kosto e Mallrave (bazuar në Receta/Stok) është €{total_cogs_inventory:.2f}. Artikulli me koston më të lartë: '{top_item[0]}'."
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_cogs[:4]]
        
        elif total_cogs_expenses > 0:
            # Case 2: Simple User (Uses Expenses for COGS)
            sorted_exps = sorted(expense_breakdown.items(), key=lambda x: x[1], reverse=True)
            top_exp = sorted_exps[0]
            summary = f"Kosto e Mallrave (bazuar në Kategori Shpenzimesh) është €{total_cogs_expenses:.2f}. Kategoria kryesore: '{top_exp[0]}'."
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_exps[:4]]
            
        else:
            # Case 3: No Data Found
            summary = f"Nuk u identifikua asnjë kosto për vitin {now.year}. Shtoni 'Kosto për Njësi' në Stok ose regjistroni shpenzime me kategorinë 'Blerje Malli'."
            contributors = ["Shtoni të dhëna për analizë."]

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