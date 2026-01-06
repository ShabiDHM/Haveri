# FILE: backend/app/api/endpoints/analysis.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Any
from app.services.spreadsheet_service import analyze_financial_spreadsheet

router = APIRouter()

@router.post("/analyze-spreadsheet")
async def analyze_spreadsheet(file: UploadFile = File(...)) -> Any:
    """
    Uploads a CSV/Excel file, performs pandas-based statistical analysis,
    checks for anomalies, and generates an AI summary.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")
        
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel files are supported.")
    
    contents = await file.read()
    
    result = analyze_financial_spreadsheet(contents, file.filename)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result