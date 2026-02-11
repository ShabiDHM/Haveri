# FILE: backend/app/models/analytics.py
# PHOENIX PROTOCOL - ANALYTICS MODELS V1.1 (COGS SYNC)
# 1. FIXED: Added 'total_cogs_period' to AnalyticsDashboardData to resolve Pylance 'reportCallIssue'.
# 2. STATUS: 100% Synchronized with Analytics Service V2.3.

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
    total_cogs_period: float = 0.0 # PHOENIX: Added to support real COGS calculation