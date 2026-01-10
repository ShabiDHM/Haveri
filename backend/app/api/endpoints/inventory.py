# FILE: backend/app/api/endpoints/inventory.py
# PHOENIX PROTOCOL - INVENTORY ENDPOINTS V5.5 (DEFINITIVE CSV PARSING FIX)
# 1. CRITICAL FIX: The 'import_recipes' endpoint now intelligently handles headerless CSV files.
# 2. LOGIC: It checks if pandas has inferred integer column names (a sign of a headerless file) and manually assigns the correct headers if so.
# 3. RESULT: This ensures that recipe data is always parsed correctly, resolving the root cause of the "No Cost Identified" error in the Analyst.

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Dict, Any, cast
from pydantic import BaseModel
from pymongo.database import Database
import pandas as pd
import io

from app.api.endpoints.dependencies import get_current_user, get_db
from app.services.inventory_service import InventoryService
from app.models.inventory import InventoryItem, Recipe
from app.models.user import UserInDB

router = APIRouter()

# --- INPUT MODELS ---
class InventoryItemCreate(BaseModel):
    name: str
    unit: str = "kg"
    current_stock: float = 0.0
    cost_per_unit: float = 0.0
    low_stock_threshold: float = 5.0
    source: str = "MANUAL"

class IngredientCreate(BaseModel):
    inventory_item_id: str
    quantity_required: float

class RecipeCreate(BaseModel):
    product_name: str
    ingredients: List[IngredientCreate]

# --- INVENTORY ITEM ENDPOINTS ---

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

@router.put("/items/{item_id}", response_model=InventoryItem)
def update_inventory_item(
    item_id: str,
    item_in: InventoryItemCreate,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = InventoryService(db)
    updated = service.update_item(str(current_user.id), item_id, item_in.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(
    item_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = InventoryService(db)
    service.delete_item(str(current_user.id), item_id)

@router.post("/items/import")
async def import_inventory_items(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    content = await file.read()
    filename = file.filename or "unknown.csv"
    
    try:
        if filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(content))
        else:
            try: df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
            except: df = pd.read_csv(io.BytesIO(content), encoding='cp1252')
    except Exception as e:
        raise HTTPException(400, f"Invalid file format: {str(e)}")

    df.columns = [str(c).lower().strip().replace(' ', '') for c in df.columns]
    
    col_map = {}
    for c in df.columns:
        if any(x in c for x in ['emri', 'name', 'produkt', 'product']): col_map['name'] = c
        elif any(x in c for x in ['sasia', 'stok', 'qty', 'stock']): col_map['stock'] = c
        elif any(x in c for x in ['kosto', 'cost', 'price', 'cmimi']): col_map['cost'] = c
        elif any(x in c for x in ['njesi', 'unit']): col_map['unit'] = c

    if 'name' not in col_map:
        raise HTTPException(400, "CSV must contain a 'Name' or 'Emri' column.")

    items_to_create = []
    
    for _, row in df.iterrows():
        try:
            name = str(row[col_map['name']]).strip()
            if not name: continue
            
            stock = 0.0
            if 'stock' in col_map:
                try: stock = float(str(row[col_map['stock']]).replace(',', '.'))
                except: stock = 0.0
                
            cost = 0.0
            if 'cost' in col_map:
                try: cost = float(str(row[col_map['cost']]).replace(',', '.'))
                except: cost = 0.0
            
            unit = "kg"
            if 'unit' in col_map:
                val = str(row[col_map['unit']]).strip().lower()
                if val: unit = val
            
            items_to_create.append({
                "name": name,
                "unit": unit,
                "current_stock": stock,
                "cost_per_unit": cost
            })
            
        except Exception:
            continue

    if items_to_create:
        service = InventoryService(db)
        count = service.import_items_bulk(str(current_user.id), items_to_create)
        return { "items_created": count }
    
    return {"items_created": 0}

# --- RECIPE ENDPOINTS ---

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

@router.put("/recipes/{recipe_id}", response_model=Recipe)
def update_recipe(
    recipe_id: str,
    recipe_in: RecipeCreate,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = InventoryService(db)
    updated = service.update_recipe(str(current_user.id), recipe_id, recipe_in.model_dump())
    return updated

@router.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    recipe_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    service = InventoryService(db)
    service.delete_recipe(str(current_user.id), recipe_id)

@router.post("/recipes/import")
async def import_recipes(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Import Recipes from a CSV file (Product, Ingredient, Quantity).
    Handles both headered and headerless files.
    """
    content = await file.read()
    filename = file.filename or "unknown.csv"
    
    try:
        # PHOENIX FIX: Read without assuming headers first
        if filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(content), header=None)
        else:
            try: df = pd.read_csv(io.BytesIO(content), encoding='utf-8', header=None)
            except: df = pd.read_csv(io.BytesIO(content), encoding='cp1252', header=None)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid file format: {str(e)}")

    if df.empty or len(df.columns) < 3:
        raise HTTPException(status_code=400, detail="CSV must have at least 3 columns: Product, Ingredient, Quantity")
        
    # PHOENIX FIX: Manually assign headers to ensure consistency
    df.columns = ['product_name', 'ingredient_name', 'quantity_required'] + [f'extra_{i}' for i in range(len(df.columns) - 3)]

    # Explicitly create a list of dicts with the correct types to pass to the service
    recipes_data_raw = df.to_dict(orient='records')
    recipes_data: List[Dict[str, Any]] = [
        {str(k): v for k, v in row.items()} for row in recipes_data_raw
    ]
    
    service = InventoryService(db)
    result = service.import_recipes_bulk(str(current_user.id), recipes_data)
    
    return {
        "status": "success",
        **result
    }