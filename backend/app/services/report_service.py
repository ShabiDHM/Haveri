# FILE: backend/app/services/report_service.py
# PHOENIX PROTOCOL - REPORT SERVICE V5.8 (FULL RESTORATION)
# 1. CRITICAL FIX: Restored the full body of the 'generate_invoice_pdf' function, fixing the Pylance return type error.
# 2. INTEGRITY: This file is now complete, type-safe, and production-ready.

import io
import os
import structlog
import requests
import re
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, Flowable
from reportlab.platypus import Image as ReportLabImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from pymongo.database import Database
from typing import List, Optional
from bson import ObjectId
from xml.sax.saxutils import escape
from PIL import Image as PILImage

from app.models.finance import InvoiceInDB
from app.services import storage_service

logger = structlog.get_logger(__name__)

# --- STYLES & CONSTANTS ---
COLOR_PRIMARY_TEXT = HexColor("#111827")
COLOR_SECONDARY_TEXT = HexColor("#6B7280")
COLOR_BORDER = HexColor("#E5E7EB")
BRAND_COLOR_DEFAULT = "#4f46e5"

STYLES = getSampleStyleSheet()

STYLES.add(ParagraphStyle(name='H1', parent=STYLES['h1'], fontSize=22, textColor=COLOR_PRIMARY_TEXT, alignment=TA_LEFT, fontName='Helvetica-Bold'))
STYLES.add(ParagraphStyle(name='MetaLabel', parent=STYLES['Normal'], fontSize=8, textColor=COLOR_SECONDARY_TEXT, alignment=TA_RIGHT))
STYLES.add(ParagraphStyle(name='MetaValue', parent=STYLES['Normal'], fontSize=10, textColor=COLOR_PRIMARY_TEXT, alignment=TA_RIGHT, spaceBefore=2))
STYLES.add(ParagraphStyle(name='AddressLabel', parent=STYLES['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=COLOR_PRIMARY_TEXT, spaceBottom=6))
STYLES.add(ParagraphStyle(name='AddressText', parent=STYLES['Normal'], fontSize=9, textColor=COLOR_SECONDARY_TEXT, leading=14))
STYLES.add(ParagraphStyle(name='TableHeaderLeft', parent=STYLES['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=white, alignment=TA_LEFT))
STYLES.add(ParagraphStyle(name='TableHeaderRight', parent=STYLES['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=white, alignment=TA_RIGHT))
STYLES.add(ParagraphStyle(name='TableCell', parent=STYLES['Normal'], fontSize=9, textColor=COLOR_PRIMARY_TEXT))
STYLES.add(ParagraphStyle(name='TableCellRight', parent=STYLES['TableCell'], alignment=TA_RIGHT))
STYLES.add(ParagraphStyle(name='TotalLabel', parent=STYLES['TableCellRight']))
STYLES.add(ParagraphStyle(name='TotalValue', parent=STYLES['TableCellRight'], fontName='Helvetica-Bold'))
STYLES.add(ParagraphStyle(name='NotesLabel', parent=STYLES['AddressLabel'], spaceBefore=10))
STYLES.add(ParagraphStyle(name='FirmName', parent=STYLES['h3'], alignment=TA_RIGHT, fontSize=14, spaceAfter=4, textColor=COLOR_PRIMARY_TEXT))
STYLES.add(ParagraphStyle(name='FirmMeta', parent=STYLES['Normal'], alignment=TA_RIGHT, fontSize=9, textColor=COLOR_SECONDARY_TEXT, leading=12))

# --- TRANSLATIONS ---
TRANSLATIONS = {
    "sq": {
        "invoice_title": "FATURA", "invoice_num": "Nr.", "date_issue": "Data e Lëshimit", "date_due": "Afati i Pagesës",
        "status": "Statusi", "from": "Nga", "to": "Për", "desc": "Përshkrimi", "qty": "Sasia", "price": "Çmimi",
        "total": "Totali", "subtotal": "Nëntotali", "tax": "TVSH (18%)", "notes": "Shënime",
        "footer_gen": "Dokument i gjeneruar elektronikisht nga", "page": "Faqe", 
        "lbl_address": "Adresa:", "lbl_tel": "Tel:", "lbl_email": "Email:", "lbl_web": "Web:", "lbl_nui": "NUI:",
        "po_title": "POROSI", "po_num": "Porosia Nr.", "supplier": "Furnitori", "item": "Artikulli", "est_cost": "Kosto e Vlerësuar"
    }
}

def _get_text(key: str, lang: str = "sq") -> str:
    return TRANSLATIONS.get(lang, TRANSLATIONS["sq"]).get(key, key)

def _get_branding(db: Database, user_id: str) -> dict:
    try:
        try: oid = ObjectId(user_id)
        except: oid = user_id
        
        profile = db.business_profiles.find_one({"user_id": oid})
        if not profile: profile = db.business_profiles.find_one({"user_id": str(user_id)})

        if profile:
            return {
                "firm_name": profile.get("firm_name", "Haveri AI"), "address": profile.get("address", ""),
                "email_public": profile.get("email_public", ""), "phone": profile.get("phone", ""),
                "branding_color": profile.get("branding_color", BRAND_COLOR_DEFAULT), "logo_url": profile.get("logo_url"),
                "logo_storage_key": profile.get("logo_storage_key"), "website": profile.get("website", ""),
                "nui": profile.get("tax_id", "") 
            }
    except Exception as e:
        logger.error(f"Branding fetch failed: {e}")
    return {"firm_name": "Haveri AI", "branding_color": BRAND_COLOR_DEFAULT}

def _process_image_bytes(data: bytes) -> Optional[io.BytesIO]:
    try:
        img = PILImage.open(io.BytesIO(data))
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            bg = PILImage.new("RGB", img.size, (255, 255, 255)); bg.paste(img, mask=img.split()[3]) 
            img = bg
        elif img.mode != 'RGB': img = img.convert('RGB')
        out_buffer = io.BytesIO(); img.save(out_buffer, format='JPEG', quality=95); out_buffer.seek(0)
        return out_buffer
    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        return None

def _fetch_logo_buffer(url: Optional[str], storage_key: Optional[str] = None) -> Optional[io.BytesIO]:
    if storage_key:
        try:
            stream = storage_service.get_file_stream(storage_key)
            if hasattr(stream, 'read'): return _process_image_bytes(stream.read())
            if isinstance(stream, bytes): return _process_image_bytes(stream)
        except Exception: pass
    if url and url.startswith("http"):
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200: return _process_image_bytes(response.content)
        except Exception: pass
    return None

def _header_footer_generic(c: canvas.Canvas, doc: BaseDocTemplate, branding: dict, lang: str):
    c.saveState()
    c.setStrokeColor(COLOR_BORDER); c.line(15 * mm, 15 * mm, 195 * mm, 15 * mm)
    c.setFont('Helvetica', 8); c.setFillColor(COLOR_SECONDARY_TEXT)
    footer = f"{_get_text('footer_gen', lang)} {branding.get('firm_name', 'Haveri AI')} | {datetime.now().strftime('%d/%m/%Y')}"
    c.drawString(15 * mm, 10 * mm, footer)
    c.drawRightString(195 * mm, 10 * mm, f"{_get_text('page', lang)} {doc.page}")
    c.restoreState()

def _build_doc(buffer: io.BytesIO, branding: dict, lang: str) -> BaseDocTemplate:
    doc = BaseDocTemplate(buffer, pagesize=A4, leftMargin=15*mm, rightMargin=15*mm, topMargin=15*mm, bottomMargin=25*mm)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='normal')
    template = PageTemplate(id='main', frames=[frame], onPage=lambda c, d: _header_footer_generic(c, d, branding, lang))
    doc.addPageTemplates([template])
    return doc

def generate_purchase_order_pdf(po_data: dict, db: Database, user_id: str, lang: str = "sq") -> io.BytesIO:
    branding = _get_branding(db, user_id)
    buffer = io.BytesIO()
    doc = _build_doc(buffer, branding, lang)
    brand_color = HexColor(branding.get("branding_color", BRAND_COLOR_DEFAULT))
    Story: List[Flowable] = []

    logo_buffer = _fetch_logo_buffer(branding.get("logo_url"), branding.get("logo_storage_key"))
    logo_obj = Spacer(0, 0)
    if logo_buffer:
        try:
            p_img = PILImage.open(logo_buffer); iw, ih = p_img.size; aspect = ih / float(iw)
            w = 40 * mm; h = w * aspect
            if h > 30 * mm: h = 30 * mm; w = h / aspect
            logo_buffer.seek(0); logo_obj = ReportLabImage(logo_buffer, width=w, height=h); logo_obj.hAlign = 'LEFT'
        except: pass
    
    firm_name = str(branding.get("firm_name") or "Haveri AI")
    firm_content: List[Flowable] = [Paragraph(firm_name, STYLES['FirmName'])]
    for key, label_key in [("address", "lbl_address"), ("nui", "lbl_nui"), ("email_public", "lbl_email")]:
        val = branding.get(key)
        if val: firm_content.append(Paragraph(f"<b>{_get_text(label_key, lang)}</b> {val}", STYLES['FirmMeta']))

    Story.append(Table([[logo_obj, firm_content]], colWidths=[100*mm, 80*mm], style=[('VALIGN', (0,0), (-1,-1), 'TOP')]))
    Story.append(Spacer(1, 15*mm))

    po_number = str(int(datetime.now().timestamp()))[-6:]
    meta_data = [[Paragraph(f"{_get_text('po_num', lang)} {po_number}", STYLES['MetaValue'])], [Spacer(1, 3*mm)], [Paragraph(_get_text('date_issue', lang), STYLES['MetaLabel'])], [Paragraph(datetime.now().strftime("%d/%m/%Y"), STYLES['MetaValue'])]]
    Story.append(Table([[Paragraph(_get_text('po_title', lang), STYLES['H1']), Table(meta_data, style=[('ALIGN', (0,0), (-1,-1), 'RIGHT')])]], colWidths=[100*mm, 80*mm]))
    Story.append(Spacer(1, 15*mm))

    supplier_name = po_data.get('supplier_name', 'Furnitor i Papërcaktuar')
    supplier_content = [Paragraph(f"<b>{supplier_name}</b>", STYLES['AddressText'])]
    t_addr = Table([[Paragraph(_get_text('to', lang), STYLES['AddressLabel']), supplier_content]], colWidths=[30*mm, 150*mm], style=[('VALIGN', (0,0), (-1,-1), 'TOP')])
    Story.append(t_addr)
    Story.append(Spacer(1, 10*mm))

    headers = [Paragraph(_get_text('item', lang), STYLES['TableHeaderLeft']), Paragraph(_get_text('qty', lang), STYLES['TableHeaderRight']), Paragraph(_get_text('est_cost', lang), STYLES['TableHeaderRight'])]
    data = [headers, [Paragraph(po_data.get("item_name", "N/A"), STYLES['TableCell']), Paragraph(f"{po_data.get('quantity', 0)} {po_data.get('unit', '')}", STYLES['TableCellRight']), Paragraph(f"€{po_data.get('estimated_cost', 0.0):,.2f}", STYLES['TableCellRight'])]]
    
    t_items = Table(data, colWidths=[110*mm, 35*mm, 35*mm])
    t_items.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), brand_color), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('LINEBELOW', (0,-1), (-1,-1), 1, COLOR_BORDER), ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8)]))
    Story.append(t_items)

    doc.build(Story)
    buffer.seek(0)
    return buffer

def generate_invoice_pdf(invoice: InvoiceInDB, db: Database, user_id: str, lang: str = "sq") -> io.BytesIO:
    branding = _get_branding(db, user_id)
    buffer = io.BytesIO()
    doc = _build_doc(buffer, branding, lang)
    brand_color = HexColor(branding.get("branding_color", BRAND_COLOR_DEFAULT))
    Story: List[Flowable] = []

    logo_buffer = _fetch_logo_buffer(branding.get("logo_url"), branding.get("logo_storage_key"))
    logo_obj = Spacer(0, 0)
    if logo_buffer:
        try:
            p_img = PILImage.open(logo_buffer); iw, ih = p_img.size; aspect = ih / float(iw)
            w = 40 * mm; h = w * aspect
            if h > 30 * mm: h = 30 * mm; w = h / aspect
            logo_buffer.seek(0); logo_obj = ReportLabImage(logo_buffer, width=w, height=h); logo_obj.hAlign = 'LEFT'
        except: pass
    
    firm_name = str(branding.get("firm_name") or "Haveri AI")
    firm_content: List[Flowable] = [Paragraph(firm_name, STYLES['FirmName'])]
    for key, label_key in [("address", "lbl_address"), ("nui", "lbl_nui"), ("email_public", "lbl_email"), ("phone", "lbl_tel"), ("website", "lbl_web")]:
        val = branding.get(key)
        if val: firm_content.append(Paragraph(f"<b>{_get_text(label_key, lang)}</b> {val}", STYLES['FirmMeta']))

    Story.append(Table([[logo_obj, firm_content]], colWidths=[100*mm, 80*mm], style=[('VALIGN', (0,0), (-1,-1), 'TOP')]))
    Story.append(Spacer(1, 15*mm))

    meta_data = [ [Paragraph(f"{_get_text('invoice_num', lang)} {invoice.invoice_number}", STYLES['MetaValue'])], [Spacer(1, 3*mm)], [Paragraph(_get_text('date_issue', lang), STYLES['MetaLabel'])], [Paragraph(invoice.issue_date.strftime("%d/%m/%Y"), STYLES['MetaValue'])], [Spacer(1, 2*mm)], [Paragraph(_get_text('date_due', lang), STYLES['MetaLabel'])], [Paragraph(invoice.due_date.strftime("%d/%m/%Y"), STYLES['MetaValue'])]]
    Story.append(Table([[Paragraph(_get_text('invoice_title', lang), STYLES['H1']), Table(meta_data, colWidths=[80*mm], style=[('ALIGN', (0,0), (-1,-1), 'RIGHT')])]], colWidths=[100*mm, 80*mm], style=[('VALIGN', (0,0), (-1,-1), 'TOP')]))
    Story.append(Spacer(1, 15*mm))

    client_content: List[Flowable] = [Paragraph(f"<b>{invoice.client_name}</b>", STYLES['AddressText'])]
    c_address = getattr(invoice, 'client_address', ''); c_city = getattr(invoice, 'client_city', '')
    full_address = f"{c_address}, {c_city}" if c_address and c_city else c_address or c_city
    if full_address: client_content.append(Paragraph(f"<b>{_get_text('lbl_address', lang)}</b> {full_address}", STYLES['AddressText']))
    if getattr(invoice, 'client_tax_id', ''): client_content.append(Paragraph(f"<b>{_get_text('lbl_nui', lang)}</b> {invoice.client_tax_id}", STYLES['AddressText']))
    if getattr(invoice, 'client_email', ''): client_content.append(Paragraph(f"<b>{_get_text('lbl_email', lang)}</b> {invoice.client_email}", STYLES['AddressText']))
    if getattr(invoice, 'client_phone', ''): client_content.append(Paragraph(f"<b>{_get_text('lbl_tel', lang)}</b> {invoice.client_phone}", STYLES['AddressText']))
    
    t_addr = Table([[Paragraph(_get_text('to', lang), STYLES['AddressLabel']), client_content]], colWidths=[20*mm, 160*mm], style=[('VALIGN', (0,0), (-1,-1), 'TOP')])
    Story.append(t_addr)
    Story.append(Spacer(1, 10*mm))
    
    headers = [Paragraph(_get_text('desc', lang), STYLES['TableHeaderLeft']), Paragraph(_get_text('qty', lang), STYLES['TableHeaderRight']), Paragraph(_get_text('price', lang), STYLES['TableHeaderRight']), Paragraph(_get_text('total', lang), STYLES['TableHeaderRight'])]
    data = [headers]
    for item in invoice.items:
        data.append([Paragraph(item.description, STYLES['TableCell']), Paragraph(str(item.quantity), STYLES['TableCellRight']), Paragraph(f"€{item.unit_price:,.2f}", STYLES['TableCellRight']), Paragraph(f"€{item.total:,.2f}", STYLES['TableCellRight'])])
    
    t_items = Table(data, colWidths=[90*mm, 25*mm, 30*mm, 35*mm])
    t_items.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), brand_color), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('LINEBELOW', (0,-1), (-1,-1), 1, COLOR_BORDER), ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8), ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor("#FFFFFF"), HexColor("#F9FAFB")])]))
    Story.append(t_items)

    totals_data = [[Paragraph(_get_text('subtotal', lang), STYLES['TotalLabel']), Paragraph(f"€{invoice.subtotal:,.2f}", STYLES['TotalLabel'])], [Paragraph(_get_text('tax', lang), STYLES['TotalLabel']), Paragraph(f"€{invoice.tax_amount:,.2f}", STYLES['TotalLabel'])], [Paragraph(f"<b>{_get_text('total', lang)}</b>", STYLES['TotalValue']), Paragraph(f"<b>€{invoice.total_amount:,.2f}</b>", STYLES['TotalValue'])]]
    t_totals = Table(totals_data, colWidths=[40*mm, 35*mm], style=[('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('LINEABOVE', (0, 2), (1, 2), 1.5, COLOR_PRIMARY_TEXT), ('TOPPADDING', (0, 2), (1, 2), 6)])
    Story.append(Table([["", t_totals]], colWidths=[110*mm, 75*mm], style=[('ALIGN', (1,0), (1,0), 'RIGHT')]))

    if invoice.notes:
        Story.append(Spacer(1, 10*mm))
        Story.append(Paragraph(_get_text('notes', lang), STYLES['NotesLabel']))
        Story.append(Paragraph(escape(invoice.notes).replace('\n', '<br/>'), STYLES['AddressText']))

    doc.build(Story)
    buffer.seek(0)
    return buffer