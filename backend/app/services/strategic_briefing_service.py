# FILE: backend/app/services/strategic_briefing_service.py
# PHOENIX PROTOCOL - STRATEGIC INTELLIGENCE ENGINE V19.3 (STAFF MVP)
# 1. NEW MODULE: _analyze_staff_performance replacing Liquidity.
# 2. FEATURE: Identifies MVP and Shift Efficiency (Scenario A).
# 3. STATUS: Production Ready.

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)

class StrategicBriefingService:
    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id = user_id

    async def generate_strategic_briefing(self) -> Dict[str, Any]:
        """
        Generates the Tactical Daily Briefing (Staff, Market, Agenda).
        """
        logger.info(f"Generating tactical briefing for user {self.user_id}")

        # 1. Fetch Real Data
        invoices = await self._fetch_invoices()
        expenses = await self._fetch_expenses()
        events = await self._fetch_todays_events()

        # 2. Process Intelligence Modules
        # REPLACED: Liquidity logic replaced by Staff Performance logic
        staff_data = self._analyze_staff_performance(invoices)
        market_data = self._analyze_market_pulse()
        agenda_data = self._compile_tactical_agenda(events, invoices)

        # 3. Return Payload
        return {
            "staffPerformance": staff_data,
            "market": market_data,
            "agenda": agenda_data
        }

    # --- DATA FETCHING LAYERS (MongoDB) ---

    async def _fetch_invoices(self) -> List[Dict]:
        """Fetches active invoices for the user (Last 24h for Staff Stats)."""
        try:
            # We broaden the search to get recent performance data
            yesterday = datetime.utcnow() - timedelta(hours=24)
            cursor = self.db.invoices.find({
                "user_id": self.user_id,
                "created_at": {"$gte": yesterday.isoformat()}
            })
            return await cursor.to_list(length=1000)
        except Exception as e:
            logger.error(f"Error fetching invoices: {e}")
            return []

    async def _fetch_expenses(self) -> List[Dict]:
        """Fetches recent expenses."""
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            cursor = self.db.expenses.find({
                "user_id": self.user_id,
                "date": {"$gte": thirty_days_ago.isoformat()} 
            })
            return await cursor.to_list(length=1000)
        except Exception as e:
            logger.error(f"Error fetching expenses: {e}")
            return []

    async def _fetch_todays_events(self) -> List[Dict]:
        """Fetches calendar events for today."""
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(hours=24)
            
            cursor = self.db.calendar_events.find({
                "user_id": self.user_id,
                "start_date": {
                    "$gte": today_start.isoformat(),
                    "$lt": today_end.isoformat()
                }
            })
            return await cursor.to_list(length=50)
        except Exception as e:
            logger.error(f"Error fetching events: {e}")
            return []

    # --- INTELLIGENCE LOGIC ---

    def _analyze_staff_performance(self, invoices: List[Dict]) -> Dict[str, Any]:
        """
        Calculates the 'MVP' of the shift and overall efficiency.
        """
        staff_stats = {}
        
        # 1. Group Sales by Staff
        if not invoices:
            # Cold Start / Demo Data if no sales yet in last 24h
            return {
                "efficiencyStatus": "sleep", 
                "efficiencyScore": 0,
                "mvpName": "N/A",
                "mvpTotal": 0,
                "mvpInsight": "No active shift data.",
                "actionBravo": False
            }

        for inv in invoices:
            # Try to get staff name, fallback to 'created_by' or default
            staff_name = inv.get('waiter_name', inv.get('created_by', 'Stafi (General)'))
            amount = float(inv.get('total_amount', 0))
            
            if staff_name not in staff_stats:
                staff_stats[staff_name] = {"total": 0, "count": 0}
            
            staff_stats[staff_name]["total"] += amount
            staff_stats[staff_name]["count"] += 1

        # 2. Find MVP
        if not staff_stats:
             return {
                 "efficiencyStatus": "sleep", 
                 "efficiencyScore": 0, 
                 "mvpName": "N/A", 
                 "mvpTotal": 0, 
                 "mvpInsight": "No data.", 
                 "actionBravo": False
            }

        mvp_name = max(staff_stats, key=lambda k: staff_stats[k]['total'])
        mvp_data = staff_stats[mvp_name]
        
        # 3. Calculate Insight (Ticket Average)
        avg_ticket = mvp_data['total'] / mvp_data['count'] if mvp_data['count'] else 0
        
        # 4. Shift "Vibe" (Efficiency) based on transaction density
        total_txs = len(invoices)
        if total_txs > 20: status = "fire"
        elif total_txs > 5: status = "stable"
        else: status = "sleep"

        # Calculate Score (0-100)
        score = int((total_txs / 50) * 100) if total_txs < 50 else 98

        return {
            "efficiencyStatus": status,
            "efficiencyScore": score,
            "mvpName": mvp_name,
            "mvpTotal": int(mvp_data['total']),
            "mvpInsight": f"Mesatarja €{avg_ticket:.2f} për tavolinë.",
            "actionBravo": True
        }

    def _analyze_market_pulse(self) -> Dict[str, Any]:
        """
        The 'Market Pulse' Logic.
        """
        now = datetime.utcnow()
        month = now.month
        weekday = now.weekday()

        signals = []
        signal_id = 1

        # Logic: Diaspora Season
        if month in [7, 8, 12, 1]:
            signals.append({
                "id": signal_id,
                "type": "diaspora",
                "label": "Sezoni i Diasporës",
                "impact": "high",
                "message": "Fluks i lartë pritet. Rrit stokun e produkteve premium.",
                "action": "Stoko Premium"
            })
            signal_id += 1

        # Logic: Weekend Rush
        if weekday >= 4:
            signals.append({
                "id": signal_id,
                "type": "holiday",
                "label": "Fundjava",
                "impact": "medium",
                "message": "Rezervimet janë në rritje. Përgatit stafin shtesë.",
                "action": "Menaxho Stafin"
            })
            signal_id += 1
        else:
             signals.append({
                "id": signal_id,
                "type": "competitor",
                "label": "Dita e Qetë",
                "impact": "low",
                "message": "Trafik i ulët sot. Koha ideale për inventar.",
                "action": "Inventarizo"
            })
             signal_id += 1

        # Logic: Weather (Mocked for variation)
        weather_scenarios = [
            {"msg": "Shi i rrëmbyeshëm. Delivery +40%.", "act": "Aktivo Promo", "imp": "medium"},
            {"msg": "Diell. Tarraca do jetë plot.", "act": "Hap Tarracën", "imp": "high"}
        ]
        w = random.choice(weather_scenarios)
        signals.append({
            "id": signal_id,
            "type": "weather",
            "label": "Parashikimi i Motit",
            "impact": w['imp'],
            "message": w['msg'],
            "action": w['act']
        })

        return {
            "signals": signals
        }

    def _compile_tactical_agenda(self, events: List[Dict], invoices: List[Dict]) -> List[Dict]:
        """
        The 'Tactical Agenda' Logic.
        """
        agenda_items = []
        
        for event in events:
            start_date_val = event.get('start_date')
            agenda_items.append({
                "id": str(event.get('_id', 'evt')),
                "title": event.get('title', 'Ngjarje pa titull'),
                "time": self._format_time(start_date_val),
                "type": "meeting",
                "priority": str(event.get('priority', 'medium')).lower(),
                "isCompleted": False
            })

        overdue_invoices = [i for i in invoices if i.get('status') == 'OVERDUE']
        if overdue_invoices:
            top_debt = sorted(overdue_invoices, key=lambda x: x.get('total_amount', 0), reverse=True)[0]
            agenda_items.insert(0, {
                "id": f"inv_{top_debt.get('_id')}",
                "title": f"Mblidh borxhin: {top_debt.get('client_name')}",
                "time": "09:00",
                "type": "payment",
                "priority": "high",
                "isCompleted": False
            })

        if datetime.utcnow().day > 25:
             agenda_items.append({
                "id": "tax_reminder",
                "title": "Përgatit Deklarimin TVSH",
                "time": "14:00",
                "type": "deadline",
                "priority": "high",
                "isCompleted": False
            })

        return agenda_items

    def _format_time(self, iso_date: Optional[Any]) -> str:
        """Helper to extract HH:MM from ISO string. Safe for None types."""
        if not iso_date or not isinstance(iso_date, str):
            return "--:--"
        try:
            dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
            return dt.strftime("%H:%M")
        except:
            return "--:--"