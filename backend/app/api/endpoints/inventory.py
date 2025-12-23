# FILE: backend/app/api/endpoints/inventory.py
# PHOENIX PROTOCOL - INVENTORY API V1.2 (TYPE SAFETY FIX)
# 1. FIX: Handled optional 'file.filename' to resolve Pylance "attribute of None" error.
# 2. STATUS: Production Ready.

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Dict, Any
from pydantic import BaseModel
from pymongo.database import Database
import pandas as pd
import io

from app.api.endpoints.dependencies import get_current_user, get_db
from app.services.inventory_service import InventoryService
from app.models.inventory import InventoryItem, Recipe
from app.models.user import UserInDB

router = APIRouter()

# --- INPUT MODELS (DTOs) ---
class InventoryItemCreate(BaseModel):
    name: str
    unit: str             # e.g., "kg", "litra"
    current_stock: float = 0.0
    cost_per_unit: float = 0.0
    low_stock_threshold: float = 5.0

class IngredientCreate(BaseModel):
    inventory_item_id: str
    quantity_required: float

class RecipeCreate(BaseModel):
    product_name: str
    ingredients: List[IngredientCreate]

# --- ENDPOINTS ---

@router.get("/items", response_model=List[InventoryItem])
def get_inventory_items(
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = InventoryService(db)
    return service.get_items(str(current_user.id))

@router.post("/items", response_model=InventoryItem, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item_in: InventoryItemCreate,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = InventoryService(db)
    return service.create_item(str(current_user.id), item_in.model_dump())

@router.get("/recipes", response_model=List[Recipe])
def get_recipes(
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = InventoryService(db)
    return service.get_recipes(str(current_user.id))

@router.post("/recipes", response_model=Recipe, status_code=status.HTTP_201_CREATED)
def create_recipe(
    recipe_in: RecipeCreate,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = InventoryService(db)
    return service.create_recipe(str(current_user.id), recipe_in.model_dump())

# --- PHOENIX: UNIVERSAL RECIPE IMPORTER ---
@router.post("/recipes/import")
async def import_recipes(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Universal BOM Importer.
    Expects columns: 
    1. Product Name (Output)
    2. Ingredient/Material Name (Input)
    3. Quantity Required
    """
    # 1. Read File
    content = await file.read()
    
    # Safe filename handling
    filename = file.filename or "unknown.csv"
    
    try:
        if filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(content))
        else:
            try:
                df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
            except:
                df = pd.read_csv(io.BytesIO(content), encoding='cp1252')
    except Exception as e:
        raise HTTPException(400, f"Invalid file format: {str(e)}")

    # 2. Smart Column Mapping
    # Normalize headers to lowercase to handle variations like "Product Name", "product", "Emri", etc.
    df.columns = [str(c).lower().strip() for c in df.columns]
    
    col_map = {}
    
    # Try to find columns by keywords
    for c in df.columns:
        if any(x in c for x in ['product', 'produkt', 'emri', 'output', 'artikull']):
            col_map['product'] = c
        elif any(x in c for x in ['ingredient', 'lenda', 'material', 'component', 'input', 'perberes']):
            col_map['ingredient'] = c
        elif any(x in c for x in ['quant', 'sasia', 'qty', 'amount']):
            col_map['qty'] = c
            
    # Fallback to indices 0, 1, 2 if names don't match
    if len(col_map) < 3:
        cols = df.columns.tolist()
        if len(cols) >= 3:
            col_map = {'product': cols[0], 'ingredient': cols[1], 'qty': cols[2]}
        else:
            raise HTTPException(400, "Could not identify Product, Ingredient, and Quantity columns. Please check your file headers.")

    # 3. Fetch Inventory for Lookup
    inv_service = InventoryService(db)
    items = inv_service.get_items(str(current_user.id))
    # Map Name -> ID (robust matching: lowercase, stripped)
    item_map = {i.name.lower().strip(): str(i.id) for i in items}

    # 4. Group by Product
    recipes_to_create = {} # { "Product Name": [ {id, qty}, ... ] }
    missing_items = set()

    for _, row in df.iterrows():
        try:
            prod_name = str(row[col_map['product']]).strip()
            ing_name = str(row[col_map['ingredient']]).strip()
            
            # Handle numeric quantity parsing safely
            raw_qty = row[col_map['qty']]
            if isinstance(raw_qty, str):
                raw_qty = raw_qty.replace(',', '.') # Handle EU format
            try:
                qty = float(raw_qty)
            except:
                qty = 0
                
            if not prod_name or not ing_name or qty <= 0:
                continue
                
            # Lookup Ingredient ID
            ing_id = item_map.get(ing_name.lower())
            
            if not ing_id:
                # If ingredient doesn't exist, we can't link it. Add to missing report.
                missing_items.add(ing_name)
                continue
                
            if prod_name not in recipes_to_create:
                recipes_to_create[prod_name] = []
                
            recipes_to_create[prod_name].append({
                "inventory_item_id": ing_id,
                "quantity_required": qty
            })
        except Exception as e:
            print(f"Skipping row due to error: {e}")
            continue

    # 5. Save Recipes to DB
    created_count = 0
    for prod_name, ingredients in recipes_to_create.items():
        if not ingredients:
            continue
            
        # Strategy: Overwrite. If recipe exists, replace it. 
        # This allows users to update recipes by re-uploading.
        db["recipes"].delete_many({"user_id": str(current_user.id), "product_name": prod_name})
        
        recipe_in = {
            "product_name": prod_name,
            "ingredients": ingredients
        }
        inv_service.create_recipe(str(current_user.id), recipe_in)
        created_count += 1

    return {
        "status": "success",
        "recipes_created": created_count,
        "missing_ingredients": list(missing_items),
        "message": f"Successfully created {created_count} recipes."
    }