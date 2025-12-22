# FILE: backend/app/models/inventory.py
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from .common import PyObjectId

# --- 1. RAW MATERIALS (THE WAREHOUSE) ---
class InventoryItem(BaseModel):
    """
    Represents raw materials like 'Coffee Beans', 'Milk', 'Flour'.
    """
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: str
    name: str             # e.g., "Kafe Kokerr"
    unit: str             # e.g., "kg", "litra", "cope"
    current_stock: float = 0.0
    cost_per_unit: float = 0.0 # Weighted Average Cost (e.g., €12.50 per kg)
    low_stock_threshold: float = 5.0
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

# --- 2. THE RECIPE (THE LOGIC LINK) ---
class Ingredient(BaseModel):
    inventory_item_id: str
    quantity_required: float # How much is used per 1 unit of Product (e.g., 0.007 kg)

class Recipe(BaseModel):
    """
    Links a POS Product Name (from CSV) to Inventory Items.
    Example: "Espresso" -> [0.007kg Coffee, 0.01L Water]
    """
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: str
    product_name: str     # MUST match the 'description' from the CSV exactly
    ingredients: List[Ingredient]
    
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)