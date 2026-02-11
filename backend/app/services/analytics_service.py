# FILE: backend/app/services/analytics_service.py
# PHOENIX PROTOCOL - ANALYTICS SERVICE V3.2 (SYNTAX STABILIZATION)
# 1. FIXED: Indentation structure to resolve Pylance import error.
# 2. FEATURE: Smart Fuzzy Matching (Containment) for COGS calculation.
# 3. STATUS: Validated Class Structure.

from datetime import datetime, timedelta
import re
from typing import List, Dict, Any, Optional
from bson import ObjectId
from app.models.analytics import AnalyticsDashboardData, SalesTrendPoint, TopProductItem

class AnalyticsService:
    def __init__(self, db: Any):
        self.db = db
        self.transactions = db["transactions"]
        self.inventory = db["inventory"]
        self.recipes = db["recipes"]
        self.invoices = db["invoices"]
        # Cache for fuzzy matches to speed up loop execution
        self._fuzzy_match_cache: Dict[str, str] = {}

    def _normalize(self, text: str) -> str:
        if not text: 
            return ""
        return re.sub(r'[^\w\s]', '', str(text).lower()).strip().replace(" ", "")

    async def _build_unified_cost_map(self, context_filter: dict) -> Dict[str, float]:
        """
        Creates a single source of truth for product costs, handling both
        recipes and direct inventory items. Recipes take precedence.
        """
        # 1. Get raw material costs from inventory
        inventory_items = await self.inventory.find(context_filter).to_list(length=None)
        inventory_cost_map = {
            str(item["_id"]): float(item.get("cost_per_unit", 0))
            for item in inventory_items
        }

        unified_cost_map: Dict[str, float] = {}

        # 2. Calculate costs for items built from recipes
        recipes = await self.recipes.find(context_filter).to_list(length=None)
        for recipe in recipes:
            recipe_name = recipe.get("product_name")
            if not recipe_name:
                continue
            
            total_cost = 0.0
            for ingredient in recipe.get("ingredients", []):
                item_id = ingredient.get("inventory_item_id")
                required_qty = float(ingredient.get("quantity_required", 0))
                item_cost = inventory_cost_map.get(str(item_id), 0.0)
                total_cost += (required_qty * item_cost)
            
            normalized_name = self._normalize(recipe_name)
            if normalized_name:
                unified_cost_map[normalized_name] = total_cost

        # 3. Add direct-sale inventory items if they aren't already defined by a recipe
        for item in inventory_items:
            item_name = item.get("name")
            if not item_name:
                continue

            normalized_name = self._normalize(item_name)
            if normalized_name and normalized_name not in unified_cost_map:
                unified_cost_map[normalized_name] = float(item.get("cost_per_unit", 0))
        
        return unified_cost_map

    def _find_cost_with_fallback(self, item_name: str, cost_map: Dict[str, float]) -> float:
        """
        Attempts to find cost using:
        1. Exact Match
        2. Cached Fuzzy Match
        3. Containment Match (e.g. 'Macchiato' matches 'Macchiato e Madhe')
        """
        normalized_name = self._normalize(item_name)
        
        # 1. Exact Match
        if normalized_name in cost_map:
            return cost_map[normalized_name]

        # 2. Check Cache
        if normalized_name in self._fuzzy_match_cache:
            matched_key = self._fuzzy_match_cache[normalized_name]
            return cost_map.get(matched_key, 0.0)

        # 3. Fuzzy / Containment Match
        for map_key in cost_map.keys():
            if normalized_name in map_key or map_key in normalized_name:
                self._fuzzy_match_cache[normalized_name] = map_key
                return cost_map[map_key]
        
        # No match found
        return 0.0

    async def get_dashboard_data(self, user_id: str, days: int = 30) -> AnalyticsDashboardData:
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        org_id = user.get("organization_id") if user else None
        context_filter = {"user_id": str(user_id)}
        if org_id:
            context_filter = {"$or": [{"user_id": str(user_id)}, {"organization_id": org_id}]}
        
        start_date = datetime.utcnow() - timedelta(days=days)

        # Build the unified cost map ONCE.
        unified_cost_map = await self._build_unified_cost_map(context_filter)

        # --- AGGREGATE SALES DATA ---
        
        # 1. From POS Transactions
        pos_pipeline = [
            {"$match": {**context_filter, "date": {"$gte": start_date}}},
            {"$project": {
                "date": "$date",
                "total_amount": "$total_amount",
                "items": [{
                    "description": {"$ifNull": ["$product_name", "$description"]},
                    "quantity": {"$ifNull": ["$quantity", 1.0]}
                }]
            }}
        ]
        pos_sales = await self.transactions.aggregate(pos_pipeline).to_list(length=None)

        # 2. From Invoices
        invoice_pipeline = [
            {"$match": {**context_filter, "issue_date": {"$gte": start_date}, "status": {"$ne": "DRAFT"}}},
             {"$project": {
                "date": "$issue_date",
                "total_amount": "$total_amount",
                "items": "$items"
            }}
        ]
        invoice_sales = await self.invoices.aggregate(invoice_pipeline).to_list(length=None)

        all_sales = pos_sales + invoice_sales
        
        # --- PROCESS AGGREGATED DATA ---
        total_revenue = 0.0
        total_transactions = len(all_sales)
        total_cogs = 0.0
        sales_by_date: Dict[str, Dict[str, Any]] = {}
        top_products_agg: Dict[str, Dict[str, float]] = {}

        for sale in all_sales:
            sale_date = sale.get('date')
            # Handle date parsing safely
            if isinstance(sale_date, str):
                try:
                    sale_date = datetime.strptime(sale_date, "%Y-%m-%d")
                except ValueError:
                    sale_date = datetime.now()
            elif not isinstance(sale_date, datetime):
                sale_date = datetime.now()
            
            sale_date_str = sale_date.strftime("%Y-%m-%d")
            
            # Ensure revenue is a float
            sale_amount = float(sale.get('total_amount') or 0.0)
            total_revenue += sale_amount

            if sale_date_str not in sales_by_date:
                sales_by_date[sale_date_str] = {"amount": 0.0, "count": 0}
            
            sales_by_date[sale_date_str]["amount"] += sale_amount
            sales_by_date[sale_date_str]["count"] += 1

            items_list = sale.get('items', [])
            item_count = len(items_list)

            for item in items_list:
                item_name = item.get('description', 'Unknown Product')
                item_qty = float(item.get('quantity', 1.0))
                
                # Calculate COGS using the unified map with Fuzzy Fallback
                cost = self._find_cost_with_fallback(item_name, unified_cost_map)
                total_cogs += (cost * item_qty)

                # Aggregate for top products report
                if item_name not in top_products_agg:
                    top_products_agg[item_name] = {"revenue": 0.0, "quantity": 0.0}
                
                # Distribute revenue among items (simple approximation)
                item_revenue = sale_amount / item_count if item_count > 0 else 0.0

                top_products_agg[item_name]["revenue"] += item_revenue
                top_products_agg[item_name]["quantity"] += item_qty

        # Format final outputs
        sales_trend = [SalesTrendPoint(date=d, amount=v['amount'], count=v['count']) for d, v in sorted(sales_by_date.items())]
        
        sorted_products = sorted(top_products_agg.items(), key=lambda x: x[1]['revenue'], reverse=True)[:5]
        top_products = [TopProductItem(product_name=name, total_revenue=data['revenue'], total_quantity=data['quantity']) for name, data in sorted_products]

        return AnalyticsDashboardData(
            total_revenue_period=total_revenue,
            total_transactions_period=total_transactions,
            total_cogs_period=total_cogs,
            sales_trend=sales_trend,
            top_products=top_products
        )