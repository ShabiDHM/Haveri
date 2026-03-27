# FILE: backend/app/services/analytics_service.py
# PHOENIX PROTOCOL - ANALYTICS SERVICE V2.2 (WORKSPACE FILTER)

from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from app.services.finance_service import FinanceService

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, db: Any):
        self.db = db

    async def get_dashboard_data(self, user_id: str, days: int = 365, year: Optional[int] = None, case_id: Optional[str] = None) -> Dict[str, Any]:
        finance_service = FinanceService(self.db)

        invoices = finance_service.get_invoices(user_id, case_id)
        expenses = finance_service.get_expenses(user_id, case_id)

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

        product_revenue = {}
        for inv in period_invoices:
            for item in inv.items:
                desc = item.description or "Unknown"
                product_revenue[desc] = product_revenue.get(desc, 0) + item.total

        top_products = sorted(
            [{"product_name": k, "total_revenue": v} for k, v in product_revenue.items()],
            key=lambda x: x["total_revenue"],
            reverse=True
        )[:10]

        total_cogs = 0  # Placeholder, implement if needed

        return {
            "total_revenue_period": total_revenue,
            "total_transactions_period": len(period_invoices),
            "total_cogs_period": total_cogs,
            "sales_trend": trend_data,
            "top_products": top_products,
            "total_profit_period": total_profit,
        }