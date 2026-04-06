# FILE: backend/app/services/strategic_briefing_service.py
# PHOENIX PROTOCOL - STRATEGIC INTELLIGENCE ENGINE V29.2 (FIXED OBJECTID SERIALIZATION)

import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from bson import ObjectId

logger = logging.getLogger(__name__)

def map_api_priority(priority: Optional[str]) -> str:
    if priority in ['CRITICAL', 'HIGH']: return 'high'
    if priority == 'MEDIUM': return 'medium'
    return 'low'

def convert_objectid_to_str(obj: Any) -> Any:
    """Recursively convert ObjectId to string for JSON serialization."""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: convert_objectid_to_str(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectid_to_str(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj

class StrategicBriefingService:
    def __init__(self, db, user_id: str, case_id: Optional[str] = None):
        self.db = db
        self.user_id_str = user_id
        self.user_id_obj = ObjectId(user_id)
        self.case_id = case_id

    async def generate_strategic_briefing(self) -> Dict[str, Any]:
        staff_data, market_data, agenda_data = await asyncio.gather(
            self._analyze_staff_performance(),
            self._analyze_market_pulse(),
            self._compile_tactical_agenda()
        )
        return {"staffPerformance": staff_data, "market": market_data, "agenda": agenda_data}

    async def _analyze_staff_performance(self) -> Dict[str, Any]:
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        invoice_filter = {"user_id": self.user_id_obj}
        transaction_filter = {"user_id": self.user_id_str}

        invoices_pipeline = [
            {"$match": {**invoice_filter, "issue_date": {"$gte": month_start}, "status": {"$nin": ["CANCELLED", "VOID"]}}},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total_amount"}, "transaction_count": {"$sum": 1}}}
        ]
        
        transactions_pipeline = [
            {"$match": {
                **transaction_filter,
                "$or": [
                    {"date": {"$gte": month_start}},
                    {"transaction_date": {"$gte": month_start}},
                    {"date": {"$gte": month_start.isoformat()}},
                    {"transaction_date": {"$gte": month_start.isoformat()}}
                ]
            }},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$amount"}, "transaction_count": {"$sum": 1}}}
        ]

        invoice_result, transaction_result = await asyncio.gather(
            self.db.invoices.aggregate(invoices_pipeline).to_list(length=1),
            self.db.transactions.aggregate(transactions_pipeline).to_list(length=1)
        )

        invoice_revenue = invoice_result[0].get("total_revenue", 0) if invoice_result else 0
        invoice_txs = invoice_result[0].get("transaction_count", 0) if invoice_result else 0
        
        transaction_revenue = transaction_result[0].get("total_revenue", 0) if transaction_result else 0
        transaction_txs = transaction_result[0].get("transaction_count", 0) if transaction_result else 0
        
        total_mtd_revenue = invoice_revenue + transaction_revenue
        total_mtd_txs = invoice_txs + transaction_txs
        
        status = "fire" if total_mtd_txs > (now.day * 10) else "stable"
        score = min(98, int((total_mtd_txs / (now.day * 20.0)) * 100)) if now.day > 0 else 0
        
        return {
            "efficiencyStatus": status, "efficiencyScore": score, "mvpName": "Live Data",
            "mvpTotal": total_mtd_revenue, "mvpInsight": {"key": "total_transactions_mtd", "values": {"count": total_mtd_txs}},
            "actionBravo": total_mtd_revenue > 0
        }

    async def _analyze_market_pulse(self) -> Dict[str, Any]:
        invoice_filter = {"user_id": self.user_id_obj}
        transaction_filter = {"user_id": self.user_id_str}
        inventory_filter = {"user_id": self.user_id_str}
        
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_start_iso = today_start.isoformat()
        
        bestsellers_invoices = [{"$match": {**invoice_filter, "issue_date": {"$gte": today_start}}}, {"$unwind": "$items"}, {"$group": {"_id": "$items.description", "total_quantity": {"$sum": "$items.quantity"}}}]
        bestsellers_transactions = [{"$match": {**transaction_filter, "$or": [{"date": {"$gte": today_start}}, {"transaction_date": {"$gte": today_start}}, {"date": {"$gte": today_start_iso}}, {"transaction_date": {"$gte": today_start_iso}}]}}, {"$group": {"_id": "$product_name", "total_quantity": {"$sum": "$quantity"}}}]
        low_stock_pipeline = [{"$match": {**inventory_filter, "$expr": {"$lte": ["$current_stock", "$low_stock_threshold"]}}}, {"$sort": {"current_stock": 1}}, {"$limit": 1}]
        
        invoices_sales, transactions_sales, low_stock_items = await asyncio.gather(
            self.db.invoices.aggregate(bestsellers_invoices).to_list(length=10),
            self.db.transactions.aggregate(bestsellers_transactions).to_list(length=10),
            self.db.inventory_items.aggregate(low_stock_pipeline).to_list(length=1)
        )
        
        combined_sales = {}
        for item in invoices_sales + transactions_sales:
            if item.get("_id"): combined_sales[item["_id"]] = combined_sales.get(item["_id"], 0) + item["total_quantity"]
        
        sorted_bestsellers = sorted(combined_sales.items(), key=lambda x: x[1], reverse=True)[:2]
        
        signals = []
        for i, (name, qty) in enumerate(sorted_bestsellers):
            signals.append({"id": i + 1, "type": "bestseller", "label": name, "impact": "high", "message": f"{int(qty)} të shitura sot", "action": "Shiko Produktin"})
        
        if low_stock_items:
            item = low_stock_items[0]
            signals.append({"id": 99, "type": "low_stock", "label": item["name"], "impact": "high", "message": f"vetëm {int(item['current_stock'])} {item['unit']}", "action": "Furnizohu"})
        
        return {"signals": signals}

    async def _compile_tactical_agenda(self) -> List[Dict]:
        """Fetch all calendar events for the next 7 days."""
        
        # Filter by owner_id only (no case_id filter)
        user_filter: Dict[str, Any] = {"owner_id": self.user_id_obj}
        
        now = datetime.utcnow()
        week_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)
        
        # Apply date filter
        date_filter: Dict[str, Any] = {
            **user_filter,
            "start_date": {"$gte": week_start, "$lt": week_end}
        }
        
        cursor = self.db.calendar_events.find(date_filter).sort("start_date", 1)
        events = await cursor.to_list(length=100)
        
        logger.info(f"Agenda: Found {len(events)} events for user in next 7 days")
        
        agenda_items = []

        for event in events:
            event_date = event.get('start_date', now)
            event_type = event.get('event_type', 'TASK').upper()
            is_alert = event_type in ['PAYMENT_DUE', 'TAX_DEADLINE']
            
            if isinstance(event_date, str):
                try:
                    event_date = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                except Exception:
                    event_date = now
            
            days_diff = (event_date.replace(hour=0, minute=0, second=0, microsecond=0) - week_start.replace(hour=0, minute=0, second=0, microsecond=0)).days
            
            if days_diff == 0:
                time_display = event_date.strftime("%H:%M")
            elif days_diff == 1:
                time_display = "Nesër"
            else:
                time_display = event_date.strftime("%d %b")
            
            # Convert the raw event to a serializable dict (convert ObjectId to string)
            serializable_raw = convert_objectid_to_str(event)
            
            agenda_item = {
                "id": str(event.get('_id')), 
                "title": event.get('title', 'Pa titull'),
                "time": time_display,
                "priority": map_api_priority(event.get('priority')),
                "isCompleted": False,
                "kind": 'alert' if is_alert else 'event',
                "raw": serializable_raw,
                "type": event_type,
                "date": event_date.isoformat() if hasattr(event_date, 'isoformat') else str(event_date)
            }
            agenda_items.append(agenda_item)
            
        logger.info(f"Final agenda items count = {len(agenda_items)}")
        return agenda_items