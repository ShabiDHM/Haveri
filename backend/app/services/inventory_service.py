# FILE: backend/app/services/inventory_service.py
from typing import List, Optional, Dict, Any
from bson import ObjectId
from pymongo.database import Database
from app.models.inventory import InventoryItem, Recipe
import datetime

class InventoryService:
    def __init__(self, db: Database):
        self.db = db

    def create_item(self, user_id: str, item_in: dict) -> InventoryItem:
        # Default source is MANUAL unless specified
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

    # --- BULK IMPORT FOR POS ITEMS ---
    def import_items_bulk(self, user_id: str, items_data: List[Dict[str, Any]]) -> int:
        """
        Bulk inserts inventory items with source='POS'.
        """
        clean_items = []
        for row in items_data:
            # Map CSV headers to Model fields if necessary, or assume pre-mapped
            item_obj = InventoryItem(
                user_id=user_id,
                name=str(row.get("name", row.get("Product", "Unknown"))),
                unit=str(row.get("unit", row.get("Unit", "kg"))).lower(),
                current_stock=float(row.get("current_stock", row.get("Stock", 0.0))),
                cost_per_unit=float(row.get("cost_per_unit", row.get("Cost", 0.0))),
                source="POS" # Explicitly tag as POS
            )
            item_dict = item_obj.model_dump(by_alias=True)
            if "_id" in item_dict: del item_dict["_id"]
            clean_items.append(item_dict)
        
        if clean_items:
            res = self.db["inventory"].insert_many(clean_items)
            return len(res.inserted_ids)
        return 0

    # --- RECIPES ---
    def create_recipe(self, user_id: str, recipe_in: dict) -> Recipe:
        recipe = Recipe(user_id=user_id, **recipe_in)
        recipe_dict = recipe.model_dump(by_alias=True)
        if "_id" in recipe_dict and recipe_dict["_id"] is None:
            del recipe_dict["_id"]
        self.db["recipes"].insert_one(recipe_dict)
        return Recipe(**recipe_dict)
        
    def update_recipe(self, user_id: str, recipe_id: str, data: dict) -> Recipe:
        oid = ObjectId(recipe_id)
        self.db["recipes"].update_one({"_id": oid, "user_id": user_id}, {"$set": data})
        return self.get_recipe(recipe_id) # type: ignore

    def get_recipe(self, recipe_id: str) -> Optional[Recipe]:
        doc = self.db["recipes"].find_one({"_id": ObjectId(recipe_id)})
        return Recipe(**doc) if doc else None

    def get_recipes(self, user_id: str) -> List[Recipe]:
        cursor = self.db["recipes"].find({"user_id": user_id})
        return [Recipe(**item) for item in list(cursor)]
        
    def delete_recipe(self, user_id: str, recipe_id: str):
        self.db["recipes"].delete_one({"_id": ObjectId(recipe_id), "user_id": user_id})

    def get_cost_for_product(self, user_id: str, product_name: str) -> float:
        recipe_doc = self.db["recipes"].find_one({
            "user_id": user_id, 
            "product_name": {"$regex": f"^{product_name}$", "$options": "i"}
        })
        if not recipe_doc:
            return 0.0
        recipe = Recipe(**recipe_doc)
        total_cost = 0.0
        for ingredient in recipe.ingredients:
            item_doc = self.db["inventory"].find_one({"_id": ObjectId(ingredient.inventory_item_id)})
            if item_doc:
                item = InventoryItem(**item_doc)
                cost_of_ingredient = item.cost_per_unit * ingredient.quantity_required
                total_cost += cost_of_ingredient
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
            total_cost = 0.0
            stock_deducted = False
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
                        cost_per_unit = item_doc.get("cost_per_unit", 0.0)
                        total_cost += (cost_per_unit * amount_to_deduct)
                stock_deducted = True
            revenue = tx.get("amount", 0.0)
            net_profit = revenue - total_cost
            self.db["transactions"].update_one(
                {"_id": tx["_id"]},
                {"$set": {
                    "cost": total_cost,
                    "net_profit": net_profit,
                    "is_inventory_processed": True,
                    "has_recipe_match": stock_deducted
                }}
            )
            updated_count += 1
        return updated_count