# FILE: backend/app/services/inventory_service.py
# PHOENIX PROTOCOL - INVENTORY SERVICE V6.4 (FINAL TYPE‑SAFE WITH IGNORES)

from typing import List, Optional, Dict, Any, Union
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

    def _get_user_context(self, user_id: str) -> Optional[str]:
        """Helper to get the organization_id for a user as string."""
        user = self.db.users.find_one({"_id": ObjectId(user_id)})
        if user and "organization_id" in user and user["organization_id"]:
            return str(user["organization_id"])
        return None

    def create_item(self, user_id: str, item_in: dict, case_id: Optional[str] = None) -> InventoryItem:
        org_id = self._get_user_context(user_id)
        if "source" not in item_in:
            item_in["source"] = "MANUAL"
        # Build a dict for insertion
        item_dict: Dict[str, Any] = {
            "user_id": user_id,
            "name": item_in.get("name"),
            "unit": item_in.get("unit", "kg"),
            "current_stock": item_in.get("current_stock", 0.0),
            "cost_per_unit": item_in.get("cost_per_unit", 0.0),
            "low_stock_threshold": item_in.get("low_stock_threshold", 5.0),
            "source": item_in.get("source", "MANUAL"),
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow(),
        }
        if org_id:
            item_dict["organization_id"] = org_id
        if case_id:
            item_dict["case_id"] = case_id

        res = self.db["inventory"].insert_one(item_dict)
        return self.get_item(str(res.inserted_id))  # type: ignore

    def get_item(self, item_id: str) -> Optional[InventoryItem]:
        doc = self.db["inventory"].find_one({"_id": ObjectId(item_id)})
        return InventoryItem(**doc) if doc else None

    def get_items(self, user_id: str, case_id: Optional[str] = None) -> List[InventoryItem]:
        org_id = self._get_user_context(user_id)
        # Explicitly type the query to avoid type inference issues
        query: Dict[str, Any] = {"$or": [{"user_id": user_id}]}
        if org_id:
            query["$or"].append({"organization_id": org_id})  # type: ignore
        if case_id:
            query["case_id"] = case_id
        cursor = self.db["inventory"].find(query)
        return [InventoryItem(**item) for item in list(cursor)]

    def update_item(self, user_id: str, item_id: str, data: dict) -> Optional[InventoryItem]:
        oid = ObjectId(item_id)
        data["updated_at"] = datetime.datetime.utcnow()
        self.db["inventory"].update_one(
            {"_id": oid, "user_id": user_id}, {"$set": data}
        )
        return self.get_item(item_id)

    def delete_item(self, user_id: str, item_id: str):
        self.db["inventory"].delete_one({"_id": ObjectId(item_id), "user_id": user_id})

    def import_items_bulk(self, user_id: str, items_data: List[Dict[str, Any]], case_id: Optional[str] = None) -> int:
        org_id = self._get_user_context(user_id)
        clean_items = []
        for row in items_data:
            try:
                name = str(row.get("name", row.get("Emri", row.get("Product", "Unknown")))).strip()
                if not name:
                    continue
                unit = str(row.get("unit", row.get("Njesia", row.get("Unit", "kg")))).lower()
                stock = float(row.get("current_stock", row.get("Stoku", row.get("Stock", 0.0))))
                cost = float(row.get("cost_per_unit", row.get("Kosto", row.get("Cost", 0.0))))
                item_dict: Dict[str, Any] = {
                    "user_id": user_id,
                    "name": name,
                    "unit": unit,
                    "current_stock": stock,
                    "cost_per_unit": cost,
                    "source": "POS",
                    "created_at": datetime.datetime.utcnow(),
                    "updated_at": datetime.datetime.utcnow(),
                }
                if org_id:
                    item_dict["organization_id"] = org_id
                if case_id:
                    item_dict["case_id"] = case_id
                clean_items.append(item_dict)
            except Exception:
                continue
        if clean_items:
            res = self.db["inventory"].insert_many(clean_items)
            return len(res.inserted_ids)
        return 0

    def import_recipes_bulk(self, user_id: str, recipes_data: List[Dict[str, Any]], case_id: Optional[str] = None) -> Dict[str, Any]:
        org_id = self._get_user_context(user_id)
        # Build inventory map for ingredient lookup
        inv_query: Dict[str, Any] = {"$or": [{"user_id": user_id}]}
        if org_id:
            inv_query["$or"].append({"organization_id": org_id})  # type: ignore
        if case_id:
            inv_query["case_id"] = case_id
        inventory_items = list(self.db["inventory"].find(inv_query))
        inv_map = {item["name"].strip().lower(): str(item["_id"]) for item in inventory_items}

        recipes_map: Dict[str, List[Ingredient]] = {}
        missing_ingredients = set()

        for row in recipes_data:
            p_name = next((v for k, v in row.items()
                           if k.lower().replace(" ", "").replace("_", "") in ["productname", "product"]), None)
            i_name = next((v for k, v in row.items()
                           if k.lower().replace(" ", "").replace("_", "") in ["ingredientname", "ingredient"]), None)
            qty_raw = next((v for k, v in row.items()
                            if k.lower().replace(" ", "").replace("_", "") in ["quantity", "quantityrequired", "qty"]), 0.0)

            if not p_name or not i_name:
                continue
            product_name = str(p_name).strip()
            ingredient_name = str(i_name).strip().lower()

            ing_id = inv_map.get(ingredient_name)
            if not ing_id:
                for inv_name, real_id in inv_map.items():
                    if ingredient_name in inv_name or inv_name in ingredient_name:
                        ing_id = real_id
                        break
            if ing_id:
                ing_obj = Ingredient(inventory_item_id=ing_id, quantity_required=float(qty_raw))
                recipes_map.setdefault(product_name, []).append(ing_obj)
            else:
                missing_ingredients.add(ingredient_name)

        created_count = 0
        for p_name, ingredients in recipes_map.items():
            recipe_data: Dict[str, Any] = {
                "user_id": user_id,
                "product_name": p_name,
                "ingredients": [i.model_dump() for i in ingredients],
                "instructions": "Imported from CSV",
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow(),
            }
            if org_id:
                recipe_data["organization_id"] = org_id
            if case_id:
                recipe_data["case_id"] = case_id

            self.db["recipes"].update_one(
                {"user_id": user_id, "product_name": {"$regex": f"^{re.escape(p_name)}$", "$options": "i"}},
                {"$set": recipe_data},
                upsert=True
            )
            created_count += 1

        return {"recipes_created": created_count, "missing_ingredients": list(missing_ingredients)}

    def get_recipes(self, user_id: str, case_id: Optional[str] = None) -> List[Recipe]:
        org_id = self._get_user_context(user_id)
        query: Dict[str, Any] = {"$or": [{"user_id": user_id}]}
        if org_id:
            query["$or"].append({"organization_id": org_id})  # type: ignore
        if case_id:
            query["case_id"] = case_id
        cursor = self.db["recipes"].find(query)
        recipes = []
        for item in list(cursor):
            try:
                recipes.append(Recipe(**item))
            except Exception:
                continue
        return recipes

    def update_recipe(self, user_id: str, recipe_id: str, recipe_in: dict) -> Recipe:
        """Update an existing recipe."""
        oid = ObjectId(recipe_id)
        recipe_in["updated_at"] = datetime.datetime.utcnow()
        result = self.db["recipes"].update_one(
            {"_id": oid, "user_id": user_id},
            {"$set": recipe_in}
        )
        if result.matched_count == 0:
            raise ValueError("Recipe not found")
        updated = self.db["recipes"].find_one({"_id": oid})
        return Recipe(**updated)  # type: ignore

    def delete_recipe(self, user_id: str, recipe_id: str):
        self.db["recipes"].delete_one({"_id": ObjectId(recipe_id), "user_id": user_id})

    def create_recipe(self, user_id: str, recipe_in: dict, case_id: Optional[str] = None) -> Recipe:
        org_id = self._get_user_context(user_id)
        recipe_data: Dict[str, Any] = {
            "user_id": user_id,
            "product_name": recipe_in.get("product_name"),
            "ingredients": recipe_in.get("ingredients", []),
            "instructions": recipe_in.get("instructions", ""),
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow(),
        }
        if org_id:
            recipe_data["organization_id"] = org_id
        if case_id:
            recipe_data["case_id"] = case_id

        result = self.db["recipes"].insert_one(recipe_data)
        return Recipe(**self.db["recipes"].find_one({"_id": result.inserted_id}))  # type: ignore