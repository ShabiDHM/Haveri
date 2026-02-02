# FILE: backend/scripts/harvest_lawyers.py
# PHOENIX PROTOCOL - THE HARVESTER V1.1 (TYPE FIX)
# 1. FIX: Changed response.content to response.text to resolve Pylance error.
# 2. FEATURE: Loops through all major Kosovo regions.

import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import random
import os

# CONFIGURATION
BASE_URL = "https://oak-ks.org/avokatet"
OUTPUT_FILE = "lawyers_kosovo_campaign.csv"

# We loop through these parameters to cover the whole country
REGIONS = [
    "Prishtin", "Prizren", "Pej", "Gjilan", 
    "Ferizaj", "Gjakov", "Mitrovic"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def clean_text(text):
    """Removes extra whitespace and newlines."""
    if text:
        return " ".join(text.split())
    return ""

def extract_field(soup_obj, keyword):
    """Finds text inside paragraphs containing specific keywords."""
    # Search in all <p> tags
    for p in soup_obj.find_all('p'):
        text = p.get_text()
        if keyword in text:
            # Split by keyword (e.g., "E-mail:") and take the rest
            parts = text.split(keyword, 1)
            if len(parts) > 1:
                return clean_text(parts[1])
    return "N/A"

def scrape_region(region_name):
    print(f"--- Harvesting Region: {region_name} ---")
    
    # URL structure based on analysis
    url = f"{BASE_URL}?avokatet=&regjioni={region_name}"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        if response.status_code != 200:
            print(f"Error accessing {region_name}: Status {response.status_code}")
            return []

        # PHOENIX FIX: Use .text instead of .content to satisfy Type Checker
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Target the specific container class from your screenshot
        lawyer_cards = soup.find_all("div", class_="mres1")
        
        region_data = []
        
        for card in lawyer_cards:
            # The 'bb' div contains the text details
            info_box = card.find("div", class_="bb")
            if not info_box:
                continue

            # 1. Name
            name_tag = info_box.find("h5")
            name = clean_text(name_tag.text) if name_tag else "Unknown"

            # 2. Details
            city = extract_field(info_box, "Qyteti:")
            address = extract_field(info_box, "Adresa:")
            email = extract_field(info_box, "E-mail:")
            mobile = extract_field(info_box, "Mob:")

            # 3. Validation
            # If email is missing or generic placeholder, mark it
            if "@" not in email or len(email) < 5:
                email = "" 

            lawyer = {
                "Emri Mbiemri": name,
                "Email": email,
                "Telefoni": mobile,
                "Qyteti": city,
                "Adresa": address,
                "Regjioni": region_name
            }
            
            region_data.append(lawyer)

        print(f"Found {len(region_data)} lawyers in {region_name}.")
        return region_data

    except Exception as e:
        print(f"Critical error scraping {region_name}: {e}")
        return []

def main():
    print("🚀 Initializing The Harvester...")
    all_lawyers = []

    for region in REGIONS:
        data = scrape_region(region)
        all_lawyers.extend(data)
        
        # Polite delay to respect server limits
        delay = random.uniform(1.5, 3.0)
        time.sleep(delay)

    # Export
    if all_lawyers:
        # Create DataFrame
        df = pd.DataFrame(all_lawyers)
        
        # Remove duplicates (sometimes lawyers are listed in multiple regions)
        df.drop_duplicates(subset=['Email', 'Emri Mbiemri'], keep='first', inplace=True)
        
        # Filter rows with valid emails for the campaign
        valid_contacts = df[df['Email'] != ""]
        
        print(f"\n✅ Extraction Complete.")
        print(f"Total Raw Leads: {len(df)}")
        print(f"Valid Email Leads: {len(valid_contacts)}")
        
        # Save to CSV (utf-8-sig is crucial for Albanian chars in Excel)
        output_path = os.path.join(os.getcwd(), OUTPUT_FILE)
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        
        print(f"💾 Database saved to: {output_path}")
    else:
        print("❌ No data harvested. Check internet connection or website structure.")

if __name__ == "__main__":
    main()