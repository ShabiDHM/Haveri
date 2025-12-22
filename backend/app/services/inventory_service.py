# FILE: backend/app/services/inventory_service.py
# PHOENIX PROTOCOL - INVENTORY SERVICE V1.1 (SYNC FIX)
# 1. FIX: Switched from Async/Await (Motor) to Synchronous (Pymongo) to match db instance.
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
        
        # Retrieve the created item to return it
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
        Returns 0.0 if no recipe is found.
        """
        # Case insensitive matching for robustness
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