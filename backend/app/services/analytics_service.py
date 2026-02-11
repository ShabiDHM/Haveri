# FILE: backend/app/services/analytics_service.py
# PHOENIX PROTOCOL - ANALYTICS SERVICE V3.6 (INTELLIGENT COGS MATCHING)
# 1. FIXED: Enhanced _normalize function for cross-system name alignment (e.g., Caffe Latte -> caffelatte).
# 2. FIXED: Replaced simple 'in' check with a token-based algorithm for robust fuzzy matching.
# 3. STATUS: COGS Mapping Fragility Resolved.

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
        self._fuzzy_match_cache: Dict[str, str] = {}

    def _get_resilient_filter(self, user_id: str, org_id: Optional[Any] = None) -> Dict:
        u_oid: Optional[ObjectId] = None
        try: u_oid = ObjectId(user_id)
        except: pass
        o_oid: Optional[ObjectId] = None
        if org_id:
            try: o_oid = ObjectId(str(org_id))
            except: pass
        clauses: List[Dict[str, Any]] = [{"user_id": str(user_id)}]
        if u_oid: clauses.append({"user_id": u_oid})
        if org_id:
            clauses.append({"organization_id": str(org_id)})
            if o_oid: clauses.append({"organization_id": o_oid})
        return {"$or": clauses}

    def _normalize(self, text: str) -> str:
        """PHOENIX: Enhanced normalization to remove all spaces for better key matching."""
        if not text: return ""
        # Lowercase, remove special characters, then remove all whitespace.
        # "Caffe Latte" -> "caffelatte"
        # "caffe_latte" -> "caffelatte"
        normalized = re.sub(r'[^\w\s]', '', str(text).lower()).strip()
        return re.sub(r'\s+', '', normalized)

    async def _build_unified_cost_map(self, context_filter: dict) -> Dict[str, float]:
        inventory_items = await self.inventory.find(context_filter).to_list(length=None)
        inventory_cost_map = {
            str(item["_id"]): float(item.get("cost_per_unit", 0))
            for item in inventory_items
        }
        unified_cost_map: Dict[str, float] = {}

        # 1. Recipe costs
        recipes = await self.recipes.find(context_filter).to_list(length=None)
        for recipe in recipes:
            recipe_name = recipe.get("product_name")
            if not recipe_name: continue
            total_cost = 0.0
            for ingredient in recipe.get("ingredients", []):
                item_id = ingredient.get("inventory_item_id")
                required_qty = float(ingredient.get("quantity_required", 0))
                item_cost = inventory_cost_map.get(str(item_id), 0.0)
                total_cost += (required_qty * item_cost)
            normalized_name = self._normalize(recipe_name)
            if normalized_name: unified_cost_map[normalized_name] = total_cost

        # 2. Raw inventory costs fallback
        for item in inventory_items:
            item_name = item.get("name")
            if not item_name: continue
            normalized_name = self._normalize(item_name)
            if normalized_name and normalized_name not in unified_cost_map:
                unified_cost_map[normalized_name] = float(item.get("cost_per_unit", 0))
        
        return unified_cost_map

    def _find_cost_with_fallback(self, item_name: str, cost_map: Dict[str, float]) -> float:
        """PHOENIX: Intelligent token-based matching for robust COGS calculation."""
        normalized_name = self._normalize(item_name)
        if not normalized_name: return 0.0
        
        # 1. Exact Match (Fastest path)
        if normalized_name in cost_map:
            return cost_map[normalized_name]

        # 2. Check Cache
        if normalized_name in self._fuzzy_match_cache:
            return cost_map.get(self._fuzzy_match_cache[normalized_name], 0.0)

        # 3. Token-based Matching (More robust than simple 'in')
        # This handles cases like "Macchiato e Madhe" vs "Macchiato"
        item_tokens = set(re.findall(r'\b\w+\b', normalized_name))
        if not item_tokens: return 0.0

        best_match = None
        highest_score = 0.0

        for map_key in cost_map.keys():
            map_tokens = set(re.findall(r'\b\w+\b', map_key))
            if not map_tokens: continue
            
            intersection = item_tokens.intersection(map_tokens)
            union = item_tokens.union(map_tokens)
            
            # Jaccard similarity
            score = len(intersection) / len(union) if union else 0

            if score > highest_score:
                highest_score = score
                best_match = map_key
        
        # Require a reasonably high confidence match (e.g., > 60%)
        if highest_score > 0.6 and best_match:
            self._fuzzy_match_cache[normalized_name] = best_match
            return cost_map[best_match]

        return 0.0

    async def get_dashboard_data(self, user_id: str, days: int = 30, year: Optional[int] = None) -> AnalyticsDashboardData:
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        org_id = user.get("organization_id") if user else None
        context_filter = self._get_resilient_filter(user_id, org_id)
        
        if year:
            start_date = datetime(year, 1, 1)
            end_date = datetime(year, 12, 31, 23, 59, 59)
        else:
            start_date = datetime.utcnow() - timedelta(days=days)
            end_date = datetime.utcnow() + timedelta(days=1)

        date_query = {"$gte": start_date, "$lte": end_date}
        unified_cost_map = await self._build_unified_cost_map(context_filter)

        pos_pipeline = [
            {"$match": {**context_filter, "date_time": date_query}},
            {"$project": {
                "date": "$date_time",
                "total_amount": {"$ifNull": ["$total_amount", "$amount"]},
                "items": [{"description": {"$ifNull": ["$product_name", "$description", "Produkt"]},"quantity": {"$ifNull": ["$quantity", 1.0]}}]
            }}
        ]
        pos_sales = await self.transactions.aggregate(pos_pipeline).to_list(length=None)
        invoice_pipeline = [
            {"$match": {**context_filter, "issue_date": date_query, "status": {"$ne": "DRAFT"}}},
            {"$project": { "date": "$issue_date", "total_amount": "$total_amount", "items": "$items" }}
        ]
        invoice_sales = await self.invoices.aggregate(invoice_pipeline).to_list(length=None)

        all_sales = pos_sales + invoice_sales
        total_revenue, total_cogs = 0.0, 0.0
        sales_by_date: Dict[str, Dict[str, Any]] = {}
        top_products_agg: Dict[str, Dict[str, float]] = {}

        for sale in all_sales:
            sale_date = sale.get('date')
            if isinstance(sale_date, str):
                try: sale_date = datetime.fromisoformat(sale_date.replace('Z', '+00:00'))
                except: continue
            if not isinstance(sale_date, datetime): continue
            
            sale_date_str = sale_date.strftime("%Y-%m-%d")
            sale_amount = float(sale.get('total_amount') or 0.0)
            total_revenue += sale_amount

            if sale_date_str not in sales_by_date:
                sales_by_date[sale_date_str] = {"amount": 0.0, "count": 0}
            sales_by_date[sale_date_str]["amount"] += sale_amount
            sales_by_date[sale_date_str]["count"] += 1

            items_list = sale.get('items', [])
            if not items_list: continue

            item_count = len(items_list)
            for item in items_list:
                item_name = item.get('description') or item.get('product_name') or 'Unknown'
                item_qty = float(item.get('quantity', 1.0))
                total_cogs += (self._find_cost_with_fallback(item_name, unified_cost_map) * item_qty)

                if item_name not in top_products_agg:
                    top_products_agg[item_name] = {"revenue": 0.0, "quantity": 0.0}
                
                item_revenue = sale_amount / item_count if item_count > 0 else 0.0
                top_products_agg[item_name]["revenue"] += item_revenue
                top_products_agg[item_name]["quantity"] += item_qty

        sales_trend = [SalesTrendPoint(date=d, amount=v['amount'], count=v['count']) for d, v in sorted(sales_by_date.items())]
        sorted_products = sorted(top_products_agg.items(), key=lambda x: x[1]['revenue'], reverse=True)[:5]
        top_products = [TopProductItem(product_name=name, total_revenue=data['revenue'], total_quantity=data['quantity']) for name, data in sorted_products]

        return AnalyticsDashboardData(
            total_revenue_period=round(total_revenue, 2),
            total_transactions_period=len(all_sales),
            total_cogs_period=round(total_cogs, 2),
            sales_trend=sales_trend,
            top_products=top_products
        )