# FILE: backend/app/services/email_service.py
# PHOENIX PROTOCOL - EMAIL SYSTEM V4.2 (TEAM INVITATION)
# 1. FEATURE: Added 'send_invitation_email' to handle multi-tenant invites.
# 2. BRANDING: Updated BRAND_NAME to 'Haveri AI' for consistency.
# 3. INTEGRITY: Preserved existing support notification functionality.

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")

BRAND_COLOR = "#3b82f6" # PHOENIX: Updated to new blue
BRAND_NAME = "Haveri AI" # PHOENIX: Updated Brand Name

def _create_html_wrapper(title: str, body_content: str) -> str:
    """
    Wraps content in a professional HTML Email Template.
    """
    from datetime import datetime
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }}
            .header {{ background-color: {BRAND_COLOR}; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 25px; background-color: #ffffff; }}
            .footer {{ background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }}
            .label {{ font-weight: bold; color: #4b5563; }}
            .value {{ color: #111827; }}
            .button {{ display: inline-block; background-color: {BRAND_COLOR}; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>{BRAND_NAME}</h2>
                <p>{title}</p>
            </div>
            <div class="content">
                {body_content}
            </div>
            <div class="footer">
                &copy; {datetime.now().year} {BRAND_NAME}. Të gjitha të drejtat e rezervuara.<br>
                Prishtinë, Republika e Kosovës
            </div>
        </div>
    </body>
    </html>
    """

def send_email_sync(to_email: str, subject: str, html_content: str):
    """
    Core function to send an email via SMTP (Synchronous).
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("⚠️ Email configuration missing. Email not sent.")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg['From'] = f"{BRAND_NAME} <{SMTP_USER}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"✅ Email sent to {to_email}: {subject}")

    except Exception as e:
        logger.error(f"❌ Failed to send email: {e}")

# --- EXISTING FUNCTION (UNCHANGED) ---
def send_support_notification_sync(data: dict):
    if not ADMIN_EMAIL:
        logger.warning("Admin email not configured.")
        return

    subject = f"🔔 Kërkesë e Re për Mbështetje: {data.get('first_name')} {data.get('last_name')}"
    
    content = f"""
    <p>Përshëndetje Admin,</p>
    <p>Keni marrë një mesazh të ri nga forma e kontaktit:</p>
    <br>
    <p><span class="label">Dërguesi:</span> <span class="value">{data.get('first_name')} {data.get('last_name')}</span></p>
    <p><span class="label">Email:</span> <span class="value">{data.get('email')}</span></p>
    <p><span class="label">Telefoni:</span> <span class="value">{data.get('phone', 'N/A')}</span></p>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
    <p><span class="label">Mesazhi:</span></p>
    <blockquote style="background: #f3f4f6; padding: 15px; border-left: 4px solid {BRAND_COLOR}; margin: 0;">
        {data.get('message')}
    </blockquote>
    """
    
    final_html = _create_html_wrapper("Qendra e Ndihmës", content)
    
    send_email_sync(ADMIN_EMAIL, subject, final_html)

# --- PHOENIX: NEW INVITATION FUNCTION ---
def send_invitation_email_sync(to_email: str, owner_name: str, invite_link: str):
    """
    Formats and sends the Team Invitation email.
    """
    subject = f"Ftesë për Bashkëpunim në {BRAND_NAME}"
    
    content = f"""
    <p>Përshëndetje,</p>
    <p>Jeni ftuar nga <strong>{owner_name}</strong> për t'u bashkuar me hapësirën e punës në Haveri AI.</p>
    <p>Për të pranuar ftesën dhe për të konfiguruar llogarinë tuaj, ju lutemi klikoni butonin më poshtë:</p>
    <br>
    <a href="{invite_link}" class="button">Prano Ftesën & Krijo Fjalëkalimin</a>
    <br><br>
    <p>Nëse nuk e prisnit këtë ftesë, ju lutemi injorojeni këtë email.</p>
    <p>Faleminderit!</p>
    """
    
    final_html = _create_html_wrapper("Ftesë për Bashkëpunim", content)
    
    send_email_sync(to_email, subject, final_html)