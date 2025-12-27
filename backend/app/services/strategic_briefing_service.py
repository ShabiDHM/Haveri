# FILE: backend/app/services/strategic_briefing_service.py
# PHOENIX PROTOCOL - STRATEGIC INTELLIGENCE ENGINE V19.5 (I18N FIX)
# 1. I18N: Replaced hardcoded text with structured translation keys.
# 2. LOGIC: Maintains 'csv parsing' for [Staff: Name].

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import random
import re

logger = logging.getLogger(__name__)

class StrategicBriefingService:
    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id = user_id

    async def generate_strategic_briefing(self) -> Dict[str, Any]:
        invoices = await self._fetch_invoices()
        expenses = await self._fetch_expenses()
        events = await self._fetch_todays_events()

        staff_data = self._analyze_staff_performance(invoices)
        market_data = self._analyze_market_pulse()
        agenda_data = self._compile_tactical_agenda(events, invoices)

        return {
            "staffPerformance": staff_data,
            "market": market_data,
            "agenda": agenda_data
        }

    # --- DATA FETCHING ---
    async def _fetch_invoices(self) -> List[Dict]:
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            cursor = self.db.invoices.find({
                "user_id": self.user_id,
                "$or": [
                    {"created_at": {"$gte": today_start.isoformat()}},
                    {"issue_date": {"$gte": today_start.isoformat()}}
                ]
            })
            return await cursor.to_list(length=1000)
        except Exception: return []

    async def _fetch_expenses(self) -> List[Dict]:
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            cursor = self.db.expenses.find({"user_id": self.user_id, "date": {"$gte": thirty_days_ago.isoformat()}})
            return await cursor.to_list(length=1000)
        except Exception: return []

    async def _fetch_todays_events(self) -> List[Dict]:
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(hours=24)
            cursor = self.db.calendar_events.find({"user_id": self.user_id, "start_date": {"$gte": today_start.isoformat(), "$lt": today_end.isoformat()}})
            return await cursor.to_list(length=50)
        except Exception: return []

    # --- INTELLIGENCE LOGIC ---

    def _analyze_staff_performance(self, invoices: List[Dict]) -> Dict[str, Any]:
        staff_stats = {}
        
        if not invoices:
            return {
                "efficiencyStatus": "sleep", 
                "efficiencyScore": 0,
                "mvpName": "N/A",
                "mvpTotal": 0,
                "mvpInsight": {"key": "no_active_shift", "values": {}},
                "actionBravo": False
            }

        for inv in invoices:
            staff_name = inv.get('waiter_name', inv.get('created_by', 'Stafi'))
            description = inv.get('notes', '') or inv.get('description', '')
            match = re.search(r'\[Staff:\s*(.*?)\]', description, re.IGNORECASE)
            if match:
                staff_name = match.group(1).strip()

            amount = float(inv.get('total_amount', 0))
            if staff_name not in staff_stats:
                staff_stats[staff_name] = {"total": 0, "count": 0}
            staff_stats[staff_name]["total"] += amount
            staff_stats[staff_name]["count"] += 1

        if not staff_stats:
             return {"efficiencyStatus": "sleep", "efficiencyScore": 0, "mvpName": "N/A", "mvpTotal": 0, "mvpInsight": {"key": "no_data", "values": {}}, "actionBravo": False}

        mvp_name = max(staff_stats, key=lambda k: staff_stats[k]['total'])
        mvp_data = staff_stats[mvp_name]
        avg_ticket = mvp_data['total'] / mvp_data['count'] if mvp_data['count'] else 0
        
        total_txs = len(invoices)
        if total_txs > 15: status = "fire"
        elif total_txs > 5: status = "stable"
        else: status = "sleep"
        score = int((total_txs / 30) * 100) if total_txs < 30 else 98

        # RETURN STRUCTURED TRANSLATION KEY
        return {
            "efficiencyStatus": status,
            "efficiencyScore": score,
            "mvpName": mvp_name,
            "mvpTotal": int(mvp_data['total']),
            "mvpInsight": {
                "key": "avg_ticket_insight",
                "values": { "avg": f"{avg_ticket:.2f}" }
            },
            "actionBravo": True
        }

    def _analyze_market_pulse(self) -> Dict[str, Any]:
        now = datetime.utcnow()
        month = now.month
        weekday = now.weekday()
        signals = []
        signal_id = 1
        if month in [7, 8, 12, 1]: signals.append({"id": signal_id, "type": "diaspora", "label": "Sezoni i Diasporës", "impact": "high", "message": "Fluks i lartë pritet. Rrit stokun e produkteve premium.", "action": "Stoko Premium"}); signal_id += 1
        if weekday >= 4: signals.append({"id": signal_id, "type": "holiday", "label": "Fundjava", "impact": "medium", "message": "Rezervimet janë në rritje. Përgatit stafin shtesë.", "action": "Menaxho Stafin"}); signal_id += 1
        else: signals.append({"id": signal_id, "type": "competitor", "label": "Dita e Qetë", "impact": "low", "message": "Trafik i ulët sot. Koha ideale për inventar.", "action": "Inventarizo"}); signal_id += 1
        w = random.choice([{"msg": "Shi i rrëmbyeshëm. Delivery +40%.", "act": "Aktivo Promo", "imp": "medium"}, {"msg": "Diell. Tarraca do jetë plot.", "act": "Hap Tarracën", "imp": "high"}]); signals.append({"id": signal_id, "type": "weather", "label": "Parashikimi i Motit", "impact": w['imp'], "message": w['msg'], "action": w['act']})
        return {"signals": signals}

    def _compile_tactical_agenda(self, events: List[Dict], invoices: List[Dict]) -> List[Dict]:
        agenda_items = []
        for event in events: agenda_items.append({"id": str(event.get('_id', 'evt')), "title": event.get('title', 'Ngjarje pa titull'), "time": self._format_time(event.get('start_date')), "type": "meeting", "priority": str(event.get('priority', 'medium')).lower(), "isCompleted": False})
        overdue_invoices = [i for i in invoices if i.get('status') == 'OVERDUE']
        if overdue_invoices: top_debt = sorted(overdue_invoices, key=lambda x: x.get('total_amount', 0), reverse=True)[0]; agenda_items.insert(0, {"id": f"inv_{top_debt.get('_id')}", "title": f"Mblidh borxhin: {top_debt.get('client_name')}", "time": "09:00", "type": "payment", "priority": "high", "isCompleted": False})
        if datetime.utcnow().day > 25: agenda_items.append({"id": "tax_reminder", "title": "Përgatit Deklarimin TVSH", "time": "14:00", "type": "deadline", "priority": "high", "isCompleted": False})
        return agenda_items

    def _format_time(self, iso_date: Optional[Any]) -> str:
        if not iso_date or not isinstance(iso_date, str): return "--:--"
        try: dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00')); return dt.strftime("%H:%M")
        except: return "--:--"