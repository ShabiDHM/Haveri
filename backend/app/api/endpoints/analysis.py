# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - INTELLIGENCE ENGINE V1.4.1 (STRICT TYPE FIX)
# 1. FIX: Resolved Pylance error on 'max()' by using explicit lambda instead of 'dict.get'.
# 2. TYPE SAFETY: Added explicit type hinting for the correlation dictionary.

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

# --- ENDPOINTS ---

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
        
        # Rule 1: Personal Keywords
        if any(x in desc for x in ['dhurat', 'gift', 'drek', 'lunch', 'dark', 'dinner']) and amount > 50:
            anomalies.append(f"Potential Non-Deductible: Expense '{exp.category}' of €{amount} contains keywords suggesting personal use.")
            
        # Rule 2: General Category abuse
        if 'general' in cat or 'pergjithshme' in cat:
            if amount > 500:
                anomalies.append(f"Audit Risk: Large expense (€{amount}) categorized as 'General'. Please re-classify.")
        
        if 'marketing' in cat or 'reklam' in cat:
            marketing_found = True
            
        # Rule 3: Hidden Payroll
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
        response = "💻 **Për Asete (si Laptopë):**\n- **TVSH:** E Zbritshme 100%.\n- **Shpenzimi:** Amortizohet 20% në vit."
    elif any(x in msg for x in ["drek", "ushqim", "kafe", "dark", "reprezentacion"]):
        response = "🍽️ **Për Reprezentacion:**\n- **TVSH:** JO e zbritshme.\n- **Shpenzimi:** Njihet vetëm 50%."
    elif any(x in msg for x in ["makin", "vetur", "naft", "benzin"]):
        response = "🚗 **Për Veturat e Pasagjerëve:**\n- **TVSH:** JO e zbritshme.\n- **Shpenzimi:** Njihet 50% nëse përdoret privatisht."
    elif "tvsh" in msg:
        response = "Sipas ligjit të ATK-së, TVSH-ja (18%) është e zbritshme për blerjet biznesore, përveç reprezentacionit dhe veturave."
    else:
        response = "Mund t'ju përgjigjem saktësisht vetëm për: Pajisje, Reprezentacion, dhe Vetura."
        
    return {"response": response}

@router.post("/inventory/predict", response_model=RestockPrediction)
def predict_restock(
    request: PredictionRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    user_id = str(current_user.id)
    item = _get_item_from_db(db, user_id, request.item_id)
    if not item: raise HTTPException(404, "Item not found")
        
    pipeline = [
        {"$match": {"user_id": user_id, "product_name": item.name}},
        {"$group": {"_id": None, "total_sold": {"$sum": "$quantity"}}}
    ]
    result = list(db["transactions"].aggregate(pipeline))
    
    daily_sales = 0.0
    if result and result[0]['total_sold'] > 0:
        daily_sales = result[0]['total_sold'] / 30.0 # Simple 30-day avg
        
    if daily_sales == 0:
        return RestockPrediction(
            suggested_quantity=0,
            reason="Not enough sales data for prediction.",
            supplier_name="Unknown",
            estimated_cost=0
        )

    days_left = item.current_stock / daily_sales
    suggested_qty = daily_sales * 14
    
    reason = f"Based on avg. sales of {daily_sales:.1f} units/day, stock lasts ~{int(days_left)} days."
    if days_left < 3: reason = f"URGENT: Stockout expected in {int(days_left)} days!"

    return RestockPrediction(
        suggested_quantity=round(suggested_qty, 1),
        reason=reason,
        supplier_name="Primary Supplier",
        estimated_cost=round(suggested_qty * item.cost_per_unit, 2)
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
    return "No trend data."

def get_real_cross_sell(db: Database, user_id: str, item_name: str) -> str:
    # MARKET BASKET ANALYSIS (CORRELATION)
    
    # 1. Get dates where this item was sold
    dates_cursor = db["transactions"].find(
        {"user_id": user_id, "product_name": item_name},
        {"date": 1}
    ).sort("date", -1).limit(20) # Look at last 20 sales
    
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
            # FIX: Use lambda to avoid Pylance strict type error
            best_match = max(correlated, key=lambda k: correlated[k])
            return f"Customers often buy '{best_match}' on the same day."
            
    except Exception as e:
        print(f"Analysis error: {e}")
        
    return "No strong correlation found with other products."