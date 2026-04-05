# FILE: backend/app/services/analytics_service.py
# PHOENIX PROTOCOL - ANALYTICS SERVICE V2.5 (FIXED COGS AND EXPENSE CALCULATION)

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

        invoices = await asyncio.to_thread(finance_service.get_invoices, user_id, case_id, year)
        expenses = await asyncio.to_thread(finance_service.get_expenses, user_id, case_id, year)
        pos_transactions = await asyncio.to_thread(finance_service.get_pos_transactions, user_id, case_id, year)

        if year:
            start_date = datetime(year, 1, 1)
            end_date = datetime(year, 12, 31, 23, 59, 59)
        else:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)

        # Filter by date
        period_invoices = [i for i in invoices if start_date <= i.issue_date <= end_date]
        period_expenses = [e for e in expenses if start_date <= e.date <= end_date]
        period_pos = [p for p in pos_transactions if start_date <= p.get("date_time", datetime.min) <= end_date]

        # Calculate revenue from invoices only (POS transactions already have invoices)
        total_revenue = sum(i.total_amount for i in period_invoices)
        
        # Calculate expenses
        total_expenses = sum(e.amount for e in period_expenses)

        # PHOENIX: Calculate COGS from invoices and POS transactions
        total_cogs = 0
        
        # COGS from invoices (items with inventory_item_id or derived from margin)
        for inv in period_invoices:
            for item in inv.items:
                if item.inventory_item_id:
                    # Try to get cost from inventory
                    try:
                        inv_item = self.sync_db.inventory.find_one({"_id": ObjectId(item.inventory_item_id)})
                        if inv_item:
                            cost = inv_item.get("cost_per_unit", 0)
                            total_cogs += cost * item.quantity
                    except:
                        pass
        
        # COGS from POS transactions
        for pos in period_pos:
            inv_id = pos.get("inventory_item_id")
            if inv_id:
                try:
                    inv_item = self.sync_db.inventory.find_one({"_id": ObjectId(inv_id)})
                    if inv_item:
                        cost = inv_item.get("cost_per_unit", 0)
                        quantity = pos.get("quantity", 1)
                        total_cogs += cost * quantity
                except:
                    pass

        # Also check expenses with COGS categories
        cogs_categories = ['cogs_inventory', 'cogs_raw_material', 'furnizim', 'inventory', 'mall', 'stock', 'blerje']
        for exp in period_expenses:
            category = (exp.category or '').lower()
            if any(cat in category for cat in cogs_categories):
                total_cogs += exp.amount
                total_expenses -= exp.amount  # Remove from expenses if moved to COGS

        total_profit = total_revenue - total_cogs - total_expenses

        # Sales trend
        sales_trend = {}
        for inv in period_invoices:
            date_str = inv.issue_date.strftime('%Y-%m-%d')
            sales_trend[date_str] = sales_trend.get(date_str, 0) + inv.total_amount

        sorted_dates = sorted(sales_trend.keys())
        trend_data = [{"date": d, "amount": sales_trend[d]} for d in sorted_dates]

        # Product stats
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
                    "total_quantity": v["quantity"]
                }
                for k, v in product_stats.items()
            ],
            key=lambda x: x["total_revenue"],
            reverse=True
        )[:10]

        return {
            "total_revenue_period": total_revenue,
            "total_transactions_period": len(period_invoices),
            "total_cogs_period": total_cogs,
            "sales_trend": trend_data,
            "top_products": top_products,
            "total_profit_period": total_profit,
        }