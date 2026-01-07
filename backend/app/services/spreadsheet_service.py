# FILE: backend/app/services/spreadsheet_service.py
# PHOENIX PROTOCOL - REVISION V3 (DEEP SCAN INTELLIGENCE)
# 1. FEATURE: 'Deep Scan' detects columns by content, not just headers.
# 2. LOGIC: Fallback mechanisms to guess Date and Amount columns if headers are missing/bad.

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

        # 1. LOAD DATA
        if filename.endswith('.csv'):
            # Try different encodings for CSVs (Excel often uses latin1 or cp1252)
            try:
                df = pd.read_csv(io.BytesIO(file_contents))
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_contents), encoding='latin1')
        else:
            df = pd.read_excel(io.BytesIO(file_contents))

        # Basic Cleanup
        df.columns = df.columns.astype(str).str.strip()
        
        # 2. SMART COLUMN DETECTION (The "Brain")
        date_col, amount_col = smart_detect_columns(df)

        if not amount_col:
            # If we still can't find an amount, we can't analyze finance.
            return {"error": "I analyzed the file but couldn't identify which column contains the Money/Amount. Please check the file."}

        # 3. NORMALIZE DATA
        # Clean Amount: Remove currency symbols, commas, spaces
        df[amount_col] = df[amount_col].astype(str).str.replace(r'[^\d.-]', '', regex=True)
        # Convert to numeric, turn errors (text) into NaN and then fill with 0
        df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)

        # Clean Date (if detected)
        has_dates = False
        if date_col:
            # Flexible date parsing
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            # Drop rows where date is NaT (Not a Time) only if column was meant to be dates
            has_dates = True

        # 4. PERFORM STATISTICAL ANALYSIS
        total_sum = float(df[amount_col].sum())
        avg_transaction = float(df[amount_col].mean())
        transaction_count = int(len(df))

        # 5. ANOMALY DETECTION
        anomalies: List[Dict[str, Any]] = []

        # Rule A: Round Numbers (e.g., 500.00)
        round_number_mask = (df[amount_col] > 50) & (df[amount_col] % 50 == 0) & (df[amount_col] != 0)
        suspicious_round = df[round_number_mask]
        for idx, row in suspicious_round.head(3).iterrows():
            anomalies.append({
                "type": "Round Number",
                "severity": "medium",
                "description": f"Row {idx}: Exact round amount of {row[amount_col]:.2f} (Possible estimate)",
                "row_id": int(idx)
            })

        # Rule B: Weekend Transactions
        if has_dates and date_col:
            weekend_mask = df[date_col].dt.dayofweek >= 5 
            weekend_tx = df[weekend_mask]
            for idx, row in weekend_tx.head(3).iterrows():
                date_str = row[date_col].strftime('%Y-%m-%d')
                anomalies.append({
                    "type": "Weekend Activity",
                    "severity": "low",
                    "description": f"Row {idx}: Transaction on a weekend ({date_str})",
                    "row_id": int(idx)
                })

        # Rule C: Outliers (High Value)
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
            # Group and ensure we convert to string/float for JSON serialization
            monthly = df.groupby('month_year')[amount_col].sum()
            chart_data = [{"label": str(period), "value": float(val)} for period, val in monthly.items()]
            # Sort by date
            chart_data.sort(key=lambda x: x['label'])
        else:
            # Distribution bins
            bins = [0, 100, 500, 1000, 5000, float('inf')]
            labels = ['<100', '100-500', '500-1k', '1k-5k', '5k+']
            # We must handle cases where all data is 0 or negative
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
    """
    Tries to find Date and Amount columns using Headers first, then Data Sampling.
    """
    # 1. PREPARE HEADERS
    cols = df.columns
    cols_lower = cols.str.lower()
    
    # KEYWORDS
    date_keywords = ['date', 'data', 'time', 'koha', 'day', 'dita']
    amount_keywords = ['amount', 'shuma', 'total', 'price', 'vlere', 'cost', 'cmimi', 'credit', 'debit', 'balance']
    ignore_amount_keywords = ['id', 'code', 'zip', 'phone', 'year', 'tax_rate']

    date_col = None
    amount_col = None

    # 2. HEADER SEARCH (Level 1)
    for i, col_name in enumerate(cols_lower):
        if not date_col and any(k in col_name for k in date_keywords):
            date_col = cols[i]
        if not amount_col and any(k in col_name for k in amount_keywords):
            if not any(bad in col_name for bad in ignore_amount_keywords):
                amount_col = cols[i]

    # 3. CONTENT SEARCH (Level 2 - Deep Scan)
    # If header search failed, look at the actual data values
    
    # Find Date by Content
    if not date_col:
        for col in cols:
            # Take a sample of 20 non-null values
            sample = df[col].dropna().head(20).astype(str)
            if sample.empty: continue
            
            # Check if pandas can parse most of them as dates
            try:
                # We expect date parsing to succeed for at least 80% of the sample
                converted = pd.to_datetime(sample, errors='coerce')
                success_rate = converted.notna().mean()
                if success_rate > 0.8:
                    date_col = col
                    break
            except:
                continue

    # Find Amount by Content
    if not amount_col:
        best_candidate = None
        max_mean = -1

        for col in cols:
            if col == date_col: continue # Don't check the date column
            
            # Check if column name suggests it's NOT an amount (like ID)
            col_lower = str(col).lower()
            if any(bad in col_lower for bad in ignore_amount_keywords):
                continue

            # Try converting to numbers
            try:
                # Remove currency symbols for testing
                clean_series = df[col].astype(str).str.replace(r'[^\d.-]', '', regex=True)
                numeric_series = pd.to_numeric(clean_series, errors='coerce')
                
                # Must be mostly numbers
                if numeric_series.notna().mean() > 0.8:
                    # Calculate mean value. IDs usually have steady increments, Amounts vary.
                    # Or simply: Largest mean usually indicates "Total" or "Amount" vs "Qty" or "ID"
                    current_mean = numeric_series.mean()
                    
                    if current_mean > max_mean:
                        max_mean = current_mean
                        best_candidate = col
            except:
                continue
        
        if best_candidate:
            amount_col = best_candidate

    return date_col, amount_col