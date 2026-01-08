# FILE: backend/app/services/strategic_briefing_service.py
# PHOENIX PROTOCOL - STRATEGIC INTELLIGENCE ENGINE V24.0 (MTD REVENUE)
# 1. LOGIC UPGRADE: 'Ritmi i Ditës' now calculates Month-to-Date (MTD) revenue instead of just Today's.
# 2. ACCURACY: Aligns the metric with the UI's implied monthly goal.
# 3. DATA CONTRACT: The 'mvpTotal' field now correctly represents MTD sales.

import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from bson import ObjectId

logger = logging.getLogger(__name__)

# Helper to map database priority to frontend priority
def map_api_priority(priority: Optional[str]) -> str:
    if priority in ['CRITICAL', 'HIGH']: return 'high'
    if priority == 'MEDIUM': return 'medium'
    return 'low'

class StrategicBriefingService:
    def __init__(self, db, user_id: str):
        self.db = db
        try:
            self.user_id_obj = ObjectId(user_id)
        except:
            self.user_id_str = user_id
            self.user_id_obj = None

    async def generate_strategic_briefing(self) -> Dict[str, Any]:
        staff_data, market_data, agenda_data = await asyncio.gather(
            self._analyze_staff_performance(),
            self._analyze_market_pulse(),
            self._compile_tactical_agenda()
        )
        return {"staffPerformance": staff_data, "market": market_data, "agenda": agenda_data}

    async def _analyze_staff_performance(self) -> Dict[str, Any]:
        # PHOENIX FIX: Changed date filter to calculate Month-to-Date (MTD)
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        user_filter = {"user_id": self.user_id_obj} if self.user_id_obj else {"user_id": self.user_id_str}

        # 1. Query Invoices for the month
        invoices_pipeline = [
            {"$match": {**user_filter, "issue_date": {"$gte": month_start}, "status": "PAID"}},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total_amount"}, "transaction_count": {"$sum": 1}}}
        ]
        
        # 2. Query POS Transactions for the month
        transactions_pipeline = [
            {"$match": {**user_filter, "date": {"$gte": month_start}}},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total_price"}, "transaction_count": {"$sum": 1}}}
        ]

        invoice_result, transaction_result = await asyncio.gather(
            self.db.invoices.aggregate(invoices_pipeline).to_list(length=1),
            self.db.transactions.aggregate(transactions_pipeline).to_list(length=1)
        )

        # 3. Combine Results for MTD
        invoice_revenue = invoice_result[0].get("total_revenue", 0) if invoice_result else 0
        invoice_txs = invoice_result[0].get("transaction_count", 0) if invoice_result else 0
        
        transaction_revenue = transaction_result[0].get("total_revenue", 0) if transaction_result else 0
        transaction_txs = transaction_result[0].get("transaction_count", 0) if transaction_result else 0
        
        total_mtd_revenue = invoice_revenue + transaction_revenue
        total_mtd_txs = invoice_txs + transaction_txs
        
        # The score and status can still be based on daily velocity if needed, but the main metric is MTD
        status = "fire" if total_mtd_txs > (now.day * 10) else "stable"
        score = min(98, int((total_mtd_txs / (now.day * 20.0)) * 100)) if now.day > 0 else 0
        
        return {
            "efficiencyStatus": status, "efficiencyScore": score, "mvpName": "Live Data",
            "mvpTotal": total_mtd_revenue, "mvpInsight": {"key": "total_transactions_mtd", "values": {"count": total_mtd_txs}},
            "actionBravo": total_mtd_revenue > 0
        }

    async def _analyze_market_pulse(self) -> Dict[str, Any]:
        user_filter = {"user_id": self.user_id_obj} if self.user_id_obj else {"user_id": self.user_id_str}
        
        # Market pulse should remain daily
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        bestsellers_invoices = [
            {"$match": {**user_filter, "issue_date": {"$gte": today_start}}},
            {"$unwind": "$items"},
            {"$group": {"_id": "$items.description", "total_quantity": {"$sum": "$items.quantity"}}}
        ]
        bestsellers_transactions = [
            {"$match": {**user_filter, "date": {"$gte": today_start}}},
            {"$group": {"_id": "$product_name", "total_quantity": {"$sum": "$quantity"}}}
        ]
        
        low_stock_pipeline = [
            {"$match": {**user_filter, "$expr": {"$lte": ["$current_stock", "$low_stock_threshold"]}}},
            {"$sort": {"current_stock": 1}},
            {"$limit": 1}
        ]
        
        invoices_sales, transactions_sales, low_stock_items = await asyncio.gather(
            self.db.invoices.aggregate(bestsellers_invoices).to_list(length=10),
            self.db.transactions.aggregate(bestsellers_transactions).to_list(length=10),
            self.db.inventory_items.aggregate(low_stock_pipeline).to_list(length=1)
        )
        
        combined_sales = {}
        for item in invoices_sales + transactions_sales:
            if item["_id"]: combined_sales[item["_id"]] = combined_sales.get(item["_id"], 0) + item["total_quantity"]
        
        sorted_bestsellers = sorted(combined_sales.items(), key=lambda x: x[1], reverse=True)[:2]
        
        signals = []
        for i, (name, qty) in enumerate(sorted_bestsellers):
            signals.append({"id": i + 1, "type": "bestseller", "label": name, "impact": "high", "message": f"{int(qty)} të shitura sot", "action": "Shiko Produktin"})
        
        if low_stock_items:
            item = low_stock_items[0]
            signals.append({"id": 99, "type": "low_stock", "label": item["name"], "impact": "high", "message": f"vetëm {int(item['current_stock'])} {item['unit']}", "action": "Furnizohu"})
        
        return {"signals": signals}

    async def _compile_tactical_agenda(self) -> List[Dict]:
        user_filter = {"user_id": self.user_id_obj} if self.user_id_obj else {"user_id": self.user_id_str}
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        cursor = self.db.calendar_events.find({
            **user_filter,
            "start_date": {"$gte": today_start, "$lt": today_end}
        }).sort("start_date", 1)
        
        events = await cursor.to_list(length=50)
        agenda_items = []
        now = datetime.utcnow()

        for event in events:
            event_date = event.get('start_date', now)
            event_type = event.get('event_type', 'TASK').upper()
            is_alert = event_type in ['PAYMENT_DUE', 'TAX_DEADLINE']
            hours_diff = (event_date.timestamp() - now.timestamp()) / 3600
            
            agenda_item = {
                "id": str(event.get('_id')), "title": event.get('title', 'Pa titull'),
                "time": event_date.strftime("%H:%M"), "priority": map_api_priority(event.get('priority')),
                "isCompleted": hours_diff < -1, "kind": 'alert' if is_alert else 'event',
                "raw": event 
            }
            agenda_items.append(agenda_item)
            
        return agenda_items