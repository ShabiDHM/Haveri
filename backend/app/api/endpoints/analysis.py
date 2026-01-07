# FILE: backend/app/api/endpoints/analysis.py
# PHOENIX PROTOCOL - ROUTER V2.0 (IMAGE ANALYSIS)
# 1. FEATURE: Added the new '/analyze-scanned-image' endpoint.
# 2. LOGIC: Routes image uploads to the `analyze_scanned_image` service function.
# 3. VALIDATION: Ensures only valid spreadsheet or image file types are accepted by the respective endpoints.

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Any
# PHOENIX: Import both service functions
from app.services.spreadsheet_service import analyze_financial_spreadsheet, analyze_scanned_image

router = APIRouter()

@router.post("/analyze-spreadsheet")
async def analyze_spreadsheet(file: UploadFile = File(...)) -> Any:
    """
    Uploads a CSV/Excel file, performs pandas-based statistical analysis,
    checks for anomalies, and generates an AI summary.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")
        
    if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel files are supported.")
    
    contents = await file.read()
    
    result = analyze_financial_spreadsheet(contents, file.filename)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

# PHOENIX: New endpoint for image scanning
@router.post("/analyze-scanned-image")
async def analyze_image(file: UploadFile = File(...)) -> Any:
    """
    Uploads an image (PNG, JPG) of a financial document, performs OCR and data structuring
    with a vision model, and then runs the same financial analysis as the spreadsheet endpoint.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")

    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Only PNG or JPG image files are supported for scanning.")

    contents = await file.read()
    
    result = analyze_scanned_image(contents)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result