# FILE: backend/app/services/parsing_service.py
# PHOENIX PROTOCOL - PARSING SERVICE V3.3 (CIRCULAR FIX)
# 1. FIX: Moved 'InventoryService' import INSIDE the method.
# 2. REASON: Prevents 'ImportError: cannot import name ParsingService' during app startup.
# 3. STATUS: Production Ready.

import pandas as pd
import io
import logging
from datetime import datetime
from typing import List, Dict, Tuple, Any
from fastapi import UploadFile, HTTPException
from pymongo.database import Database
from app.models.finance import Transaction, ImportBatch

logger = logging.getLogger(__name__)

class ParsingService:
    def __init__(self, db: Database):
        self.db = db

    def _normalize_currency(self, value) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        
        if not isinstance(value, str):
            return 0.0

        clean_val = value.replace('€', '').replace('$', '').strip()
        
        # EU (1.000,00) vs US (1,000.00) logic
        if ',' in clean_val and '.' in clean_val:
            if clean_val.find(',') > clean_val.find('.'):
                clean_val = clean_val.replace('.', '').replace(',', '.')
            else:
                clean_val = clean_val.replace(',', '')
        elif ',' in clean_val:
            clean_val = clean_val.replace(',', '.')
            
        try:
            return float(clean_val)
        except ValueError:
            return 0.0

    async def preview_file(self, file: UploadFile) -> Dict[str, Any]:
        try:
            contents = await file.read()
            filename = file.filename or "unknown_file"

            try:
                # Safe check for extension
                if filename.endswith('.xlsx') or filename.endswith('.xls'):
                    df = pd.read_excel(io.BytesIO(contents))
                else:
                    df = pd.read_csv(io.BytesIO(contents), encoding='utf-8', sep=None, engine='python')
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(contents), encoding='cp1252', sep=None, engine='python')
            except Exception as e:
                # Fallback: try excel if csv fails, or vice versa
                try:
                     df = pd.read_excel(io.BytesIO(contents))
                except:
                    raise HTTPException(status_code=400, detail=f"File format error: {str(e)}")
            
            await file.seek(0)
            df = df.fillna("")
            
            headers = df.columns.tolist()
            sample = df.head(5).astype(str).to_dict(orient='records')
            
            return {
                "filename": filename,
                "headers": headers,
                "sample_data": sample,
                "total_rows_estimated": len(df)
            }
        except Exception as e:
            logger.error(f"Error previewing file: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    async def process_import(
        self, 
        file: UploadFile, 
        user_id: str, 
        mapping: Dict[str, str]
    ) -> Dict[str, Any]:
        
        # --- LOCAL IMPORT TO BREAK CIRCULAR DEPENDENCY ---
        # This is critical. Do not move this to the top of the file.
        from app.services.inventory_service import InventoryService
        
        contents = await file.read()
        filename = file.filename or "imported_file.csv"

        try:
            if filename.endswith('.xlsx') or filename.endswith('.xls'):
                df = pd.read_excel(io.BytesIO(contents))
            else:
                try:
                    df = pd.read_csv(io.BytesIO(contents), encoding='utf-8', sep=None, engine='python')
                except:
                    df = pd.read_csv(io.BytesIO(contents), encoding='cp1252', sep=None, engine='python')
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"File read error: {str(e)}")
            
        # Rename columns based on mapping
        df.rename(columns=mapping, inplace=True)
        
        # Create Batch Record (Explicit ID handling for Pymongo)
        batch_record = ImportBatch(
            user_id=user_id,
            filename=filename,
            mapping_snapshot=mapping,
            status="processing"
        )
        batch_dict = batch_record.model_dump(by_alias=True)
        if batch_dict.get("_id") is None:
            del batch_dict["_id"]
            
        batch_res = self.db["import_batches"].insert_one(batch_dict)
        batch_id = str(batch_res.inserted_id)

        transactions_to_insert = []
        total_value = 0.0
        
        for _, row in df.iterrows():
            try:
                # Check if 'amount' exists (it might be mapped)
                if 'amount' not in row:
                    continue
                    
                amount = self._normalize_currency(row['amount'])
                if amount == 0.0:
                    continue

                if 'date' in row and row['date']:
                    try:
                        parsed_date = pd.to_datetime(row['date'], dayfirst=True).to_pydatetime()
                    except:
                        parsed_date = datetime.now()
                else:
                    parsed_date = datetime.now()

                description = str(row.get('description', 'POS Import'))
                
                try:
                    qty = float(row.get('quantity', 1.0))
                except:
                    qty = 1.0
                
                tx = Transaction(
                    user_id=user_id,
                    batch_id=batch_id,
                    date=parsed_date,
                    amount=amount,
                    description=description,
                    quantity=qty,
                    category=str(row.get('category', 'Sales')),
                    original_row_data=row.to_dict(),
                    is_inventory_processed=False # Default to False
                )
                
                tx_dict = tx.model_dump(by_alias=True)
                if tx_dict.get("_id") is None:
                    del tx_dict["_id"]
                
                transactions_to_insert.append(tx_dict)
                total_value += amount

            except Exception as row_error:
                logger.warning(f"Skipping row {row}: {row_error}")
                continue

        if transactions_to_insert:
            self.db["transactions"].insert_many(transactions_to_insert)
            
            # --- START: END-TO-END INVENTORY SYNC ---
            # Now we use the locally imported service
            try:
                inv_service = InventoryService(self.db)
                inv_service.process_transaction_batch(batch_id, user_id)
            except Exception as e:
                logger.error(f"Inventory sync failed for batch {batch_id}: {e}")
            # --- END: END-TO-END INVENTORY SYNC ---

            self.db["import_batches"].update_one(
                {"_id": batch_res.inserted_id},
                {"$set": {
                    "status": "completed",
                    "row_count": len(transactions_to_insert),
                    "total_amount": total_value
                }}
            )
            
            return {
                "status": "success", 
                "imported_count": len(transactions_to_insert),
                "total_value": total_value,
                "batch_id": batch_id
            }
        else:
            self.db["import_batches"].update_one(
                {"_id": batch_res.inserted_id},
                {"$set": {"status": "failed"}}
            )
            raise HTTPException(status_code=400, detail="No valid transactions parsed.")