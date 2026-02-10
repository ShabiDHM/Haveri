# FILE: backend/app/services/inventory_service.py
# PHOENIX PROTOCOL - INVENTORY SERVICE V5.9 (PERMISSIVE HEADER MATCHING)
# 1. FIX: Optimized header mapping to strictly align with UI instructions ("Product Name", "Ingredient").
# 2. LOGIC: Added fallback for "Ingredient" without the "Name" suffix.

from typing import List, Optional, Dict, Any
from bson import ObjectId
from pymongo.database import Database
from app.models.inventory import InventoryItem, Recipe, Ingredient
import datetime
import re
import logging

logger = logging.getLogger(__name__)

class InventoryService:
    def __init__(self, db: Database):
        self.db = db

    def create_item(self, user_id: str, item_in: dict) -> InventoryItem:
        if "source" not in item_in: item_in["source"] = "MANUAL"
        item = InventoryItem(user_id=user_id, **item_in)
        item_dict = item.model_dump(by_alias=True)
        if "_id" in item_dict and item_dict["_id"] is None: del item_dict["_id"]
        res = self.db["inventory"].insert_one(item_dict)
        return self.get_item(str(res.inserted_id)) # type: ignore

    def get_item(self, item_id: str) -> Optional[InventoryItem]:
        doc = self.db["inventory"].find_one({"_id": ObjectId(item_id)})
        return InventoryItem(**doc) if doc else None

    def get_items(self, user_id: str) -> List[InventoryItem]:
        cursor = self.db["inventory"].find({"user_id": user_id})
        return [InventoryItem(**item) for item in list(cursor)]

    def update_item(self, user_id: str, item_id: str, data: dict) -> Optional[InventoryItem]:
        oid = ObjectId(item_id)
        data["updated_at"] = datetime.datetime.utcnow()
        self.db["inventory"].update_one({"_id": oid, "user_id": user_id}, {"$set": data})
        return self.get_item(item_id)

    def delete_item(self, user_id: str, item_id: str):
        self.db["inventory"].delete_one({"_id": ObjectId(item_id), "user_id": user_id})

    def import_items_bulk(self, user_id: str, items_data: List[Dict[str, Any]]) -> int:
        clean_items = []
        for row in items_data:
            try:
                stock_val = row.get("current_stock", row.get("Stoku", row.get("Stock", 0.0)))
                cost_val = row.get("cost_per_unit", row.get("Kosto", row.get("Cost", 0.0)))
                try: stock = float(stock_val)
                except: stock = 0.0
                try: cost = float(cost_val)
                except: cost = 0.0
                item_obj = InventoryItem(
                    user_id=user_id,
                    name=str(row.get("name", row.get("Emri", row.get("Product", "Unknown")))),
                    unit=str(row.get("unit", row.get("Njesia", row.get("Unit", "kg")))).lower(),
                    current_stock=stock,
                    cost_per_unit=cost,
                    source="POS"
                )
                item_dict = item_obj.model_dump(by_alias=True)
                if "_id" in item_dict: del item_dict["_id"]
                clean_items.append(item_dict)
            except: continue
        if clean_items:
            res = self.db["inventory"].insert_many(clean_items)
            return len(res.inserted_ids)
        return 0

    def import_recipes_bulk(self, user_id: str, recipes_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        inventory_items = list(self.db["inventory"].find({"user_id": user_id}))
        inv_map = {item["name"].strip().lower(): str(item["_id"]) for item in inventory_items}
        
        recipes_map: Dict[str, List[Ingredient]] = {}
        missing_ingredients = set()
        
        for row in recipes_data:
            # PHOENIX: Aggressive header normalization for Recipe Import
            # Matches: "Product Name", "ProductName", "product_name", "Product"
            p_name = next((v for k, v in row.items() if k.lower().replace(" ", "").replace("_", "") in ["productname", "product"]), None)
            # Matches: "Ingredient Name", "IngredientName", "ingredient_name", "Ingredient"
            i_name = next((v for k, v in row.items() if k.lower().replace(" ", "").replace("_", "") in ["ingredientname", "ingredient"]), None)
            # Matches: "Quantity", "quantity_required", "Qty"
            qty_raw = next((v for k, v in row.items() if k.lower().replace(" ", "").replace("_", "") in ["quantity", "quantityrequired", "qty"]), 0.0)

            if not p_name or not i_name:
                continue

            product_name = str(p_name).strip()
            ingredient_name = str(i_name).strip().lower()
            
            try: quantity = float(qty_raw)
            except: continue
                
            ing_id = inv_map.get(ingredient_name)
            
            # Fallback fuzzy match for ingredients
            if not ing_id:
                for inv_name, real_id in inv_map.items():
                    if ingredient_name in inv_name or inv_name in ingredient_name:
                        ing_id = real_id
                        break
            
            if ing_id:
                ing_obj = Ingredient(inventory_item_id=ing_id, quantity_required=quantity)
                if product_name not in recipes_map: recipes_map[product_name] = []
                recipes_map[product_name].append(ing_obj)
            else:
                missing_ingredients.add(ingredient_name)

        created_count = 0
        for p_name, ingredients in recipes_map.items():
            recipe_data = {
                "user_id": user_id,
                "product_name": p_name,
                "ingredients": [i.model_dump() for i in ingredients],
                "instructions": "Imported from CSV"
            }
            self.db["recipes"].update_one(
                {"user_id": user_id, "product_name": {"$regex": f"^{re.escape(p_name)}$", "$options": "i"}},
                {"$set": recipe_data},
                upsert=True
            )
            created_count += 1
            
        return {"recipes_created": created_count, "missing_ingredients": list(missing_ingredients)}

    def get_recipes(self, user_id: str) -> List[Recipe]:
        cursor = self.db["recipes"].find({"user_id": user_id})
        recipes = []
        for item in list(cursor):
            try: recipes.append(Recipe(**item))
            except: continue
        return recipes

    def delete_recipe(self, user_id: str, recipe_id: str):
        self.db["recipes"].delete_one({"_id": ObjectId(recipe_id), "user_id": user_id})

    def create_recipe(self, user_id: str, recipe_in: dict) -> Recipe:
        recipe = Recipe(user_id=user_id, **recipe_in)
        recipe_dict = recipe.model_dump(by_alias=True, exclude_none=True)
        if "id" in recipe_dict: del recipe_dict["id"]
        result = self.db["recipes"].insert_one(recipe_dict)
        return Recipe(**self.db["recipes"].find_one({"_id": result.inserted_id})) # type: ignore