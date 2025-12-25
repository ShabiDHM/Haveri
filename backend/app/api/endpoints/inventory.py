# FILE: backend/app/api/endpoints/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List
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

@router.post("/items/import")
async def import_inventory_items(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Import Inventory Items from CSV.
    Matches Albanian headers: EmriProduktit, SasiaStokut, KostoPerNjesi.
    """
    content = await file.read()
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

    # Normalize headers
    df.columns = [str(c).lower().strip().replace(' ', '') for c in df.columns]
    
    # Mapping logic
    col_map = {}
    
    # Find Name column
    for c in df.columns:
        if any(x in c for x in ['emri', 'name', 'produkt', 'product']):
            col_map['name'] = c
            break
            
    # Find Stock column
    for c in df.columns:
        if any(x in c for x in ['sasia', 'stok', 'qty', 'stock']):
            col_map['stock'] = c
            break
            
    # Find Cost column
    for c in df.columns:
        if any(x in c for x in ['kosto', 'cost', 'price', 'cmimi']):
            col_map['cost'] = c
            break

    # Find Unit column
    for c in df.columns:
        if any(x in c for x in ['njesi', 'unit']):
            col_map['unit'] = c
            break

    if 'name' not in col_map:
        raise HTTPException(400, "CSV must contain a 'Name' or 'Emri' column.")

    service = InventoryService(db)
    created_count = 0
    
    for _, row in df.iterrows():
        try:
            name = str(row[col_map['name']]).strip()
            if not name: continue
            
            # Stock
            stock = 0.0
            if 'stock' in col_map:
                try: stock = float(str(row[col_map['stock']]).replace(',', '.'))
                except: stock = 0.0
                
            # Cost
            cost = 0.0
            if 'cost' in col_map:
                try: cost = float(str(row[col_map['cost']]).replace(',', '.'))
                except: cost = 0.0
            
            # Unit
            unit = "kg"
            if 'unit' in col_map:
                val = str(row[col_map['unit']]).strip().lower()
                if val: unit = val
            
            item_data = {
                "name": name,
                "unit": unit,
                "current_stock": stock,
                "cost_per_unit": cost,
                "low_stock_threshold": 5.0
            }
            
            service.create_item(str(current_user.id), item_data)
            created_count += 1
            
        except Exception as e:
            print(f"Skipping row: {e}")
            continue

    return {
        "status": "success",
        "items_created": created_count,
        "message": f"Successfully imported {created_count} items."
    }

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

@router.post("/recipes/import")
async def import_recipes(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Import Recipes (Product -> Ingredients).
    """
    content = await file.read()
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

    df.columns = [str(c).lower().strip() for c in df.columns]
    col_map = {}
    
    for c in df.columns:
        if any(x in c for x in ['product', 'produkt', 'emri']):
            col_map['product'] = c
        elif any(x in c for x in ['ingredient', 'lenda', 'material', 'perberes']):
            col_map['ingredient'] = c
        elif any(x in c for x in ['quant', 'sasia', 'qty']):
            col_map['qty'] = c
            
    if len(col_map) < 3:
        cols = df.columns.tolist()
        if len(cols) >= 3:
            col_map = {'product': cols[0], 'ingredient': cols[1], 'qty': cols[2]}
        else:
            raise HTTPException(400, "Columns not identified.")

    inv_service = InventoryService(db)
    items = inv_service.get_items(str(current_user.id))
    item_map = {i.name.lower().strip(): str(i.id) for i in items}

    recipes_to_create = {}
    missing_items = set()

    for _, row in df.iterrows():
        try:
            prod_name = str(row[col_map['product']]).strip()
            ing_name = str(row[col_map['ingredient']]).strip()
            
            raw_qty = row[col_map['qty']]
            if isinstance(raw_qty, str):
                raw_qty = raw_qty.replace(',', '.')
            try: qty = float(raw_qty)
            except: qty = 0
                
            if not prod_name or not ing_name or qty <= 0:
                continue
                
            ing_id = item_map.get(ing_name.lower())
            
            if not ing_id:
                missing_items.add(ing_name)
                continue
                
            if prod_name not in recipes_to_create:
                recipes_to_create[prod_name] = []
                
            recipes_to_create[prod_name].append({
                "inventory_item_id": ing_id,
                "quantity_required": qty
            })
        except:
            continue

    created_count = 0
    for prod_name, ingredients in recipes_to_create.items():
        if not ingredients: continue
            
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