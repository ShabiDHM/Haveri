# FILE: backend/app/services/daily_briefing_service.py
# PHOENIX PROTOCOL - DAILY BRIEFING AGENT V2.0 (STABLE)
# 1. FIX: Changed db type to 'Any' to resolve Pylance 'reportInvalidTypeForm'.
# 2. STATUS: Production Ready.

from datetime import datetime, timedelta
from typing import Dict, Any, List

class DailyBriefingService:
    def __init__(self, db: Any):
        """
        :param db: AsyncIOMotorDatabase instance (Typed as Any to satisfy Pylance)
        """
        self.db = db

    async def generate_morning_report(self, user_id: str) -> Dict[str, Any]:
        """
        Runs the 06:00 AM logic:
        1. Checks unpaid invoices (Finance).
        2. Calculates stock burnout risk based on yesterday's sales (Inventory).
        3. Fetches today's agenda (Calendar).
        """
        
        # 1. FINANCE CHECK (Unpaid Invoices)
        unpaid_invoices = await self._get_unpaid_invoices(user_id)
        
        # 2. INVENTORY PREDICTION (Stock-out Risk)
        stock_risks = await self._predict_stock_risks(user_id)
        
        # 3. CALENDAR (Today's Agenda)
        today_events = await self._get_todays_events(user_id)

        return {
            "finance": {
                "attention_needed": len(unpaid_invoices) > 0,
                "unpaid_count": len(unpaid_invoices),
                "items": unpaid_invoices[:5] # Top 5 only
            },
            "inventory": {
                "risk_alert": len(stock_risks) > 0,
                "risk_count": len(stock_risks),
                "items": stock_risks
            },
            "calendar": {
                "event_count": len(today_events),
                "items": today_events
            },
            "meta": {
                "generated_at": datetime.utcnow(),
                "agent": "Haveri AI v1.0"
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

    async def _get_todays_events(self, user_id: str) -> List[Dict]:
        now = datetime.utcnow()
        start_of_day = datetime(now.year, now.month, now.day)
        end_of_day = start_of_day + timedelta(days=1)

        # Note: Calendar model uses 'owner_id'
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