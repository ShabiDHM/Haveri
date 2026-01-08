# FILE: backend/app/services/archive_service.py
# PHOENIX PROTOCOL - ARCHIVE SERVICE V4.1 (TITLE ENHANCEMENT)
# 1. FIX: Upgraded 'save_generated_file' to accept an optional 'title' parameter.
# 2. LOGIC: If a title is provided, it is used for the archive item; otherwise, it falls back to the filename.
# 3. INTEGRITY: Aligns the function's signature with other creation methods and improves data quality.

import os
import logging
from typing import List, Optional, Tuple, Any, Dict
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database
from fastapi import UploadFile, HTTPException

from ..models.archive import ArchiveItemInDB
from .storage_service import get_s3_client, transfer_config
from .pdf_service import pdf_service 

from ..celery_app import celery_app
from . import vector_store_service

logger = logging.getLogger(__name__)

B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME")

class ArchiveService:
    def __init__(self, db: Database):
        self.db = db

    def _to_oid(self, id_str: str) -> ObjectId:
        try:
            return ObjectId(id_str)
        except (InvalidId, TypeError):
            raise HTTPException(status_code=400, detail=f"Invalid ObjectId format: {id_str}")

    def create_folder(self, user_id: str, title: str, parent_id: Optional[str] = None, case_id: Optional[str] = None, category: str = "GENERAL") -> ArchiveItemInDB:
        folder_data = {
            "user_id": self._to_oid(user_id), "title": title, "item_type": "FOLDER", "file_type": "FOLDER", "category": category,
            "created_at": datetime.now(timezone.utc), "storage_key": None, "file_size": 0, "description": "", "is_shared": False 
        }
        if parent_id and parent_id.strip() and parent_id != "null":
            folder_data["parent_id"] = self._to_oid(parent_id)
        if case_id and case_id.strip() and case_id != "null":
            folder_data["case_id"] = self._to_oid(case_id)
            
        result = self.db.archives.insert_one(folder_data)
        folder_data["_id"] = result.inserted_id
        return ArchiveItemInDB(**folder_data)

    async def add_file_to_archive(self, user_id: str, file: UploadFile, category: str, title: str, case_id: Optional[str] = None, parent_id: Optional[str] = None) -> ArchiveItemInDB:
        s3_client = get_s3_client()
        
        try:
            file_obj, final_filename = await pdf_service.convert_upload_to_pdf(file)
        except Exception as e:
            logger.error(f"PDF Conversion failed: {e}")
            file_obj = file.file; final_filename = file.filename or "untitled"

        file_ext = final_filename.split('.')[-1].upper() if '.' in final_filename else "BIN"
        timestamp = int(datetime.now().timestamp())
        storage_key = f"archive/{user_id}/{timestamp}_{final_filename}"
        
        try:
            file_obj.seek(0, 2); file_size = file_obj.tell(); file_obj.seek(0)
            s3_client.upload_fileobj(file_obj, B2_BUCKET_NAME, storage_key, Config=transfer_config)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Storage Upload Failed: {str(e)}")
        
        doc_data = {
            "user_id": self._to_oid(user_id), "title": title or final_filename, "item_type": "FILE", "file_type": file_ext,
            "category": category, "storage_key": storage_key, "file_size": file_size, "created_at": datetime.now(timezone.utc),
            "description": "", "is_shared": False, "indexing_status": "PENDING"
        }
        if case_id and case_id.strip() and case_id != "null": doc_data["case_id"] = self._to_oid(case_id)
        if parent_id and parent_id.strip() and parent_id != "null": doc_data["parent_id"] = self._to_oid(parent_id)
        
        result = self.db.archives.insert_one(doc_data)
        
        try:
            celery_app.send_task("app.tasks.document_processing.process_archive_document", args=[str(result.inserted_id)])
            logger.info(f"Queued archive item {result.inserted_id} for embedding.")
        except Exception as e:
            logger.error(f"Failed to queue archive indexing: {e}")

        doc_data["_id"] = result.inserted_id
        return ArchiveItemInDB(**doc_data)

    def re_index_item(self, user_id: str, item_id: str):
        oid_user = self._to_oid(user_id)
        oid_item = self._to_oid(item_id)
        item = self.db.archives.find_one({"_id": oid_item, "user_id": oid_user, "item_type": "FILE"})
        if not item:
            raise HTTPException(status_code=404, detail="File not found or access denied.")
        self.db.archives.update_one({"_id": oid_item}, {"$set": {"indexing_status": "PENDING"}})
        try:
            vector_store_service.delete_document_embeddings(user_id, item_id)
        except Exception as e:
            logger.error(f"Failed to clear old vector memory during re-index: {e}")
        try:
            celery_app.send_task("app.tasks.document_processing.process_archive_document", args=[item_id])
            logger.info(f"Re-queued archive item {item_id} for embedding.")
        except Exception as e:
            logger.error(f"Failed to re-queue archive indexing: {e}")
            self.db.archives.update_one({"_id": oid_item}, {"$set": {"indexing_status": "FAILED"}})
            raise HTTPException(status_code=500, detail="Failed to initiate re-indexing task.")

    def get_archive_items(self, user_id: str, category: Optional[str] = None, case_id: Optional[str] = None, parent_id: Optional[str] = None) -> List[ArchiveItemInDB]:
        query: Dict[str, Any] = {"user_id": self._to_oid(user_id)}
        if parent_id and parent_id.strip() and parent_id != "null": 
            query["parent_id"] = self._to_oid(parent_id)
        else:
            if not category or category == "ALL": query["parent_id"] = None
        if category and category != "ALL": query["category"] = category
        if case_id and case_id.strip() and case_id != "null": query["case_id"] = self._to_oid(case_id)
        cursor = self.db.archives.find(query).sort([("item_type", -1), ("created_at", -1)])
        return [ArchiveItemInDB(**doc) for doc in cursor]

    def delete_archive_item(self, user_id: str, item_id: str):
        oid_user = self._to_oid(user_id); oid_item = self._to_oid(item_id)
        item = self.db.archives.find_one({"_id": oid_item, "user_id": oid_user})
        if not item: raise HTTPException(status_code=404, detail="Item not found")
        if item.get("item_type") == "FOLDER":
            children = self.db.archives.find({"parent_id": oid_item, "user_id": oid_user})
            for child in children: self.delete_archive_item(user_id, str(child["_id"]))
        if item.get("item_type") == "FILE":
            if item.get("storage_key"):
                try: get_s3_client().delete_object(Bucket=B2_BUCKET_NAME, Key=item["storage_key"])
                except: pass
            try:
                vector_store_service.delete_document_embeddings(user_id, str(item_id))
            except Exception as e:
                logger.error(f"Failed to wipe vector memory: {e}")
        self.db.archives.delete_one({"_id": oid_item})

    def rename_item(self, user_id: str, item_id: str, new_title: str) -> None:
        oid_user = self._to_oid(user_id); oid_item = self._to_oid(item_id)
        self.db.archives.update_one({"_id": oid_item, "user_id": oid_user}, {"$set": {"title": new_title}})

    def share_item(self, user_id: str, item_id: str, is_shared: bool) -> ArchiveItemInDB:
        result = self.db.archives.find_one_and_update({"_id": self._to_oid(item_id), "user_id": self._to_oid(user_id)}, {"$set": {"is_shared": is_shared}}, return_document=True)
        if not result: raise HTTPException(status_code=404, detail="Item not found")
        return ArchiveItemInDB(**result)

    def share_case_items(self, user_id: str, case_id: str, is_shared: bool) -> int:
        result = self.db.archives.update_many({"case_id": self._to_oid(case_id), "user_id": self._to_oid(user_id), "item_type": "FILE"}, {"$set": {"is_shared": is_shared}})
        return result.modified_count

    def get_file_stream(self, user_id: str, item_id: str) -> Tuple[Any, str]:
        item = self.db.archives.find_one({"_id": self._to_oid(item_id), "user_id": self._to_oid(user_id)})
        if not item: raise HTTPException(status_code=404, detail="Item not found")
        try:
            response = get_s3_client().get_object(Bucket=B2_BUCKET_NAME, Key=item["storage_key"])
            return response['Body'], item["title"]
        except: raise HTTPException(500, "Stream failed")

    async def archive_existing_document(self, user_id: str, case_id: str, document_id: str) -> ArchiveItemInDB:
        doc_oid = self._to_oid(document_id)
        doc = self.db.documents.find_one({"_id": doc_oid, "owner_id": self._to_oid(user_id)})
        if not doc: raise HTTPException(status_code=404, detail="Document not found")
        original_key = doc.get("storage_key")
        if not original_key: raise HTTPException(status_code=400, detail="Document has no content")
        s3 = get_s3_client()
        timestamp = int(datetime.now().timestamp())
        new_key = f"archive/{user_id}/{timestamp}_{doc.get('file_name', 'archived')}"
        try:
            s3.copy_object(Bucket=B2_BUCKET_NAME, CopySource={'Bucket': B2_BUCKET_NAME, 'Key': original_key}, Key=new_key)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to copy file to archive: {e}")
        archive_data = {
            "user_id": self._to_oid(user_id), "title": doc.get("file_name"), "item_type": "FILE",
            "file_type": doc.get("file_type", "PDF"), "category": "CASE_DOCUMENT", "case_id": self._to_oid(case_id),
            "storage_key": new_key, "file_size": doc.get("file_size", 0), "created_at": datetime.now(timezone.utc),
            "is_shared": False, "indexing_status": "PENDING"
        }
        res = self.db.archives.insert_one(archive_data)
        try:
            celery_app.send_task("app.tasks.document_processing.process_archive_document", args=[str(res.inserted_id)])
        except Exception as e:
            logger.warning(f"Failed to queue indexing for archived document: {e}")
        archive_data["_id"] = res.inserted_id
        return ArchiveItemInDB(**archive_data)

    async def save_generated_file(self, user_id: str, file_content: bytes, filename: str, category: str, title: Optional[str] = None, case_id: Optional[str] = None) -> ArchiveItemInDB:
        timestamp = int(datetime.now().timestamp())
        storage_key = f"archive/{user_id}/generated_{timestamp}_{filename}"
        s3 = get_s3_client()
        try:
            s3.put_object(Bucket=B2_BUCKET_NAME, Key=storage_key, Body=file_content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")
        doc_data = {
            "user_id": self._to_oid(user_id),
            "title": title or filename, # PHOENIX FIX: Use title if provided
            "item_type": "FILE", "file_type": filename.split('.')[-1].upper(), "category": category,
            "storage_key": storage_key, "file_size": len(file_content), "created_at": datetime.now(timezone.utc),
            "description": "System generated document", "is_shared": False, "indexing_status": "PENDING"
        }
        if case_id: doc_data["case_id"] = self._to_oid(case_id)
        res = self.db.archives.insert_one(doc_data)
        doc_data["_id"] = res.inserted_id
        celery_app.send_task("app.tasks.document_processing.process_archive_document", args=[str(res.inserted_id)])
        return ArchiveItemInDB(**doc_data)