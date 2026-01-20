# FILE: backend/app/services/spreadsheet_service.py
# PHOENIX PROTOCOL - REVISION V10 (STRUCTURED AI INSIGHT)
# 1. AI ENHANCEMENT: Re-engineered the LLM prompt to request a structured JSON output with distinct fields for a summary, primary risk, and key recommendation.
# 2. DATA STRUCTURE: The function now returns a nested `ai_summary` object, providing the frontend with richer, more actionable intelligence.
# 3. ROBUSTNESS: Added JSON parsing with a fallback to the old method to ensure the system remains stable even if the LLM fails to return valid JSON.

import pandas as pd
import io
import os
import re
import base64
import json
from app.core.config import settings
from openai import OpenAI
from typing import Dict, Any, List, Tuple

def _get_client() -> OpenAI | None:
    """Helper to initialize and return an OpenAI client."""
    api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.getenv('OPENAI_API_KEY')
    base_url = getattr(settings, 'OPENAI_BASE_URL', "https://api.openai.com/v1")
    if not api_key:
        return None
    return OpenAI(api_key=str(api_key), base_url=base_url)

def analyze_scanned_image(file_contents: bytes) -> Dict[str, Any]:
    """
    Uses a vision model to perform OCR on an image of a financial document,
    converts it to a CSV string, and then analyzes it.
    """
    client = _get_client()
    if not client:
        return {"error": "Gabim Konfigurimi: Mungon çelësi API."}

    model_name = getattr(settings, 'OPENAI_MODEL', "gpt-4o")
    
    base64_image = base64.b64encode(file_contents).decode('utf-8')

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert OCR and data extraction agent. Your task is to analyze an image of a financial document (like a bank statement or invoice list) and convert its tabular data into a clean, standard CSV format. Use commas as delimiters. Include a header row. Respond ONLY with the raw CSV data and nothing else."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Please extract the data from this financial document into CSV format."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=2000,
        )
        
        csv_data_string = response.choices[0].message.content
        if not csv_data_string or not isinstance(csv_data_string, str):
             return {"error": "AI nuk arriti të nxirrte të dhëna nga imazhi."}

        csv_data_string = csv_data_string.strip().replace("```csv", "").replace("```", "").strip()
        csv_bytes = csv_data_string.encode('utf-8')

        return analyze_financial_spreadsheet(file_contents=csv_bytes, filename="skanim.csv")

    except Exception as e:
        print(f"Image Analysis Error: {e}")
        return {"error": f"Analiza e imazhit dështoi: {str(e)}"}

def analyze_financial_spreadsheet(file_contents: bytes, filename: str) -> Dict[str, Any]:
    try:
        client = _get_client()
        if not client:
            return {"error": "Gabim Konfigurimi: Mungon çelësi API."}
        
        model_name = getattr(settings, 'OPENAI_MODEL', "gpt-4o")

        # 1. LOAD DATA
        if filename.endswith('.csv'):
            try:
                df = pd.read_csv(io.BytesIO(file_contents))
                if len(df.columns) < 2:
                    file_contents_copy = io.BytesIO(file_contents) 
                    df = pd.read_csv(file_contents_copy, sep=';')
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_contents), sep=';', encoding='latin1')
        else:
            df = pd.read_excel(io.BytesIO(file_contents))

        df.columns = df.columns.astype(str).str.strip()
        
        # 2. SMART COLUMN DETECTION
        date_col, amount_col = smart_detect_columns(df)

        if not amount_col:
            return {"error": "Nuk u gjet asnjë kolonë për 'Vlerën' ose 'Shumën'. Ju lutemi kontrolloni titujt e skedarit."}

        # 3. NORMALIZE DATA
        def clean_currency(val):
            val = str(val)
            val = re.sub(r'[^\d.,-]', '', val) 
            if not val: return 0
            if ',' in val and '.' in val:
                if val.rfind(',') > val.rfind('.'): val = val.replace('.', '').replace(',', '.')
                else: val = val.replace(',', '')
            elif ',' in val: val = val.replace(',', '.')
            try: return float(val)
            except: return 0

        df[amount_col] = df[amount_col].apply(clean_currency)

        has_dates = False
        if date_col:
            df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')
            has_dates = True

        # 4. STATISTICS
        total_sum = float(df[amount_col].sum())
        avg_transaction = float(df[amount_col].mean())
        transaction_count = int(len(df))

        # 5. ANOMALY DETECTION
        anomalies: List[Dict[str, Any]] = []
        suspicious_round = df[(df[amount_col] > 50) & (df[amount_col] % 50 == 0) & (df[amount_col] != 0)]
        for idx, row in suspicious_round.head(3).iterrows():
            anomalies.append({
                "type": "Numër i Rrumbullakët", "severity": "medium",
                "description": f"Rreshti {idx}: Shumë e plotë prej {row[amount_col]:.2f} (Dyshim për vlerësim/manipulim)",
                "row_id": int(idx)
            })
        if has_dates and date_col:
            weekend_tx = df[df[date_col].dt.dayofweek >= 5]
            for idx, row in weekend_tx.head(3).iterrows():
                try:
                    anomalies.append({
                        "type": "Aktivitet në Fundjavë", "severity": "low",
                        "description": f"Rreshti {idx}: Transaksion i kryer në fundjavë ({row[date_col].strftime('%Y-%m-%d')})",
                        "row_id": int(idx)
                    })
                except: continue
        if transaction_count > 5:
            cutoff = df[amount_col].std() * 3
            outliers = df[df[amount_col] > (avg_transaction + cutoff)]
            for idx, row in outliers.head(3).iterrows():
                 anomalies.append({
                    "type": "Vlerë e Jashtëzakonshme", "severity": "high",
                    "description": f"Rreshti {idx}: Shuma {row[amount_col]:.2f} është jashtëzakonisht e lartë krahasuar me mesataren.",
                    "row_id": int(idx)
                })

        # 6. CHART DATA
        chart_data = []
        if has_dates and date_col:
            df['month_year'] = df[date_col].dt.to_period('M')
            monthly = df.groupby('month_year')[amount_col].sum()
            chart_data = [{"label": str(period), "value": float(val)} for period, val in monthly.items()]
            chart_data.sort(key=lambda x: x['label'])
        else:
            bins = [0, 100, 500, 1000, 5000, float('inf')]
            labels = ['<100', '100-500', '500-1k', '1k-5k', '5k+']
            if df[amount_col].max() > 0:
                df['category'] = pd.cut(df[amount_col], bins=bins, labels=labels)
                counts = df['category'].value_counts()
                chart_data = [{"label": str(label), "value": int(counts.get(label, 0))} for label in labels]
        
        # 7. STRUCTURED AI NARRATIVE
        system_prompt = """
        You are a Financial Forensics Expert AI. Analyze the provided data and return a JSON object in Albanian.
        The JSON object must have three keys: "summary", "primary_risk", and "key_recommendation".
        - summary: A 2-sentence executive summary of the financial data.
        - primary_risk: A 1-sentence description of the most significant financial risk identified.
        - key_recommendation: A 1-sentence, actionable recommendation to mitigate the risk or improve financial health.
        Respond ONLY with the raw JSON object.
        """
        user_content = f"File: {filename}, Total Rows: {transaction_count}, Total Sum: {total_sum:.2f}, Anomalies Found: {len(anomalies)}, Anomaly Examples: {[a['description'] for a in anomalies[:2]]}"

        response = client.chat.completions.create(
            model=model_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.4
        )
        
        ai_narrative_structured = {"summary": "Analiza përfundoi.", "primary_risk": "Nuk u identifikua asnjë rrezik specifik.", "key_recommendation": "Vazhdoni monitorimin e rregullt."}
        try:
            raw_response = response.choices[0].message.content
            if raw_response:
                ai_narrative_structured = json.loads(raw_response)
        except (json.JSONDecodeError, IndexError) as e:
            print(f"AI JSON parsing failed, falling back to old method. Error: {e}")
            # Fallback logic if JSON fails
            fallback_narrative = response.choices[0].message.content or "Analiza përfundoi por përmbledhja nuk mund të gjenerohej."
            ai_narrative_structured["summary"] = fallback_narrative


        return {
            "status": "success", 
            "ai_summary": ai_narrative_structured,
            "stats": { "total_sum": total_sum, "transaction_count": transaction_count, "average": avg_transaction },
            "chart_data": chart_data, "anomalies": anomalies
        }
    except Exception as e:
        print(f"Analysis Error: {e}")
        return {"error": f"Analiza dështoi: {str(e)}"}

def smart_detect_columns(df: pd.DataFrame) -> Tuple[Any, Any]:
    cols = df.columns
    cols_lower = cols.str.lower()
    date_keywords = ['date', 'data', 'time', 'koha', 'day', 'dita']
    high_priority_amount = ['total', 'shuma', 'amount', 'vlera', 'sum', 'balance']
    low_priority_amount = ['price', 'cmimi', 'cost', 'vlere', 'credit', 'debit']
    ignore = ['id', 'code', 'zip', 'phone', 'vat', 'tvsh', 'qty', 'sasia']
    date_col, amount_col, best_amount_score = None, None, -1
    for i, col_name in enumerate(cols_lower):
        if not date_col and any(k in col_name for k in date_keywords): date_col = cols[i]
        if any(bad in col_name for bad in ignore): continue
        score = 0
        if any(k in col_name for k in high_priority_amount): score = 2
        elif any(k in col_name for k in low_priority_amount): score = 1
        if score > best_amount_score: best_amount_score = score; amount_col = cols[i]
    if not date_col:
        for col in cols:
            sample = df[col].dropna().head(20).astype(str)
            if sample.empty: continue
            try:
                converted = pd.to_datetime(sample, dayfirst=True, errors='coerce')
                if converted.notna().mean() > 0.8: date_col = col; break
            except: continue
    if not amount_col:
        max_mean = -1
        for col in cols:
            if col == date_col: continue
            try:
                numeric_series = pd.to_numeric(df[col].astype(str).str.replace(r'[^\d,.-]', '', regex=True).str.replace(',', '.'), errors='coerce')
                if numeric_series.notna().mean() > 0.8:
                    current_mean = numeric_series.mean()
                    if current_mean > max_mean: max_mean = current_mean; amount_col = col
            except: continue
    return date_col, amount_col