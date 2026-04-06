# FILE: app/api/endpoints/drafting.py
# PHOENIX PROTOCOL - DRAFTING ENDPOINT V3.1 (PROPER TABLE ANCHORING)

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from io import BytesIO
import uuid

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from app.services.drafting_service import DraftingService
from app.services.archive_service import ArchiveService
from app.services.business_service import BusinessService
from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB
from pymongo.database import Database
from bson import ObjectId

router = APIRouter(tags=["drafting"])

# ---------- Pydantic Models ----------
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
    supplier_address: Optional[str] = None
    supplier_vat: Optional[str] = None
    notes: Optional[str] = None

class PurchaseOrderUpdate(PurchaseOrderRequest):
    po_number: str

# ---------- Helper Functions ----------
def generate_po_number() -> str:
    now = datetime.now()
    return f"PO-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

def clean_field(value: Any) -> str:
    """Sanitize field values to prevent 'None' strings in PDF output."""
    if value is None:
        return ""
    if isinstance(value, str):
        if value.lower() == "none" or value.strip() == "":
            return ""
        return value.strip()
    return str(value) if value else ""

def get_business_info(business_service, user_id: str) -> Dict[str, Any]:
    """Fetch business profile using the correct method and field names."""
    try:
        # Use get_or_create_profile (the only method available in BusinessService)
        profile = business_service.get_or_create_profile(user_id)
        
        # Convert to dict if it's a Pydantic model, otherwise use as dict
        if hasattr(profile, 'model_dump'):
            profile_dict = profile.model_dump()
        elif hasattr(profile, 'dict'):
            profile_dict = profile.dict()
        else:
            profile_dict = profile
        
        return {
            "name": profile_dict.get('firm_name', 'Haveri Business'),
            "address": clean_field(profile_dict.get('address', '')),
            "vat": clean_field(profile_dict.get('tax_id', '')),
            "email": clean_field(profile_dict.get('email_public', '')),
            "phone": clean_field(profile_dict.get('phone', '')),
            "vat_rate": profile_dict.get('vat_rate', 18),
        }
    except Exception as e:
        print(f"DEBUG: Profile lookup failed: {e}")
        return {
            "name": "Haveri Business",
            "address": "",
            "vat": "",
            "email": "",
            "phone": "",
            "vat_rate": 18,
        }

def generate_pdf_po(order_data: Dict[str, Any], buyer_info: Dict[str, Any], po_number: str) -> bytes:
    pdf_buffer = BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, topMargin=1.8*cm, bottomMargin=1.8*cm,
                            leftMargin=2.2*cm, rightMargin=2.2*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18,
                                 alignment=TA_CENTER, textColor=colors.HexColor('#1a4d8c'),
                                 spaceAfter=20, fontName='Helvetica-Bold')
    normal_style = ParagraphStyle('NormalStyle', parent=styles['Normal'], fontSize=9,
                                  leading=12, textColor=colors.HexColor('#444444'))
    # Define non-bold style for supplier details (address, VAT, etc.)
    normal_non_bold = ParagraphStyle('NormalNonBold', parent=styles['Normal'], fontSize=9,
                                     leading=12, textColor=colors.HexColor('#444444'))
    right_style = ParagraphStyle('RightStyle', parent=normal_style, alignment=TA_RIGHT)
    small_style = ParagraphStyle('SmallStyle', parent=styles['Normal'], fontSize=8,
                                 textColor=colors.HexColor('#666666'))
    story = []
    # LOCALIZED TITLE
    story.append(Paragraph("URDHËR BLERJE", title_style))
    story.append(Spacer(1, 0.2*cm))
    
    buyer_text = f"""
    <b>BLERËSI (Kompania juaj)</b><br/>
    {buyer_info.get('name', 'Haveri Business')}<br/>
    {buyer_info.get('address', '')}<br/>
    {f"VAT: {buyer_info.get('vat', '')}" if buyer_info.get('vat') else ""}<br/>
    {f"Tel: {buyer_info.get('phone', '')}" if buyer_info.get('phone') else ""}<br/>
    {f"Email: {buyer_info.get('email', '')}" if buyer_info.get('email') else ""}
    """
    po_details_text = f"""
    <b>URDHËR BLERJE Nr.</b><br/>
    {po_number}<br/><br/>
    <b>Data:</b> {datetime.now().strftime('%d.%m.%Y')}<br/>
    <b>Statusi:</b> Draft<br/>
    """
    buyer_para = Paragraph(buyer_text, normal_style)
    po_para = Paragraph(po_details_text, right_style)
    header_table = Table([[buyer_para, po_para]], colWidths=[8*cm, 8*cm])
    header_table.hAlign = 'LEFT'
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.5*cm))
    
    # TABLE-BASED SUPPLIER BLOCK - With proper table anchoring (hAlign)
    # Clean the supplier data first
    supplier_name = clean_field(order_data.get('supplier_name', ''))
    supplier_address = clean_field(order_data.get('supplier_address', ''))
    supplier_vat = clean_field(order_data.get('supplier_vat', ''))
    
    # Build table rows as a list of lists (each inner list is a separate row)
    supplier_rows = [
        [Paragraph("<b>FURNITORI</b>", normal_style)],
        [Paragraph(supplier_name, normal_style)],  # Supplier name is bold
    ]
    
    if supplier_address:
        supplier_rows.append([Paragraph(supplier_address, normal_non_bold)])
    if supplier_vat:
        supplier_rows.append([Paragraph(f"VAT: {supplier_vat}", normal_non_bold)])
    
    supplier_table = Table(supplier_rows, colWidths=[8*cm])
    
    # CRITICAL: hAlign controls the table's position within the document margins
    # Default is 'CENTER' - setting to 'LEFT' anchors the entire block to the left margin
    supplier_table.hAlign = 'LEFT'
    
    supplier_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),      # Align cell contents left
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 1),         # Tight padding for professional look
    ]))
    
    story.append(supplier_table)
    story.append(Spacer(1, 0.5*cm))
    
    subtotal = order_data['estimated_cost']
    # Use the vat_rate fetched from business profile (default to 18 if not set)
    vat_rate_percent = float(buyer_info.get('vat_rate', 18))
    vat_rate = vat_rate_percent / 100
    vat_amount = subtotal * vat_rate
    grand_total = subtotal + vat_amount
    
    line_items = [
        ["Përshkrimi", "Njësia", "Sasia", "Çmimi/Njësi (€)", "Total (€)"],
        [
            Paragraph(order_data['item_name'], normal_style),
            order_data['unit'],
            str(order_data['quantity']),
            f"{subtotal / order_data['quantity']:.2f}" if order_data['quantity'] > 0 else "0.00",
            f"{subtotal:.2f}"
        ]
    ]
    item_table = Table(line_items, colWidths=[6*cm, 2.5*cm, 2.5*cm, 3*cm, 3*cm])
    item_table.hAlign = 'LEFT'
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1a4d8c')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0,1), (-1,-1), colors.whitesmoke),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 0.3*cm))
    
    totals_data = [
        ["Subtotal:", f"€{subtotal:.2f}"],
        [f"TVSH ({vat_rate_percent:.0f}%):", f"€{vat_amount:.2f}"],
        ["TOTAL I PËRGJITHSHËM:", f"€{grand_total:.2f}"]
    ]
    totals_table = Table(totals_data, colWidths=[13*cm, 3*cm])
    totals_table.hAlign = 'LEFT'
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('LINEABOVE', (0,-1), (-1,-1), 1, colors.black),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#e6f0fa')),
        ('TEXTCOLOR', (0,-1), (-1,-1), colors.HexColor('#1a4d8c')),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.5*cm))
    
    terms_text = """
    <b>KUSHTET DHE SHËRBIMET:</b><br/>
    1. Kjo porosi është draft i krijuar nga Inteligjenca Artificiale e Haveri.<br/>
    2. Furnitori duhet të konfirmojë disponueshmërinë brenda 48 orëve.<br/>
    3. Pagesa do të kryhet pas faturimit dhe dorëzimit të mallrave.<br/>
    4. Çdo ankesë për cilësinë e produkteve duhet të bëhet me shkrim brenda 7 ditëve.<br/>
    5. Tatimi dhe detyrimet shtesë paguhen nga blerësi, përveç nëse specifikohet ndryshe.
    """
    story.append(Paragraph(terms_text, small_style))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("<i>Ky dokument është gjeneruar automatikisht nga Haveri Platform.</i>", small_style))
    doc.build(story)
    return pdf_buffer.getvalue()

# ---------- Database Store for Purchase Orders (SYNC) ----------
class PurchaseOrderStore:
    def __init__(self, db: Database):
        self.collection = db.purchase_orders

    def create(self, user_id: str, archive_id: str, po_number: str, order_data: dict) -> None:
        doc = {
            "user_id": ObjectId(user_id),
            "archive_id": ObjectId(archive_id),
            "po_number": po_number,
            "order_data": order_data,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        self.collection.insert_one(doc)

    def get_by_archive_id(self, user_id: str, archive_id: str) -> Optional[dict]:
        doc = self.collection.find_one({
            "user_id": ObjectId(user_id),
            "archive_id": ObjectId(archive_id)
        })
        return doc

    def update(self, user_id: str, archive_id: str, new_order_data: dict) -> None:
        self.collection.update_one(
            {"user_id": ObjectId(user_id), "archive_id": ObjectId(archive_id)},
            {"$set": {"order_data": new_order_data, "updated_at": datetime.utcnow()}}
        )

# ---------- API Endpoints ----------
@router.post("/purchase-order")
async def create_purchase_order(
    order: PurchaseOrderRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    po_number = generate_po_number()
    business_service = BusinessService(db)
    buyer_info = get_business_info(business_service, str(current_user.id))
    order_data = order.dict()
    pdf_bytes = generate_pdf_po(order_data, buyer_info, po_number)
    filename = f"PO_{po_number}_{order.item_name.replace(' ', '_')}.pdf"
    archive_service = ArchiveService(db)
    try:
        archive_item = await archive_service.save_generated_file(
            user_id=str(current_user.id),
            filename=filename,
            file_content=pdf_bytes,
            category="purchase_order",
            title=f"Urdhër Blerje: {order.item_name} (PO-{po_number})",
            case_id=None
        )
        store = PurchaseOrderStore(db)
        store.create(str(current_user.id), str(archive_item.id), po_number, order_data)
        return {
            "status": "created",
            "message": "Purchase order created.",
            "archive_id": str(archive_item.id),
            "po_number": po_number
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create purchase order: {str(e)}")

@router.get("/purchase-order/{archive_id}")
async def get_purchase_order_data(
    archive_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    store = PurchaseOrderStore(db)
    po_doc = store.get_by_archive_id(str(current_user.id), archive_id)
    if not po_doc:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {
        "po_number": po_doc["po_number"],
        "order_data": po_doc["order_data"]
    }

@router.put("/purchase-order/{archive_id}")
async def update_purchase_order(
    archive_id: str,
    update: PurchaseOrderUpdate,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    store = PurchaseOrderStore(db)
    po_doc = store.get_by_archive_id(str(current_user.id), archive_id)
    if not po_doc:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    new_order_data = update.dict(exclude={"po_number"})
    store.update(str(current_user.id), archive_id, new_order_data)
    business_service = BusinessService(db)
    buyer_info = get_business_info(business_service, str(current_user.id))
    pdf_bytes = generate_pdf_po(new_order_data, buyer_info, update.po_number)
    archive_service = ArchiveService(db)
    try:
        filename = f"PO_{update.po_number}_{update.item_name.replace(' ', '_')}.pdf"
        await archive_service.replace_file_content(
            user_id=str(current_user.id),
            archive_id=archive_id,
            new_file_content=pdf_bytes,
            new_filename=filename
        )
        return {
            "status": "updated",
            "message": "Purchase order updated successfully.",
            "archive_id": archive_id,
            "po_number": update.po_number
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update purchase order: {str(e)}")

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "drafting"}