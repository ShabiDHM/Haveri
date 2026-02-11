# FILE: backend/app/models/analytics.py
# PHOENIX PROTOCOL - ANALYTICS MODELS V1.2 (FINAL COGS SYNC)
# 1. FIXED: Added 'total_cogs_period' to AnalyticsDashboardData.
# 2. STATUS: 100% Synchronized. Resolves Pylance errors and ensures data integrity.

from pydantic import BaseModel
from typing import List, Optional

class SalesTrendPoint(BaseModel):
    date: str
    amount: float
    count: int

class TopProductItem(BaseModel):
    product_name: str
    total_revenue: float
    total_quantity: float

class AnalyticsDashboardData(BaseModel):
    sales_trend: List[SalesTrendPoint]
    top_products: List[TopProductItem]
    total_revenue_period: float
    total_transactions_period: int
    total_cogs_period: float = 0.0 # PHOENIX: Added for real calculation