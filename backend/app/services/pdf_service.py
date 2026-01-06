# FILE: backend/app/services/pdf_service.py
# PHOENIX PROTOCOL - ROBUST EXCEL HANDLING V4.1
# 1. FIX: Added a "Guard Clause" to check if 'workbook.active' returns a valid sheet.
# 2. LOGIC: If an Excel file is empty or has no active sheet, the function now gracefully exits instead of crashing.
# 3. STATUS: This resolves the Pylance 'reportOptionalMemberAccess' error and makes the pipeline resilient to empty Excel files.

import io
import os
import tempfile
import shutil
import csv
import openpyxl
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from fastapi import UploadFile
from typing import Tuple, Optional
from PIL import Image as PILImage 

from . import conversion_service

class PDFProcessor:
    @staticmethod
    async def process_and_brand_pdf(
        file: UploadFile, case_id: Optional[str] = "N/A"
    ) -> Tuple[bytes, str]:
        original_ext = os.path.splitext(file.filename or ".tmp")[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=original_ext) as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
            source_path = tmp_file.name

        await file.seek(0)
        
        base_name = os.path.splitext(file.filename or "dokument")[0]
        final_pdf_name = f"{base_name}.pdf"

        converted_pdf_path = None
        try:
            converted_pdf_path = conversion_service.convert_to_pdf(source_path)
            with open(converted_pdf_path, "rb") as f:
                pdf_bytes = f.read()
            
            branded_pdf_bytes = PDFProcessor._apply_branding(pdf_bytes, str(case_id))
            return branded_pdf_bytes, final_pdf_name
        finally:
            if os.path.exists(source_path): os.remove(source_path)
            if converted_pdf_path and os.path.exists(converted_pdf_path): os.remove(converted_pdf_path)

    @staticmethod
    async def convert_upload_to_pdf(file: UploadFile) -> Tuple[io.BytesIO, str]:
        content = await file.read()
        await file.seek(0)
        pdf_bytes, new_name = PDFProcessor.convert_bytes_to_pdf(content, file.filename or "doc")
        return io.BytesIO(pdf_bytes), new_name

    @staticmethod
    def convert_bytes_to_pdf(content: bytes, filename: str) -> Tuple[bytes, str]:
        ext = filename.split('.')[-1].lower() if '.' in filename else ""
        base_name = os.path.splitext(filename)[0]
        new_filename = f"{base_name}.pdf"

        text_content_for_pdf = ""

        if ext == "csv":
            try:
                text_stream = io.StringIO(content.decode('utf-8', errors='ignore'))
                reader = csv.reader(text_stream)
                lines = [f"Rreshti {i+1}: {', '.join(row)}" for i, row in enumerate(reader)]
                text_content_for_pdf = "\n".join(lines)
            except Exception as e:
                print(f"CSV to Text conversion failed: {e}")
                return content, filename
        
        elif ext == "xlsx":
            try:
                workbook = openpyxl.load_workbook(io.BytesIO(content))
                sheet = workbook.active
                
                # PHOENIX FIX: Guard against empty or invalid Excel files.
                if not sheet:
                    print("XLSX conversion failed: No active sheet found.")
                    return content, filename
                
                lines = []
                for i, row in enumerate(sheet.iter_rows(values_only=True), 1):
                    str_row = [str(cell) for cell in row if cell is not None]
                    if str_row:
                        lines.append(f"Rreshti {i}: {', '.join(str_row)}")
                text_content_for_pdf = "\n".join(lines)
            except Exception as e:
                print(f"XLSX to Text conversion failed: {e}")
                return content, filename
        
        elif ext == "txt":
            text_content_for_pdf = content.decode('utf-8', errors='replace')

        if text_content_for_pdf:
            try:
                pdf_buffer = io.BytesIO()
                c = canvas.Canvas(pdf_buffer, pagesize=A4)
                text_obj = c.beginText(15 * mm, 280 * mm)
                text_obj.setFont("Helvetica", 9)
                
                c.setFont("Helvetica-Bold", 12)
                c.drawString(15 * mm, 290 * mm, f"Dokument: {base_name}")
                c.line(15 * mm, 288 * mm, 195 * mm, 288 * mm)
                
                for line in text_content_for_pdf.split('\n'):
                    for i in range(0, len(line), 100):
                        text_obj.textLine(line[i:i+100])
                    if text_obj.getY() < 20 * mm:
                        c.drawText(text_obj)
                        c.showPage()
                        text_obj = c.beginText(15 * mm, 280 * mm)
                        text_obj.setFont("Helvetica", 9)
                
                c.drawText(text_obj)
                c.save()
                return pdf_buffer.getvalue(), new_filename
            except Exception as e:
                print(f"Text bytes to PDF conversion failed: {e}")
                return content, filename

        if ext in ['jpg', 'jpeg', 'png', 'webp', 'bmp']:
            try:
                img = PILImage.open(io.BytesIO(content))
                if img.mode in ("RGBA", "P"): img = img.convert("RGB")
                pdf_buffer = io.BytesIO()
                img.save(pdf_buffer, "PDF", resolution=100.0)
                return pdf_buffer.getvalue(), new_filename
            except Exception as e:
                print(f"Image bytes conversion failed: {e}")
                return content, filename

        return content, filename

    @staticmethod
    def _apply_branding(pdf_bytes: bytes, case_id: str) -> bytes:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        writer = PdfWriter()
        for i, page in enumerate(reader.pages):
            watermark_stream = io.BytesIO()
            c = canvas.Canvas(watermark_stream, pagesize=page.mediabox)
            c.setFont("Helvetica", 8); c.setFillColor(colors.grey)
            c.drawCentredString(float(page.mediabox.width) / 2, 1 * cm, f"Rasti: {case_id} | Faqja {i + 1}")
            c.save()
            watermark_pdf = PdfReader(watermark_stream)
            page.merge_page(watermark_pdf.pages[0])
            writer.add_page(page)
        
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

pdf_service = PDFProcessor()