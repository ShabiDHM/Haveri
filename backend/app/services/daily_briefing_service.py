# FILE: backend/app/services/daily_briefing_service.py
# PHOENIX PROTOCOL - DAILY BRIEFING AGENT V3.0 (PROACTIVE INSIGHTS)
# 1. ADDED: Revenue calculation for yesterday (Positive Metric).
# 2. ADDED: Top selling product analysis (Operational Insight).
# 3. LOGIC: Fills the gap when there are no "Alerts" to show.

from datetime import datetime, timedelta
from typing import Dict, Any, List
from typing import Any as AnyType # To avoid conflict if needed, though Any is sufficient

class DailyBriefingService:
    def __init__(self, db: AnyType):
        self.db = db

    async def generate_morning_report(self, user_id: str) -> Dict[str, Any]:
        """
        Runs the 06:00 AM logic:
        1. Checks unpaid invoices (Finance).
        2. Calculates stock burnout risk (Inventory).
        3. Fetches today's agenda (Calendar).
        4. NEW: Calculates Yesterday's Revenue & Top Product.
        """
        
        # 1. FINANCE CHECK (Unpaid Invoices)
        unpaid_invoices = await self._get_unpaid_invoices(user_id)
        yesterday_revenue = await self._get_yesterday_revenue(user_id)
        
        # 2. INVENTORY PREDICTION (Stock-out Risk)
        stock_risks = await self._predict_stock_risks(user_id)
        top_product = await self._get_top_product_yesterday(user_id)
        
        # 3. CALENDAR (Today's Agenda)
        today_events = await self._get_todays_events(user_id)

        return {
            "finance": {
                "attention_needed": len(unpaid_invoices) > 0,
                "unpaid_count": len(unpaid_invoices),
                "items": unpaid_invoices[:5],
                "revenue_yesterday": yesterday_revenue # NEW FIELD
            },
            "inventory": {
                "risk_alert": len(stock_risks) > 0,
                "risk_count": len(stock_risks),
                "items": stock_risks,
                "top_product": top_product # NEW FIELD
            },
            "calendar": {
                "event_count": len(today_events),
                "items": today_events
            },
            "meta": {
                "generated_at": datetime.utcnow(),
                "agent": "Haveri AI v2.1"
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
        """Calculates total revenue from transactions recorded yesterday."""
        now = datetime.utcnow()
        start_of_yesterday = datetime(now.year, now.month, now.day) - timedelta(days=1)
        end_of_yesterday = datetime(now.year, now.month, now.day)

        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "date": {"$gte": start_of_yesterday, "$lt": end_of_yesterday},
                    "type": "income" # Ensure we only sum income
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        result = await self.db.transactions.aggregate(pipeline).to_list(length=1)
        if result:
            return float(result[0].get("total", 0.0))
        return 0.0

    async def _get_top_product_yesterday(self, user_id: str) -> str:
        """Finds the most frequently sold item description from yesterday."""
        now = datetime.utcnow()
        start_of_yesterday = datetime(now.year, now.month, now.day) - timedelta(days=1)
        end_of_yesterday = datetime(now.year, now.month, now.day)

        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "date": {"$gte": start_of_yesterday, "$lt": end_of_yesterday},
                    "type": "income"
                }
            },
            {
                "$group": {
                    "_id": "$description", # Group by product name
                    "count": {"$sum": "$quantity"} # Sum quantity
                }
            },
            { "$sort": { "count": -1 } }, # Sort descending
            { "$limit": 1 }
        ]

        result = await self.db.transactions.aggregate(pipeline).to_list(length=1)
        if result and result[0].get("_id"):
            return str(result[0].get("_id"))
        return "N/A"

    async def _get_todays_events(self, user_id: str) -> List[Dict]:
        now = datetime.utcnow()
        start_of_day = datetime(now.year, now.month, now.day)
        end_of_day = start_of_day + timedelta(days=1)

        cursor = self.db.calendar_events.find({
            "owner_id": user_id, 
            "start_date": {"$gte": start_of_day, "$lt": end_of_day}
        }).sort("start_date", 1)

        events = await cursor.to_list(length=20)
        return [
            {
                "title": evt.get("title"),
                "time": evt.get("start_date"),
                "type": evt.get("event_type", "MEETING"),
                "location": evt.get("location", "")
            }
            for evt in events
        ]

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