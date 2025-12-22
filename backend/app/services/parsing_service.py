# FILE: backend/app/services/inventory_service.py
# PHOENIX PROTOCOL - INVENTORY SERVICE V2.1 (ATTRIBUTE FIX)
# 1. FIX: Added missing 'process_transaction_batch' method to resolve Pylance error.
# 2. STATUS: Production Ready.

from typing import List, Optional
from bson import ObjectId
from pymongo.database import Database
from app.models.inventory import InventoryItem, Recipe

class InventoryService:
    def __init__(self, db: Database):
        self.db = db

    # --- ITEM MANAGEMENT ---
    def create_item(self, user_id: str, item_in: dict) -> InventoryItem:
        """
        Creates a new raw material item in the inventory.
        """
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

    # --- RECIPE MANAGEMENT ---
    def create_recipe(self, user_id: str, recipe_in: dict) -> Recipe:
        recipe = Recipe(user_id=user_id, **recipe_in)
        recipe_dict = recipe.model_dump(by_alias=True)
        if "_id" in recipe_dict and recipe_dict["_id"] is None:
            del recipe_dict["_id"]
        
        self.db["recipes"].insert_one(recipe_dict)
        return Recipe(**recipe_dict)

    def get_recipes(self, user_id: str) -> List[Recipe]:
        cursor = self.db["recipes"].find({"user_id": user_id})
        return [Recipe(**item) for item in list(cursor)]

    # --- THE BRAIN: COST CALCULATION ---
    def get_cost_for_product(self, user_id: str, product_name: str) -> float:
        """
        Finds the recipe and calculates total cost of ingredients.
        """
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

    # --- NEW: BATCH PROCESSING FOR IMPORT ---
    def process_transaction_batch(self, batch_id: str, user_id: str):
        """
        THE END-TO-END LOGIC:
        1. Reads all transactions in a batch.
        2. Matches them to recipes.
        3. Deducts stock.
        4. Updates transaction with Cost and Profit.
        """
        transactions = list(self.db["transactions"].find({"batch_id": batch_id, "user_id": user_id}))
        
        updated_count = 0
        
        for tx in transactions:
            # 1. Find Recipe
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
                
                # 2. Process Ingredients
                for ingredient in recipe.ingredients:
                    # Calculate how much to remove: Recipe Qty * Sold Qty
                    amount_to_deduct = ingredient.quantity_required * qty_sold
                    
                    # Deduct from Inventory (Atomic Decrement)
                    self.db["inventory"].update_one(
                        {"_id": ObjectId(ingredient.inventory_item_id)},
                        {"$inc": {"current_stock": -amount_to_deduct}}
                    )
                    
                    # Calculate Cost
                    item_doc = self.db["inventory"].find_one({"_id": ObjectId(ingredient.inventory_item_id)})
                    if item_doc:
                        cost_per_unit = item_doc.get("cost_per_unit", 0.0)
                        total_cost += (cost_per_unit * amount_to_deduct)
                
                stock_deducted = True
            
            # 3. Calculate Profit
            revenue = tx.get("amount", 0.0)
            net_profit = revenue - total_cost
            
            # 4. Update Transaction Record
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