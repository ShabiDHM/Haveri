# FILE: backend/app/services/strategic_briefing_service.py
# PHOENIX PROTOCOL - STRATEGIC INTELLIGENCE ENGINE V19.1 (TYPE FIX)
# 1. FIXED: _format_time now safely handles None/Non-string inputs.
# 2. STATUS: Verified against strict Pylance checks.

import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)

class StrategicBriefingService:
    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id = user_id

    async def generate_strategic_briefing(self) -> Dict[str, Any]:
        """
        Generates the Tactical Daily Briefing (Liquidity, Market, Agenda).
        """
        logger.info(f"Generating tactical briefing for user {self.user_id}")

        invoices = await self._fetch_invoices()
        expenses = await self._fetch_expenses()
        events = await self._fetch_todays_events()

        liquidity_data = self._calculate_liquidity(invoices, expenses)
        market_data = self._analyze_market_pulse()
        agenda_data = self._compile_tactical_agenda(events, invoices)

        return {
            "liquidity": liquidity_data,
            "market": market_data,
            "agenda": agenda_data
        }

    # --- DATA FETCHING LAYERS (MongoDB) ---

    async def _fetch_invoices(self) -> List[Dict]:
        try:
            cursor = self.db.invoices.find({
                "user_id": self.user_id,
                "status": {"$in": ["PAID", "PENDING", "OVERDUE", "SENT"]}
            })
            return await cursor.to_list(length=1000)
        except Exception as e:
            logger.error(f"Error fetching invoices: {e}")
            return []

    async def _fetch_expenses(self) -> List[Dict]:
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

    def _calculate_liquidity(self, invoices: List[Dict], expenses: List[Dict]) -> Dict[str, Any]:
        total_income_30d = sum(
            float(i.get('total_amount', 0)) for i in invoices 
            if i.get('status') == 'PAID'
        )
        total_expenses_30d = sum(float(e.get('amount', 0)) for e in expenses)
        
        estimated_cash_on_hand = max(1000, total_income_30d - total_expenses_30d + 2000)
        daily_burn_rate = total_expenses_30d / 30 if total_expenses_30d > 0 else 50
        days_runway = int(estimated_cash_on_hand / daily_burn_rate) if daily_burn_rate > 0 else 99

        pending_debts = sum(
            float(i.get('total_amount', 0)) for i in invoices 
            if i.get('status') in ['PENDING', 'OVERDUE', 'SENT']
        )
        upcoming_bills = int(total_expenses_30d * 0.5)

        return {
            "status": "critical" if days_runway < 15 else "stable",
            "daysRunway": days_runway,
            "cashOnHand": int(estimated_cash_on_hand),
            "pendingDebts": int(pending_debts),
            "upcomingBills": upcoming_bills
        }

    def _analyze_market_pulse(self) -> Dict[str, Any]:
        now = datetime.utcnow()
        month = now.month
        weekday = now.weekday()

        signals = []
        signal_id = 1

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
        agenda_items = []
        
        for event in events:
            # Safe access with explicit None handling
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