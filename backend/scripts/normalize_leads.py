# FILE: backend/scripts/normalize_leads.py
# PHOENIX PROTOCOL - DATA NORMALIZER V1.0
# INPUT: lawyers_kosovo_campaign.csv
# OUTPUT: campaign_READY_leads.csv

import pandas as pd
import re
import os

# CONFIGURATION
INPUT_FILE = "lawyers_kosovo_campaign.csv"
OUTPUT_FILE = "campaign_READY_leads.csv"

def clean_phone(phone_str):
    """
    Standardizes Kosovo phone numbers to International format (+383).
    Handles: 044, 049, 045, +377, +386 prefixes.
    """
    if not isinstance(phone_str, str):
        return ""
    
    # Remove all non-numeric characters except +
    clean = re.sub(r'[^\d+]', '', phone_str)
    
    # Fix standard Kosovo mobile prefixes
    if clean.startswith('04'):
        return '+383' + clean[1:] # Turns 044123123 -> +38344123123
    
    # Fix old codes if present (IPKO/Vala legacy)
    if clean.startswith('+3774'):
        return '+383' + clean[4:]
    if clean.startswith('+3864'):
        return '+383' + clean[4:]
        
    return clean

def split_name(full_name):
    """Splits full name into First and Last."""
    parts = full_name.strip().split(' ', 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return parts[0], ""

def main():
    input_path = os.path.join(os.getcwd(), INPUT_FILE)
    
    if not os.path.exists(input_path):
        print(f"❌ Error: Could not find {INPUT_FILE}. Make sure you ran the harvester first!")
        return

    print("🧹 Normalizing Data...")
    
    # Load Data
    df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} raw records.")

    # 1. REMOVE rows with no email (useless for email campaign)
    df = df[df['Email'].notna() & (df['Email'] != "")]
    print(f"Records after removing empty emails: {len(df)}")

    # 2. SPLIT Names (Create 'First Name' and 'Last Name')
    # This allows for personalization: "Hello {First Name},"
    names_split = df['Emri Mbiemri'].apply(split_name)
    df['First Name'] = names_split.apply(lambda x: x[0].capitalize())
    df['Last Name'] = names_split.apply(lambda x: x[1].capitalize())

    # 3. FORMAT Phone Numbers
    df['Mobile_Clean'] = df['Telefoni'].apply(clean_phone)

    # 4. LOWERCASE Emails (Cleaner look)
    df['Email'] = df['Email'].str.lower().str.strip()

    # 5. REORDER Columns for Mailchimp/CRM
    # Most tools prefer: Email, First Name, Last Name, Phone...
    final_df = df[[
        'Email', 
        'First Name', 
        'Last Name', 
        'Mobile_Clean', 
        'Emri Mbiemri', 
        'Qyteti', 
        'Regjioni',
        'Adresa'
    ]]

    # Save
    output_path = os.path.join(os.getcwd(), OUTPUT_FILE)
    final_df.to_csv(output_path, index=False, encoding='utf-8-sig')

    print("\n✅ NORMALIZATION COMPLETE.")
    print(f"Output saved to: {OUTPUT_FILE}")
    print("This file is ready for upload to Mailchimp/Brevo/HubSpot.")

if __name__ == "__main__":
    main()