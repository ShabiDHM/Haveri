# FILE: backend/app/services/spreadsheet_service.py
# PHOENIX PROTOCOL - REVISION V2 (SAFE BOOT)
# 1. FIX: Moved OpenAI Client initialization inside the function to prevent startup crashes.
# 2. LOGIC: Added explicit check for API Key before attempting analysis.

import pandas as pd
import io
import os
import re
from app.core.config import settings
from openai import OpenAI
from typing import Dict, Any, List

def analyze_financial_spreadsheet(file_contents: bytes, filename: str) -> Dict[str, Any]:
    """
    Orchestrates the analysis:
    1. Load Data (Pandas)
    2. Detect Columns (Heuristics)
    3. Run Math/Stats
    4. Run Anomaly Detection
    5. Generate AI Narrative
    """
    try:
        # --- SAFE CLIENT INITIALIZATION ---
        # We initialize here so the server doesn't crash on startup if key is missing
        api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            return {"error": "Server Configuration Error: OPENAI_API_KEY is missing."}
            
        client = OpenAI(api_key=str(api_key))
        # ----------------------------------

        # 1. LOAD DATA
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_contents))
        else:
            df = pd.read_excel(io.BytesIO(file_contents))

        # 2. DETECT COLUMNS (The "Smart" Part)
        # Normalize headers to lowercase for search
        df.columns = df.columns.str.lower().str.strip() # type: ignore
        
        # Keyword mapping for Albanian/English
        date_keywords = ['data', 'date', 'koha', 'time', 'dita']
        amount_keywords = ['shuma', 'amount', 'vlere', 'price', 'total', 'cmimi', 'credit', 'debit']
        desc_keywords = ['pershkrimi', 'description', 'detaje', 'details', 'artikulli', 'subjekti']

        date_col = next((col for col in df.columns if any(k in col for k in date_keywords)), None)
        amount_col = next((col for col in df.columns if any(k in col for k in amount_keywords)), None)
        desc_col = next((col for col in df.columns if any(k in col for k in desc_keywords)), None)

        if not amount_col:
            return {"error": "Could not detect an 'Amount' or 'Shuma' column. Please ensure headers are clear."}

        # 3. CLEAN & PREPARE DATA
        # Clean Amount: Remove currency symbols, commas using raw string for regex
        df[amount_col] = df[amount_col].astype(str).str.replace(r'[\$,€,]', '', regex=True)
        df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)

        # Clean Date (if exists)
        has_dates = False
        if date_col:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            has_dates = True

        # 4. PERFORM STATISTICAL ANALYSIS (The "Hard Math")
        total_sum = float(df[amount_col].sum())
        avg_transaction = float(df[amount_col].mean())
        max_transaction = float(df[amount_col].max())
        transaction_count = int(len(df))

        # 5. ANOMALY DETECTION ENGINE
        anomalies: List[Dict[str, Any]] = []

        # Rule A: Round Numbers (often indicate estimates or fraud)
        # Check if amounts > 100 are perfectly divisible by 100 (e.g. 500.00, 1000.00)
        round_number_mask = (df[amount_col] > 100) & (df[amount_col] % 100 == 0)
        suspicious_round = df[round_number_mask]
        
        for idx, row in suspicious_round.head(5).iterrows():
            anomalies.append({
                "type": "Round Number",
                "severity": "medium",
                "description": f"Row {int(str(idx)) + 1}: Unusual round amount of {row[amount_col]:.2f}",
                "row_id": int(str(idx)) + 1
            })

        # Rule B: Weekend Transactions (if dates exist)
        if has_dates and date_col:
            # 5=Sat, 6=Sun. Using type ignore for pandas dt accessor
            weekend_mask = df[date_col].dt.dayofweek >= 5 # type: ignore
            weekend_tx = df[weekend_mask]
            for idx, row in weekend_tx.head(5).iterrows():
                date_str = row[date_col].strftime('%Y-%m-%d') # type: ignore
                anomalies.append({
                    "type": "Weekend Activity",
                    "severity": "low",
                    "description": f"Row {int(str(idx)) + 1}: Transaction recorded on a weekend ({date_str})",
                    "row_id": int(str(idx)) + 1
                })

        # Rule C: Statistical Outliers (Z-Score > 3)
        if transaction_count > 10:
            std_dev = df[amount_col].std()
            cutoff = std_dev * 3
            outliers = df[df[amount_col] > (avg_transaction + cutoff)]
            for idx, row in outliers.head(5).iterrows():
                 anomalies.append({
                    "type": "Statistical Outlier",
                    "severity": "high",
                    "description": f"Row {int(str(idx)) + 1}: Amount {row[amount_col]:.2f} is significantly higher than average.",
                    "row_id": int(str(idx)) + 1
                })

        # 6. GENERATE CHART DATA
        chart_data = []
        if has_dates and date_col:
            # Group by Month
            df['month_year'] = df[date_col].dt.to_period('M') # type: ignore
            monthly = df.groupby('month_year')[amount_col].sum()
            chart_data = [{"label": str(period), "value": float(val)} for period, val in monthly.items()]
        else:
            # Histogram-like distribution (Low, Medium, High)
            bins = [0, 100, 1000, 10000, float('inf')]
            labels = ['<100', '100-1k', '1k-10k', '10k+']
            df['category'] = pd.cut(df[amount_col], bins=bins, labels=labels) # type: ignore
            counts = df['category'].value_counts()
            chart_data = [{"label": label, "value": int(counts.get(label, 0))} for label in labels]

        # 7. GENERATE AI NARRATIVE (The "Soft Skill")
        system_prompt = """
        You are a Senior Financial Analyst. 
        Analyze the provided statistical data from an uploaded spreadsheet.
        Your output must be professional, concise, and business-focused.
        Do not calculate anything yourself; use the provided stats.
        Focus on: Total Volume, Trends, and Flagging the Anomalies found.
        """
        
        user_content = f"""
        File: {filename}
        Total Transactions: {transaction_count}
        Total Volume: {total_sum:.2f}
        Average: {avg_transaction:.2f}
        Anomalies Found: {len(anomalies)}
        
        Top Anomalies: {[a['description'] for a in anomalies[:3]]}
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
        print(f"Spreadsheet Analysis Error: {str(e)}")
        return {"error": f"Failed to analyze file: {str(e)}"}