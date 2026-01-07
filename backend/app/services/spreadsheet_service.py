# FILE: backend/app/services/spreadsheet_service.py
# PHOENIX PROTOCOL - REVISION V5 (PRIORITY SCORING)
# 1. FEATURE: Column Priority Scoring (Totals > Unit Prices).
# 2. FIX: Explicit support for 'Vlera' (Albanian) and 'EUR' suffixes.

import pandas as pd
import io
import os
import re
import numpy as np
from app.core.config import settings
from openai import OpenAI
from typing import Dict, Any, List, Tuple

def analyze_financial_spreadsheet(file_contents: bytes, filename: str) -> Dict[str, Any]:
    try:
        # --- SAFE CLIENT INITIALIZATION ---
        api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.getenv('OPENAI_API_KEY')
        if not api_key:
            return {"error": "Server Configuration Error: OPENAI_API_KEY is missing."}
        client = OpenAI(api_key=str(api_key))
        # ----------------------------------

        # 1. LOAD DATA (SMART READ)
        if filename.endswith('.csv'):
            try:
                # Method 1: Try default (comma)
                df = pd.read_csv(io.BytesIO(file_contents))
                
                # Method 2: If only 1 column found, try Semicolon (European Standard)
                if len(df.columns) < 2:
                    file_contents_copy = io.BytesIO(file_contents) # Reset pointer
                    df = pd.read_csv(file_contents_copy, sep=';')
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_contents), sep=';', encoding='latin1')
        else:
            df = pd.read_excel(io.BytesIO(file_contents))

        # Basic Cleanup
        df.columns = df.columns.astype(str).str.strip()
        
        # 2. SMART COLUMN DETECTION
        date_col, amount_col = smart_detect_columns(df)

        if not amount_col:
            return {"error": "Could not identify an Amount/Total column. Ensure your file has headers like 'Vlera', 'Shuma', or 'Total'."}

        # 3. NORMALIZE DATA
        # Clean numeric data
        def clean_currency(val):
            val = str(val)
            val = re.sub(r'[^\d.,-]', '', val) # Keep numbers, dots, commas, minus
            if not val: return 0
            
            # Smart European Handling
            if ',' in val and '.' in val:
                if val.rfind(',') > val.rfind('.'): # 1.000,00
                    val = val.replace('.', '').replace(',', '.')
                else: # 1,000.00
                    val = val.replace(',', '')
            elif ',' in val: # 10,50
                val = val.replace(',', '.')
            
            try: return float(val)
            except: return 0

        df[amount_col] = df[amount_col].apply(clean_currency)

        # Clean Date (if detected)
        has_dates = False
        if date_col:
            df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')
            has_dates = True

        # 4. PERFORM STATISTICAL ANALYSIS
        total_sum = float(df[amount_col].sum())
        avg_transaction = float(df[amount_col].mean())
        transaction_count = int(len(df))

        # 5. ANOMALY DETECTION
        anomalies: List[Dict[str, Any]] = []

        # Rule A: Round Numbers
        round_number_mask = (df[amount_col] > 50) & (df[amount_col] % 50 == 0) & (df[amount_col] != 0)
        suspicious_round = df[round_number_mask]
        for idx, row in suspicious_round.head(3).iterrows():
            anomalies.append({
                "type": "Round Number",
                "severity": "medium",
                "description": f"Row {idx}: Exact round amount of {row[amount_col]:.2f}",
                "row_id": int(idx)
            })

        # Rule B: Weekend Transactions
        if has_dates and date_col:
            weekend_mask = df[date_col].dt.dayofweek >= 5 
            weekend_tx = df[weekend_mask]
            for idx, row in weekend_tx.head(3).iterrows():
                try:
                    date_str = row[date_col].strftime('%Y-%m-%d')
                    anomalies.append({
                        "type": "Weekend Activity",
                        "severity": "low",
                        "description": f"Row {idx}: Transaction on a weekend ({date_str})",
                        "row_id": int(idx)
                    })
                except: continue

        # Rule C: Outliers
        if transaction_count > 5:
            std_dev = df[amount_col].std()
            cutoff = std_dev * 3
            outliers = df[df[amount_col] > (avg_transaction + cutoff)]
            for idx, row in outliers.head(3).iterrows():
                 anomalies.append({
                    "type": "Statistical Outlier",
                    "severity": "high",
                    "description": f"Row {idx}: Amount {row[amount_col]:.2f} is unusually high.",
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

        # 7. AI NARRATIVE
        system_prompt = """
        You are an expert Financial Forensics Auditor.
        Analyze the provided data summary.
        Write a SHORT, punchy executive summary (max 3 sentences).
        Highlight the total volume and any specific red flags found.
        """
        
        user_content = f"""
        Filename: {filename}
        Rows: {transaction_count}
        Total: {total_sum:.2f}
        Anomalies Found: {len(anomalies)}
        Top Anomalies: {[a['description'] for a in anomalies[:2]]}
        """

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.3
        )
        
        narrative = response.choices[0].message.content

        return {
            "status": "success",
            "summary": narrative,
            "stats": {
                "total_sum": total_sum,
                "transaction_count": transaction_count,
                "average": avg_transaction
            },
            "chart_data": chart_data,
            "anomalies": anomalies
        }

    except Exception as e:
        print(f"Analysis Error: {e}")
        return {"error": f"Analysis failed: {str(e)}"}

def smart_detect_columns(df: pd.DataFrame) -> Tuple[Any, Any]:
    # 1. PREPARE
    cols = df.columns
    cols_lower = cols.str.lower()
    
    date_keywords = ['date', 'data', 'time', 'koha', 'day', 'dita']
    
    # Priority Scoring for Amounts
    # We prefer 'Total' over 'Price' to avoid picking Unit Prices
    high_priority_amount = ['total', 'shuma', 'amount', 'vlera', 'sum', 'balance']
    low_priority_amount = ['price', 'cmimi', 'cost', 'vlere', 'credit', 'debit']
    
    ignore = ['id', 'code', 'zip', 'phone', 'vat', 'tvsh', 'qty', 'sasia']

    date_col = None
    amount_col = None
    best_amount_score = -1

    # 2. HEADER SCORING LOOP
    for i, col_name in enumerate(cols_lower):
        # Date Logic
        if not date_col and any(k in col_name for k in date_keywords):
            date_col = cols[i]
        
        # Amount Logic
        if any(bad in col_name for bad in ignore):
            continue

        score = 0
        if any(k in col_name for k in high_priority_amount):
            score = 2
        elif any(k in col_name for k in low_priority_amount):
            score = 1
        
        if score > best_amount_score:
            best_amount_score = score
            amount_col = cols[i]

    # 3. CONTENT SEARCH FALLBACK (If Headers Failed)
    if not date_col:
        for col in cols:
            sample = df[col].dropna().head(20).astype(str)
            if sample.empty: continue
            try:
                converted = pd.to_datetime(sample, dayfirst=True, errors='coerce')
                if converted.notna().mean() > 0.8:
                    date_col = col
                    break
            except: continue

    if not amount_col:
        # Fallback to finding the numeric column with highest mean (likely the total)
        max_mean = -1
        for col in cols:
            if col == date_col: continue
            try:
                clean_series = df[col].astype(str).str.replace(r'[^\d,.-]', '', regex=True)
                clean_series = clean_series.str.replace(',', '.')
                numeric_series = pd.to_numeric(clean_series, errors='coerce')
                
                if numeric_series.notna().mean() > 0.8:
                    current_mean = numeric_series.mean()
                    if current_mean > max_mean:
                        max_mean = current_mean
                        amount_col = col
            except: continue

    return date_col, amount_col