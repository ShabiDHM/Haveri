# FILE: backend/app/services/strategic_briefing_service.py
# PHOENIX PROTOCOL - STRATEGIC INTELLIGENCE ENGINE V21.1 (SYNTAX FIX)
# 1. FIX: Added the missing 'import asyncio' statement.

import logging
import asyncio  # <-- PHOENIX FIX
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from bson import ObjectId

logger = logging.getLogger(__name__)

class StrategicBriefingService:
    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id_obj = ObjectId(user_id)

    async def generate_strategic_briefing(self) -> Dict[str, Any]:
        # Perform all data fetching and analysis concurrently
        staff_data, market_data, agenda_data = await asyncio.gather(
            self._analyze_staff_performance(),
            self._analyze_market_pulse(),
            self._compile_tactical_agenda()
        )

        return {
            "staffPerformance": staff_data,
            "market": market_data,
            "agenda": agenda_data
        }

    # --- LIVE DATA ANALYSIS ---

    async def _analyze_staff_performance(self) -> Dict[str, Any]:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # --- PHOENIX: LIVE AGGREGATION QUERY ---
        pipeline = [
            {
                "$match": {
                    "user_id": self.user_id_obj,
                    "issue_date": {"$gte": today_start},
                    "status": "PAID"
                }
            },
            {
                "$group": {
                    "_id": None, # Group all of today's sales together
                    "total_revenue": {"$sum": "$total_amount"},
                    "transaction_count": {"$sum": 1}
                }
            }
        ]
        
        result = await self.db.invoices.aggregate(pipeline).to_list(length=1)

        total_revenue_today = 0
        total_txs = 0
        if result:
            total_revenue_today = result[0].get("total_revenue", 0)
            total_txs = result[0].get("transaction_count", 0)

        # Determine status based on live transaction count
        if total_txs > 15: 
            status = "fire"
        elif total_txs > 5: 
            status = "stable"
        else: 
            status = "sleep"
        
        score = min(98, int((total_txs / 30.0) * 100))

        return {
            "efficiencyStatus": status,
            "efficiencyScore": score,
            "mvpName": "Live Data", # Placeholder, can be enhanced later
            "mvpTotal": total_revenue_today, # THIS IS THE LIVE, REAL-TIME VALUE
            "mvpInsight": {"key": "total_transactions_today", "values": {"count": total_txs}},
            "actionBravo": total_revenue_today > 0
        }

    async def _analyze_market_pulse(self) -> Dict[str, Any]:
        # --- PHOENIX: LIVE INVENTORY & SALES ANALYSIS ---
        bestsellers_pipeline = [
            {"$match": { "user_id": self.user_id_obj, "issue_date": {"$gte": datetime.utcnow() - timedelta(days=1)} }},
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.description",
                "total_quantity": {"$sum": "$items.quantity"}
            }},
            {"$sort": {"total_quantity": -1}},
            {"$limit": 2}
        ]

        low_stock_pipeline = [
            {"$match": {
                "user_id": self.user_id_obj,
                "$expr": {"$lte": ["$current_stock", "$low_stock_threshold"]}
            }},
            {"$sort": {"current_stock": 1}},
            {"$limit": 1}
        ]

        bestsellers, low_stock_items = await asyncio.gather(
            self.db.invoices.aggregate(bestsellers_pipeline).to_list(length=2),
            self.db.inventory_items.aggregate(low_stock_pipeline).to_list(length=1)
        )
        
        # Format signals for frontend
        signals = []
        for i, item in enumerate(bestsellers):
            signals.append({
                "id": i + 1, "type": "bestseller", "label": item["_id"], 
                "impact": "high", "message": f"{int(item['total_quantity'])} të shitura sot", "action": "Shiko Produktin"
            })
            
        if low_stock_items:
            item = low_stock_items[0]
            signals.append({
                "id": 99, "type": "low_stock", "label": item["name"],
                "impact": "high", "message": f"vetëm {int(item['current_stock'])} {item['unit']}", "action": "Furnizohu"
            })

        return {"signals": signals}

    async def _compile_tactical_agenda(self) -> List[Dict]:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        cursor = self.db.calendar_events.find({
            "user_id": self.user_id_obj,
            "start_date": {"$gte": today_start, "$lt": today_end}
        }).sort("start_date", 1)
        
        events = await cursor.to_list(length=50)

        agenda_items = []
        for event in events:
            dt = event.get('start_date', datetime.now(timezone.utc))
            agenda_items.append({
                "id": str(event.get('_id')), 
                "title": event.get('title', 'Pa titull'), 
                "time": dt.strftime("%H:%M"), 
                "type": "meeting", # Simplified for now
                "priority": str(event.get('priority', 'medium')).lower(), 
                "isCompleted": False
            })
        return agenda_items