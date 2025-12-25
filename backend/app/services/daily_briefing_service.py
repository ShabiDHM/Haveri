# FILE: backend/app/services/daily_briefing_service.py
# PHOENIX PROTOCOL - DAILY BRIEFING AGENT V3.4 (VISIBILITY FIX)
# 1. FIX: Widened revenue query window to include TODAY.
# 2. REASON: Ensures imported data (defaulting to 'now') appears in the dashboard immediately.
# 3. STATUS: Production Ready.

from datetime import datetime, timedelta
from typing import Dict, Any, List
from bson import ObjectId
from typing import Any as AnyType

class DailyBriefingService:
    def __init__(self, db: AnyType):
        self.db = db

    async def generate_morning_report(self, user_id: str) -> Dict[str, Any]:
        user_id_str = str(user_id)
        
        # 1. FINANCE CHECK
        unpaid_invoices = await self._get_unpaid_invoices(user_id_str)
        # Now fetches Yesterday + Today so recent imports show up
        yesterday_revenue = await self._get_recent_revenue(user_id_str)
        
        # 2. INVENTORY PREDICTION
        stock_risks = await self._predict_stock_risks(user_id_str)
        top_product = await self._get_top_product_recent(user_id_str)
        
        # 3. CALENDAR
        calendar_data = await self._get_calendar_briefing(user_id_str)

        return {
            "finance": {
                "attention_needed": len(unpaid_invoices) > 0,
                "unpaid_count": len(unpaid_invoices),
                "items": unpaid_invoices[:5],
                "revenue_yesterday": yesterday_revenue
            },
            "inventory": {
                "risk_alert": len(stock_risks) > 0,
                "risk_count": len(stock_risks),
                "items": stock_risks,
                "top_product": top_product
            },
            "calendar": {
                "event_count": calendar_data["count"],
                "items": calendar_data["items"]
            },
            "meta": {
                "generated_at": datetime.utcnow(),
                "agent": "Haveri AI v3.4"
            }
        }

    async def _get_unpaid_invoices(self, user_id: str) -> List[Dict]:
        try:
            user_oid = ObjectId(user_id)
        except:
            return []

        cursor = self.db.invoices.find({
            "user_id": user_oid,
            "status": {"$in": ["SENT", "OVERDUE", "PENDING"]}, 
        }).sort("due_date", 1)
        
        invoices = await cursor.to_list(length=10)
        return [{"client": inv.get("client_name", "Unknown"), "amount": inv.get("total_amount", 0.0), "status": inv.get("status"), "invoice_number": inv.get("invoice_number", "N/A")} for inv in invoices]

    async def _get_recent_revenue(self, user_id: str) -> float:
        # Changed to fetch Yesterday AND Today
        now = datetime.utcnow()
        start_window = datetime(now.year, now.month, now.day) - timedelta(days=1)
        
        pipeline = [
            {
                "$match": {
                    "user_id": str(user_id),
                    "date": {"$gte": start_window}, # Fetches everything since start of yesterday
                    "$or": [{"type": "income"}, {"type": "pos"}] 
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        
        result = await self.db.transactions.aggregate(pipeline).to_list(length=1)
        return float(result[0].get("total", 0.0)) if result else 0.0

    async def _get_top_product_recent(self, user_id: str) -> str:
        now = datetime.utcnow()
        start_window = datetime(now.year, now.month, now.day) - timedelta(days=1)
        
        pipeline = [
            {
                "$match": {
                    "user_id": str(user_id),
                    "date": {"$gte": start_window},
                    "$or": [{"type": "income"}, {"type": "pos"}]
                }
            },
            {"$group": {"_id": "$description", "count": {"$sum": "$quantity"}}},
            {"$sort": {"count": -1}}, 
            {"$limit": 1}
        ]
        
        result = await self.db.transactions.aggregate(pipeline).to_list(length=1)
        if result and result[0].get("_id"):
            return str(result[0].get("_id"))
        return "N/A"

    async def _get_calendar_briefing(self, user_id: str) -> Dict[str, Any]:
        now = datetime.utcnow()
        start = datetime(now.year, now.month, now.day)
        end = start + timedelta(days=1)
        three_days = end + timedelta(days=3)
        
        cursor_today = self.db.calendar_events.find({"owner_id": str(user_id), "start_date": {"$gte": start, "$lt": end}}).sort("start_date", 1)
        today_events = await cursor_today.to_list(length=10)
        
        cursor_alerts = self.db.calendar_events.find({"owner_id": str(user_id), "start_date": {"$gte": end, "$lte": three_days}, "event_type": {"$in": ["DEADLINE", "COURT_DATE", "HEARING"]}}).sort("start_date", 1)
        upcoming_alerts = await cursor_alerts.to_list(length=5)
        
        formatted = []
        for evt in today_events: formatted.append({"title": evt.get("title"), "time": evt.get("start_date"), "type": evt.get("event_type", "MEETING"), "location": evt.get("location", ""), "is_alert": False})
        for evt in upcoming_alerts: formatted.append({"title": evt.get("title"), "time": evt.get("start_date"), "type": evt.get("event_type", "DEADLINE"), "location": "Upcoming", "is_alert": True})
        
        return {"count": len(formatted), "items": formatted}

    async def _predict_stock_risks(self, user_id: str) -> List[Dict]:
        risks = []
        async for item in self.db.inventory.find({"user_id": str(user_id)}):
            stock = item.get("current_stock", 0.0)
            threshold = item.get("low_stock_threshold", 5.0)
            if stock <= threshold: risks.append({"name": item["name"], "status": "CRITICAL" if stock <= 0 else "LOW", "remaining": stock, "prediction": "Action Required"})
        return risks