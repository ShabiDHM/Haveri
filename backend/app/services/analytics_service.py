# FILE: backend/app/services/analytics_service.py
# PHOENIX PROTOCOL - ANALYTICS SERVICE V2.4 (PRODUCT STATS FIX)

from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
from bson import ObjectId
import logging
import asyncio

from app.services.finance_service import FinanceService

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, sync_db: Any):
        self.sync_db = sync_db

    async def get_dashboard_data(self, user_id: str, days: int = 365, year: Optional[int] = None, case_id: Optional[str] = None) -> Dict[str, Any]:
        finance_service = FinanceService(self.sync_db)

        invoices = await asyncio.to_thread(finance_service.get_invoices, user_id, case_id)
        expenses = await asyncio.to_thread(finance_service.get_expenses, user_id, case_id)

        if year:
            start_date = datetime(year, 1, 1)
            end_date = datetime(year, 12, 31, 23, 59, 59)
        else:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)

        period_invoices = [i for i in invoices if start_date <= i.issue_date <= end_date]
        period_expenses = [e for e in expenses if start_date <= e.date <= end_date]

        total_revenue = sum(i.total_amount for i in period_invoices)
        total_expenses = sum(e.amount for e in period_expenses)
        total_profit = total_revenue - total_expenses

        sales_trend = {}
        for inv in period_invoices:
            date_str = inv.issue_date.strftime('%Y-%m-%d')
            sales_trend[date_str] = sales_trend.get(date_str, 0) + inv.total_amount

        sorted_dates = sorted(sales_trend.keys())
        trend_data = [{"date": d, "amount": sales_trend[d]} for d in sorted_dates]

        # PHOENIX: Aggregate both revenue and quantity
        product_stats = {}
        for inv in period_invoices:
            for item in inv.items:
                desc = item.description or "Unknown"
                if desc not in product_stats:
                    product_stats[desc] = {"revenue": 0.0, "quantity": 0.0}
                product_stats[desc]["revenue"] += item.total
                product_stats[desc]["quantity"] += item.quantity

        top_products = sorted(
            [
                {
                    "product_name": k,
                    "total_revenue": v["revenue"],
                    "total_quantity": v["quantity"]   # Now provided
                }
                for k, v in product_stats.items()
            ],
            key=lambda x: x["total_revenue"],
            reverse=True
        )[:10]

        total_cogs = 0  # Placeholder

        return {
            "total_revenue_period": total_revenue,
            "total_transactions_period": len(period_invoices),
            "total_cogs_period": total_cogs,
            "sales_trend": trend_data,
            "top_products": top_products,
            "total_profit_period": total_profit,
        }