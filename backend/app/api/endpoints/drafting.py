# FILE: app/api/endpoints/drafting.py
# PHOENIX PROTOCOL - DRAFTING ENDPOINT V2.0 (PDF PURCHASE ORDER)

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

from app.services.drafting_service import DraftingService
from app.services.archive_service import ArchiveService
from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from pymongo.database import Database

router = APIRouter(tags=["drafting"])

class DraftRequest(BaseModel):
    user_prompt: str
    document_type: str = "generic"
    include_legal_context: bool = True

class PurchaseOrderRequest(BaseModel):
    item_id: str
    item_name: str
    unit: str
    quantity: float
    estimated_cost: float
    supplier_name: str

@router.post("/stream")
async def stream_draft(
    request: DraftRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate a legal document with streaming response.
    Uses Juristi's knowledge base for legal context.
    """
    if not request.user_prompt or not request.user_prompt.strip():
        raise HTTPException(status_code=400, detail="User prompt is required")
    
    drafting_service = DraftingService()
    
    async def generate():
        async for chunk in drafting_service.draft_document_stream(
            user_prompt=request.user_prompt,
            document_type=request.document_type,
            include_legal_context=request.include_legal_context
        ):
            yield chunk
    
    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Content-Disposition": "attachment; filename=draft.txt",
            "X-Content-Type-Options": "nosniff"
        }
    )

@router.post("/purchase-order")
async def create_purchase_order(
    order: PurchaseOrderRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Create a purchase order as a PDF and save it to the archive.
    """
    # Create PDF in memory
    pdf_buffer = BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm,
        leftMargin=2*cm,
        rightMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=1,  # center
        spaceAfter=20
    )
    normal_style = styles['Normal']
    
    story = []
    story.append(Paragraph("POROSIA E BLERJES", title_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"<b>Data:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    story.append(Spacer(1, 12))
    
    # Table of order details
    data = [
        ["Produkti:", order.item_name],
        ["Njësia:", order.unit],
        ["Sasia:", str(order.quantity)],
        ["Furnitori:", order.supplier_name],
        ["Kosto e vlerësuar:", f"€{order.estimated_cost:.2f}"],
        ["Statusi:", "Draft (krijuar nga AI)"]
    ]
    
    table = Table(data, colWidths=[4*cm, 8*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.lightgrey),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(table)
    story.append(Spacer(1, 20))
    
    # Build PDF
    doc.build(story)
    pdf_bytes = pdf_buffer.getvalue()
    
    # Prepare filename
    filename = f"purchase_order_{order.item_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    # Save to archive
    archive_service = ArchiveService(db)
    try:
        archive_item = await archive_service.save_generated_file(
            user_id=str(current_user.id),
            filename=filename,
            file_content=pdf_bytes,
            category="purchase_order",
            title=f"Porosia Blerje: {order.item_name}",
            case_id=None
        )
        archive_id_str = str(archive_item.id)
        return {
            "status": "created",
            "message": f"Purchase order PDF for {order.item_name} saved to archive.",
            "archive_id": archive_id_str,
            "order": order.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save purchase order PDF: {str(e)}")

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "drafting"}