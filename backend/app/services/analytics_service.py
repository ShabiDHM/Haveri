# FILE: backend/app/services/analytics_service.py
# PHOENIX PROTOCOL - ANALYTICS SERVICE V2.1 (ARGUMENT FIX)
# 1. FIX: Added 'count' parameter to SalesTrendPoint instantiation to satisfy Pydantic model.
# 2. LOGIC: Maintained the robust 'product_name' fallback logic.

from datetime import datetime, timedelta
from typing import List, Dict, Any
from bson import ObjectId
from app.models.analytics import AnalyticsDashboardData, SalesTrendPoint, TopProductItem

class AnalyticsService:
    def __init__(self, db: Any):
        self.db = db
        self.transactions = db["transactions"]

    async def get_dashboard_data(self, user_id: str, days: int = 30) -> AnalyticsDashboardData:
        user_oid = ObjectId(user_id)
        start_date = datetime.utcnow() - timedelta(days=days)

        # 1. SALES TREND (Group by Date)
        trend_pipeline = [
            {
                "$match": {
                    "user_id": str(user_oid),
                    "date": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$date"}
                    },
                    "daily_total": {"$sum": "$amount"},
                    "transaction_count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]

        # Use async to_list provided by Motor
        trend_results = await self.transactions.aggregate(trend_pipeline).to_list(length=None)
        
        sales_trend = [
            SalesTrendPoint(
                date=r["_id"], 
                amount=r["daily_total"],
                count=r["transaction_count"] # PHOENIX: Added missing argument
            ) 
            for r in trend_results
        ]

        # 2. TOP PRODUCTS (Group by Product Name with Fallback)
        products_pipeline = [
            {
                "$match": {
                    "user_id": str(user_oid),
                    "date": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    # Fallback to description if product_name is missing
                    "_id": { "$ifNull": ["$product_name", "$description"] },
                    "revenue": {"$sum": "$amount"},
                    "quantity": {"$sum": "$quantity"}
                }
            },
            {"$sort": {"revenue": -1}},
            {"$limit": 5}
        ]

        product_results = await self.transactions.aggregate(products_pipeline).to_list(length=None)
        
        top_products = [
            TopProductItem(
                product_name=r["_id"] or "Unknown Product", 
                total_revenue=r["revenue"], 
                total_quantity=r["quantity"]
            )
            for r in product_results
        ]

        # 3. TOTALS
        total_revenue = sum(p.amount for p in sales_trend)
        # Handle count attribute safely in case SalesTrendPoint definition varies elsewhere
        total_count = sum(getattr(p, 'count', 0) for p in sales_trend)

        return AnalyticsDashboardData(
            sales_trend=sales_trend,
            top_products=top_products,
            total_revenue_period=total_revenue,
            total_transactions_period=total_count
        )