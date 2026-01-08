# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V1.5 (FINANCIAL ANALYST)
# 1. FEATURE: Added 'generate_kpi_insight' to explain Revenue, Expenses, and Profit drivers.
# 2. FEATURE: Added 'get_proactive_insight' for the smart dashboard banner.
# 3. LOGIC: Uses real database aggregations to determine top clients and expense categories.

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from pymongo.database import Database
import pymongo
from bson import ObjectId

from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from app.services.inventory_service import InventoryService
from app.services.finance_service import FinanceService
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
    kpi_type: str # 'income', 'expense', 'profit', 'cogs'

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
    sentiment: str # 'positive', 'negative', 'neutral'

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

# --- FINANCE INTELLIGENCE ENDPOINTS (NEW) ---

@router.post("/finance/kpi-insight", response_model=KpiInsightResponse)
def generate_kpi_insight(
    request: KpiInsightRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Analyzes 'Why' a number is what it is based on recent data.
    """
    user_id = str(current_user.id)
    finance_service = FinanceService(db)
    
    summary = "Data analysis unavailable."
    contributors = []
    
    # Get data for the current month/period (simplified to all-time active for robust demo, or last 30 days)
    # For better insights, let's look at the last 30 days.
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    
    if request.kpi_type == 'income':
        invoices = finance_service.get_invoices(user_id)
        recent_invoices = [
            i for i in invoices 
            if i.status == 'PAID' and i.issue_date >= cutoff_date
        ]
        
        total_income = sum(i.total_amount for i in recent_invoices)
        
        if total_income == 0:
            summary = "No paid invoices found in the last 30 days."
        else:
            # Group by Client
            clients: Dict[str, float] = {}
            for inv in recent_invoices:
                clients[inv.client_name] = clients.get(inv.client_name, 0) + inv.total_amount
            
            sorted_clients = sorted(clients.items(), key=lambda x: x[1], reverse=True)
            top_client = sorted_clients[0]
            
            summary = f"Revenue of €{total_income:.2f} (last 30 days) is driven by {len(sorted_clients)} active clients. '{top_client[0]}' is your top contributor."
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_clients[:4]]

    elif request.kpi_type == 'expense':
        expenses = finance_service.get_expenses(user_id)
        recent_expenses = [
            e for e in expenses 
            if e.date >= cutoff_date
        ]
        
        total_expense = sum(e.amount for e in recent_expenses)
        
        if total_expense == 0:
            summary = "No recorded expenses in the last 30 days."
        else:
            # Group by Category
            cats: Dict[str, float] = {}
            for e in recent_expenses:
                cats[e.category] = cats.get(e.category, 0) + e.amount
            
            sorted_cats = sorted(cats.items(), key=lambda x: x[1], reverse=True)
            top_cat = sorted_cats[0]
            
            summary = f"Total outflow: €{total_expense:.2f}. Your spending is concentrated in '{top_cat[0]}', accounting for {int((top_cat[1]/total_expense)*100)}% of costs."
            contributors = [f"{c[0]}: €{c[1]:.2f}" for c in sorted_cats[:4]]

    elif request.kpi_type == 'profit':
        # Calculate real net income
        invoices = finance_service.get_invoices(user_id)
        expenses = finance_service.get_expenses(user_id)
        
        recent_income = sum(i.total_amount for i in invoices if i.status == 'PAID' and i.issue_date >= cutoff_date)
        recent_expense = sum(e.amount for e in expenses if e.date >= cutoff_date)
        net = recent_income - recent_expense
        
        if recent_income > 0:
            margin = (net / recent_income) * 100
            status_text = "healthy" if margin > 20 else "tight"
            summary = f"Net Profit is €{net:.2f} with a {status_text} margin of {margin:.1f}%."
            contributors = [
                f"Total Income: €{recent_income:.2f}",
                f"Total Expense: €{recent_expense:.2f}",
                f"Net Result: €{net:.2f}"
            ]
        else:
            summary = f"Net loss of €{abs(net):.2f} due to lack of revenue in this period."
            contributors = [f"Expenses: €{recent_expense:.2f}"]

    elif request.kpi_type == 'cogs':
        # Placeholder for COGS logic if Inventory Costing was fully implemented
        summary = "Cost of Goods Sold analysis requires full inventory transaction history."
        contributors = ["Module: Inventory Tracking"]

    return KpiInsightResponse(summary=summary, key_contributors=contributors)

@router.get("/finance/proactive-insight", response_model=GeneralInsightResponse)
def get_proactive_insight(
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Generates a high-level banner insight comparing Income vs Expenses.
    """
    user_id = str(current_user.id)
    finance_service = FinanceService(db)
    
    cutoff_30 = datetime.utcnow() - timedelta(days=30)
    
    invoices = finance_service.get_invoices(user_id)
    expenses = finance_service.get_expenses(user_id)
    
    income = sum(i.total_amount for i in invoices if i.status == 'PAID' and i.issue_date >= cutoff_30)
    outflow = sum(e.amount for e in expenses if e.date >= cutoff_30)
    
    if income == 0 and outflow == 0:
        return GeneralInsightResponse(
            insight="Welcome! Start adding Invoices and Expenses to unlock AI insights.",
            sentiment="neutral"
        )
        
    if income > outflow * 1.5:
        return GeneralInsightResponse(
            insight=f"Great performance! Your revenue (€{income:.0f}) is significantly higher than expenses (€{outflow:.0f}). Consider reinvesting.",
            sentiment="positive"
        )
    elif outflow > income:
        # Find biggest expense category
        cats: Dict[str, float] = {}
        for e in expenses:
             if e.date >= cutoff_30:
                cats[e.category] = cats.get(e.category, 0) + e.amount
        top_cat = max(cats, key=lambda k: cats[k]) if cats else "General"
        
        return GeneralInsightResponse(
            insight=f"Warning: Expenses (€{outflow:.0f}) exceed Income (€{income:.0f}). Primary driver is '{top_cat}'. Review immediately.",
            sentiment="negative"
        )
    else:
        return GeneralInsightResponse(
            insight="Stable performance. Income is balancing expenses. Focus on increasing sales volume.",
            sentiment="neutral"
        )

# --- EXISTING AI ENDPOINTS (TAX/INVENTORY) ---

@router.post("/tax/audit", response_model=TaxAuditResult)
def analyze_tax_anomalies(
    request: TaxAuditRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    finance_service = FinanceService(db)
    
    all_expenses = finance_service.get_expenses(user_id)
    period_expenses = [
        e for e in all_expenses 
        if e.date.month == request.month and e.date.year == request.year
    ]
    
    anomalies = []
    marketing_found = False
    
    for exp in period_expenses:
        cat = exp.category.lower()
        desc = (exp.description or "").lower()
        amount = exp.amount
        
        if any(x in desc for x in ['dhurat', 'gift', 'drek', 'lunch', 'dark', 'dinner']) and amount > 50:
            anomalies.append(f"Potential Non-Deductible: Expense '{exp.category}' of €{amount} contains keywords suggesting personal use.")
            
        if 'general' in cat or 'pergjithshme' in cat:
            if amount > 500:
                anomalies.append(f"Audit Risk: Large expense (€{amount}) categorized as 'General'. Please re-classify.")
        
        if 'marketing' in cat or 'reklam' in cat:
            marketing_found = True
            
        if ('rrog' in cat or 'pag' in cat) and amount % 100 == 0 and amount > 0:
             anomalies.append(f"Payroll Check: Salary payment of €{amount} detected. Ensure Withholding Tax is declared.")

    if not marketing_found and len(period_expenses) > 5:
        anomalies.append("Opportunity: No Marketing expenses found. These are 100% deductible.")

    status_code = "CLEAR"
    if len(anomalies) > 0: status_code = "WARNING"
    if any("Audit Risk" in a for a in anomalies): status_code = "CRITICAL"

    return TaxAuditResult(
        anomalies=anomalies,
        status=status_code,
        net_obligation=0.0
    )

@router.post("/tax/chat", response_model=Dict[str, str])
def chat_with_tax_bot(request: ChatRequest):
    msg = request.message.lower()
    response = ""
    
    if any(x in msg for x in ["laptop", "kompjuter", "pajisj", "aset"]):
        response = "💻 **Për Asete (si Laptopë):**\n- **TVSH:** E Zbritshme 100% nëse përdoret për biznes.\n- **Shpenzimi:** Nuk njihet menjëherë. Duhet të amortizohet me shkallën 20% në vit (metoda rënëse)."
    elif any(x in msg for x in ["drek", "ushqim", "kafe", "dark", "reprezentacion"]):
        response = "🍽️ **Për Reprezentacion (Dreka/Darka):**\n- **TVSH:** JO e zbritshme (nuk mund ta kreditoni).\n- **Shpenzimi:** Njihet vetëm 50% si shpenzim i zbritshëm për Tatim në Fitim."
    elif any(x in msg for x in ["makin", "vetur", "naft", "benzin"]):
        response = "🚗 **Për Veturat e Pasagjerëve:**\n- **TVSH:** JO e zbritshme (përveç nëse jeni Auto-shkollë, Taksi, ose Rent-a-car).\n- **Shpenzimi:** Karburanti dhe mirëmbajtja njihen vetëm 50% për Tatim në Fitim nëse përdoret edhe privatisht."
    elif "tvsh" in msg:
        response = "Sipas ligjit të ATK-së, TVSH-ja (18%) është e zbritshme për blerjet që shërbejnë drejtpërdrejt për veprimtarinë tuaj të tatueshme. Përjashtime bëjnë reprezentacioni dhe veturat e pasagjerëve."
    else:
        response = "Më falni, mund t'ju përgjigjem saktësisht vetëm për: Pajisje/Asete, Dreka (Reprezentacion), dhe Vetura/Naftë. Ju lutem specifikoni pyetjen."
        
    return {"response": response}

@router.post("/inventory/predict", response_model=RestockPrediction)
def predict_restock(
    request: PredictionRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    item = _get_item_from_db(db, user_id, request.item_id)
    if not item:
        raise HTTPException(404, "Item not found")
        
    pipeline = [
        {"$match": {"user_id": user_id, "product_name": item.name}},
        {"$group": {"_id": None, "total_sold": {"$sum": "$quantity"}, "count": {"$sum": 1}}}
    ]
    result = list(db["transactions"].aggregate(pipeline))
    
    daily_sales = 0.0
    if result and result[0]['total_sold'] > 0:
        daily_sales = result[0]['total_sold'] / 30.0
        
    if daily_sales == 0:
        return RestockPrediction(
            suggested_quantity=0,
            reason="No recent sales data available to calculate velocity.",
            supplier_name="Unknown",
            estimated_cost=0
        )

    days_left = item.current_stock / daily_sales
    suggested_qty = daily_sales * 14 
    cost = suggested_qty * item.cost_per_unit
    
    reason = f"Based on avg. sales of {daily_sales:.1f} units/day, you will run out in ~{int(days_left)} days."
    if days_left < 3:
        reason = f"URGENT: At current velocity ({daily_sales:.1f}/day), stock will be ZERO in {int(days_left)} days!"

    return RestockPrediction(
        suggested_quantity=round(suggested_qty, 1),
        reason=reason,
        supplier_name="Primary Supplier",
        estimated_cost=round(cost, 2)
    )

@router.post("/inventory/trend", response_model=SalesTrendAnalysis)
def analyze_sales_trend(
    request: PredictionRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    item = _get_item_from_db(db, user_id, request.item_id)
    if not item: raise HTTPException(404, "Item not found")

    trend_msg = get_real_trend_analysis(db, user_id, item.name)
    cross_sell_msg = get_real_cross_sell(db, user_id, item.name)

    return SalesTrendAnalysis(
        trend_analysis=trend_msg,
        cross_sell_opportunities=cross_sell_msg
    )

def get_real_trend_analysis(db: Database, user_id: str, item_name: str) -> str:
    pipeline = [
        {"$match": {"user_id": user_id, "product_name": item_name}},
        {"$project": {"day_of_week": {"$dayOfWeek": "$date"}}}, 
        {"$group": {"_id": "$day_of_week", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1}
    ]
    try:
        res = list(db["transactions"].aggregate(pipeline))
        if res:
            days = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            return f"Best selling day: {days[res[0]['_id']]}."
    except: pass
    return "Not enough sales data to determine trends."

def get_real_cross_sell(db: Database, user_id: str, item_name: str) -> str:
    dates_cursor = db["transactions"].find(
        {"user_id": user_id, "product_name": item_name},
        {"date": 1}
    ).sort("date", -1).limit(20) 
    
    target_dates = [d['date'].strftime("%Y-%m-%d") for d in dates_cursor if d.get('date')]
    
    if not target_dates: return "Not enough data for correlations."
    
    try:
        recent_txs = list(db["transactions"].find(
            {"user_id": user_id, "product_name": {"$ne": item_name}}
        ).sort("date", -1).limit(200))
        
        correlated: Dict[str, int] = {}
        for tx in recent_txs:
            if not tx.get('date'): continue
            tx_date = tx['date'].strftime("%Y-%m-%d")
            if tx_date in target_dates:
                p_name = tx['product_name']
                correlated[p_name] = correlated.get(p_name, 0) + 1
        
        if correlated:
            best_match = max(correlated, key=lambda k: correlated[k])
            return f"Customers often buy '{best_match}' on the same day."
            
    except Exception as e:
        print(f"Analysis error: {e}")
        
    return "No strong correlation found with other products."