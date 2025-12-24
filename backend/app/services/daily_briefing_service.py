# FILE: backend/app/services/daily_briefing_service.py
# PHOENIX PROTOCOL - DAILY BRIEFING AGENT V3.1 (ALERTS ENABLED)
# 1. UPDATED: Calendar logic now fetches "Today's Events" AND "Upcoming Deadlines" (3 Days).
# 2. LOGIC: Merges them into a single timeline for the dashboard.

from datetime import datetime, timedelta
from typing import Dict, Any, List
from typing import Any as AnyType

class DailyBriefingService:
    def __init__(self, db: AnyType):
        self.db = db

    async def generate_morning_report(self, user_id: str) -> Dict[str, Any]:
        """
        Runs the 06:00 AM logic:
        1. Checks unpaid invoices (Finance).
        2. Calculates stock burnout risk (Inventory).
        3. Fetches Agenda + Upcoming Alerts (Calendar).
        4. Calculates Yesterday's Revenue & Top Product.
        """
        
        # 1. FINANCE CHECK
        unpaid_invoices = await self._get_unpaid_invoices(user_id)
        yesterday_revenue = await self._get_yesterday_revenue(user_id)
        
        # 2. INVENTORY PREDICTION
        stock_risks = await self._predict_stock_risks(user_id)
        top_product = await self._get_top_product_yesterday(user_id)
        
        # 3. CALENDAR (Today's Agenda + Urgent Alerts)
        calendar_data = await self._get_calendar_briefing(user_id)

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
                "agent": "Haveri AI v3.1"
            }
        }

    async def _get_unpaid_invoices(self, user_id: str) -> List[Dict]:
        cursor = self.db.invoices.find({
            "user_id": user_id,
            "status": {"$in": ["SENT", "OVERDUE", "PENDING"]}, 
        }).sort("due_date", 1)
        invoices = await cursor.to_list(length=10)
        return [
            {
                "client": inv.get("client_name", "Unknown"),
                "amount": inv.get("total_amount", 0.0),
                "status": inv.get("status"),
                "invoice_number": inv.get("invoice_number", "N/A")
            }
            for inv in invoices
        ]

    async def _get_yesterday_revenue(self, user_id: str) -> float:
        now = datetime.utcnow()
        start_of_yesterday = datetime(now.year, now.month, now.day) - timedelta(days=1)
        end_of_yesterday = datetime(now.year, now.month, now.day)
        pipeline = [
            {"$match": {"user_id": user_id, "date": {"$gte": start_of_yesterday, "$lt": end_of_yesterday}, "type": "income"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = await self.db.transactions.aggregate(pipeline).to_list(length=1)
        return float(result[0].get("total", 0.0)) if result else 0.0

    async def _get_top_product_yesterday(self, user_id: str) -> str:
        now = datetime.utcnow()
        start_of_yesterday = datetime(now.year, now.month, now.day) - timedelta(days=1)
        end_of_yesterday = datetime(now.year, now.month, now.day)
        pipeline = [
            {"$match": {"user_id": user_id, "date": {"$gte": start_of_yesterday, "$lt": end_of_yesterday}, "type": "income"}},
            {"$group": {"_id": "$description", "count": {"$sum": "$quantity"}}},
            {"$sort": {"count": -1}}, {"$limit": 1}
        ]
        result = await self.db.transactions.aggregate(pipeline).to_list(length=1)
        return str(result[0].get("_id")) if result and result[0].get("_id") else "N/A"

    async def _get_calendar_briefing(self, user_id: str) -> Dict[str, Any]:
        """Fetches Today's Events AND Urgent Deadlines (Next 3 Days)"""
        now = datetime.utcnow()
        start_of_day = datetime(now.year, now.month, now.day)
        end_of_day = start_of_day + timedelta(days=1)
        three_days_later = end_of_day + timedelta(days=3)

        # 1. Get Today's Events (All Types)
        cursor_today = self.db.calendar_events.find({
            "owner_id": user_id, 
            "start_date": {"$gte": start_of_day, "$lt": end_of_day}
        }).sort("start_date", 1)
        today_events = await cursor_today.to_list(length=10)

        # 2. Get Upcoming Urgent Items (Deadlines/Court Dates only)
        cursor_alerts = self.db.calendar_events.find({
            "owner_id": user_id,
            "start_date": {"$gte": end_of_day, "$lte": three_days_later},
            "event_type": {"$in": ["DEADLINE", "COURT_DATE", "HEARING"]}
        }).sort("start_date", 1)
        upcoming_alerts = await cursor_alerts.to_list(length=5)

        # 3. Format & Merge
        formatted_items = []
        
        # Add Today's Items
        for evt in today_events:
            formatted_items.append({
                "title": evt.get("title"),
                "time": evt.get("start_date"),
                "type": evt.get("event_type", "MEETING"),
                "location": evt.get("location", ""),
                "is_alert": False
            })

        # Add Alerts (Marked distinctively)
        for evt in upcoming_alerts:
            formatted_items.append({
                "title": evt.get("title"),
                "time": evt.get("start_date"),
                "type": evt.get("event_type", "DEADLINE"),
                "location": "Upcoming",
                "is_alert": True # Frontend will use this to style differently
            })

        return {
            "count": len(formatted_items),
            "items": formatted_items
        }

    async def _predict_stock_risks(self, user_id: str) -> List[Dict]:
        risks = []
        async for item in self.db.inventory.find({"user_id": user_id}):
            stock = item.get("current_stock", 0.0)
            threshold = item.get("low_stock_threshold", 5.0)
            if stock <= threshold:
                risks.append({
                    "name": item["name"],
                    "status": "CRITICAL" if stock <= 0 else "LOW",
                    "remaining": stock,
                    "prediction": "Immediate Action Required"
                })
        return risks