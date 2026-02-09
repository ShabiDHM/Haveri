# FILE: backend/app/services/inventory_service.py
# PHOENIX PROTOCOL - INVENTORY SERVICE V5.8 (SMART HEADER MATCHING)
# 1. FIX: Updated header matching to handle spaces (e.g., "Product Name") and case-insensitivity.
# 2. LOGIC: Re-mapped common CSV variations for Ingredient and Quantity.

from typing import List, Optional, Dict, Any
from bson import ObjectId
from pymongo.database import Database
from app.models.inventory import InventoryItem, Recipe, Ingredient
import datetime
import re

class InventoryService:
    def __init__(self, db: Database):
        self.db = db

    def create_item(self, user_id: str, item_in: dict) -> InventoryItem:
        if "source" not in item_in:
            item_in["source"] = "MANUAL"
            
        item = InventoryItem(user_id=user_id, **item_in)
        item_dict = item.model_dump(by_alias=True)
        if "_id" in item_dict and item_dict["_id"] is None:
            del item_dict["_id"]
        res = self.db["inventory"].insert_one(item_dict)
        return self.get_item(str(res.inserted_id)) # type: ignore

    def get_item(self, item_id: str) -> Optional[InventoryItem]:
        doc = self.db["inventory"].find_one({"_id": ObjectId(item_id)})
        if doc:
            return InventoryItem(**doc)
        return None

    def get_items(self, user_id: str) -> List[InventoryItem]:
        cursor = self.db["inventory"].find({"user_id": user_id})
        return [InventoryItem(**item) for item in list(cursor)]

    def update_item(self, user_id: str, item_id: str, data: dict) -> Optional[InventoryItem]:
        oid = ObjectId(item_id)
        data["updated_at"] = datetime.datetime.utcnow()
        self.db["inventory"].update_one(
            {"_id": oid, "user_id": user_id},
            {"$set": data}
        )
        return self.get_item(item_id)

    def delete_item(self, user_id: str, item_id: str):
        self.db["inventory"].delete_one({"_id": ObjectId(item_id), "user_id": user_id})

    def import_items_bulk(self, user_id: str, items_data: List[Dict[str, Any]]) -> int:
        clean_items = []
        for row in items_data:
            try:
                stock_val = row.get("current_stock", row.get("Stock", 0.0))
                cost_val = row.get("cost_per_unit", row.get("Cost", 0.0))
                
                try: stock = float(stock_val)
                except: stock = 0.0
                
                try: cost = float(cost_val)
                except: cost = 0.0

                item_obj = InventoryItem(
                    user_id=user_id,
                    name=str(row.get("name", row.get("Product", "Unknown"))),
                    unit=str(row.get("unit", row.get("Unit", "kg"))).lower(),
                    current_stock=stock,
                    cost_per_unit=cost,
                    source="POS"
                )
                item_dict = item_obj.model_dump(by_alias=True)
                if "_id" in item_dict: del item_dict["_id"]
                clean_items.append(item_dict)
            except Exception:
                continue
        
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
            # PHOENIX FIX: Robust Header Normalization
            # Check for keys regardless of spaces or casing
            p_name = next((v for k, v in row.items() if k.lower().replace(" ", "") == "productname"), None)
            if not p_name:
                p_name = row.get("Product", row.get("product_name", ""))
            
            i_name = next((v for k, v in row.items() if k.lower().replace(" ", "") == "ingredientname"), None)
            if not i_name:
                i_name = row.get("Ingredient", row.get("ingredient_name", ""))
            
            qty_raw = next((v for k, v in row.items() if k.lower().replace(" ", "") == "quantity"), row.get("quantity_required", 0.0))

            product_name = str(p_name).strip()
            ingredient_name = str(i_name).strip()
            
            try:
                quantity = float(qty_raw)
            except (ValueError, TypeError):
                continue
            
            if not product_name or not ingredient_name:
                continue
                
            ing_id = inv_map.get(ingredient_name.lower())
            
            if not ing_id:
                for inv_name, real_id in inv_map.items():
                    if ingredient_name.lower() in inv_name or inv_name in ingredient_name.lower():
                        ing_id = real_id
                        break
            
            if ing_id:
                ing_obj = Ingredient(inventory_item_id=ing_id, quantity_required=quantity)
                if product_name not in recipes_map:
                    recipes_map[product_name] = []
                recipes_map[product_name].append(ing_obj)
            else:
                missing_ingredients.add(ingredient_name)

        created_count = 0
        for p_name, ingredients in recipes_map.items():
            existing = self.db["recipes"].find_one({
                "user_id": user_id, 
                "product_name": {"$regex": f"^{re.escape(p_name)}$", "$options": "i"}
            })
            
            recipe_data = {
                "user_id": user_id,
                "product_name": p_name,
                "ingredients": [i.model_dump() for i in ingredients],
                "instructions": "Imported from CSV"
            }
            
            if existing:
                self.db["recipes"].update_one({"_id": existing["_id"]}, {"$set": recipe_data})
            else:
                self.db["recipes"].insert_one(recipe_data)
            created_count += 1
            
        return {
            "recipes_created": created_count,
            "missing_ingredients": list(missing_ingredients)
        }

    def create_recipe(self, user_id: str, recipe_in: dict) -> Recipe:
        recipe = Recipe(user_id=user_id, **recipe_in)
        recipe_dict = recipe.model_dump(by_alias=True, exclude_none=True)
        if "id" in recipe_dict: del recipe_dict["id"]
        result = self.db["recipes"].insert_one(recipe_dict)
        created_doc = self.db["recipes"].find_one({"_id": result.inserted_id})
        if not created_doc:
            raise Exception("Failed to retrieve created recipe from database.")
        return Recipe(**created_doc)
        
    def update_recipe(self, user_id: str, recipe_id: str, data: dict) -> Recipe:
        oid = ObjectId(recipe_id)
        self.db["recipes"].update_one({"_id": oid, "user_id": user_id}, {"$set": data})
        return self.get_recipe(recipe_id) # type: ignore

    def get_recipe(self, recipe_id: str) -> Optional[Recipe]:
        doc = self.db["recipes"].find_one({"_id": ObjectId(recipe_id)})
        return Recipe(**doc) if doc else None

    def get_recipes(self, user_id: str) -> List[Recipe]:
        cursor = self.db["recipes"].find({"user_id": user_id})
        recipes = []
        for item in list(cursor):
            try: recipes.append(Recipe(**item))
            except: continue
        return recipes
        
    def delete_recipe(self, user_id: str, recipe_id: str):
        self.db["recipes"].delete_one({"_id": ObjectId(recipe_id), "user_id": user_id})

    def get_cost_for_product(self, user_id: str, product_name: str) -> float:
        recipe_doc = self.db["recipes"].find_one({
            "user_id": user_id, 
            "product_name": {"$regex": f"^{product_name}$", "$options": "i"}
        })
        if not recipe_doc: return 0.0
        recipe = Recipe(**recipe_doc)
        total_cost = 0.0
        for ingredient in recipe.ingredients:
            item_doc = self.db["inventory"].find_one({"_id": ObjectId(ingredient.inventory_item_id)})
            if item_doc:
                item = InventoryItem(**item_doc)
                total_cost += item.cost_per_unit * ingredient.quantity_required
        return total_cost

    def process_transaction_batch(self, batch_id: str, user_id: str):
        transactions = list(self.db["transactions"].find({"batch_id": batch_id, "user_id": user_id}))
        updated_count = 0
        for tx in transactions:
            product_name = tx.get("description", "")
            qty_sold = float(tx.get("quantity", 1.0))
            recipe_doc = self.db["recipes"].find_one({
                "user_id": user_id, 
                "product_name": {"$regex": f"^{product_name}$", "$options": "i"}
            })
            total_cost, stock_deducted = 0.0, False
            if recipe_doc:
                recipe = Recipe(**recipe_doc)
                for ingredient in recipe.ingredients:
                    amount_to_deduct = ingredient.quantity_required * qty_sold
                    self.db["inventory"].update_one(
                        {"_id": ObjectId(ingredient.inventory_item_id)},
                        {"$inc": {"current_stock": -amount_to_deduct}}
                    )
                    item_doc = self.db["inventory"].find_one({"_id": ObjectId(ingredient.inventory_item_id)})
                    if item_doc:
                        total_cost += (item_doc.get("cost_per_unit", 0.0) * amount_to_deduct)
                stock_deducted = True
            self.db["transactions"].update_one(
                {"_id": tx["_id"]},
                {"$set": {"cost": total_cost, "net_profit": tx.get("amount", 0.0) - total_cost, "is_inventory_processed": True, "has_recipe_match": stock_deducted}}
            )
            updated_count += 1
        return updated_count