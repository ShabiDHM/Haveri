# FILE: backend/app/services/spreadsheet_service.py
# PHOENIX PROTOCOL - REVISION V8 (ALBANIAN LOCALIZATION)
# 1. LOCALIZATION: All hardcoded strings and AI prompts converted to Albanian.
# 2. LOGIC: Retains the robust OpenRouter/Priority logic from V7.

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
        # --- OPENROUTER / OPENAI CONNECTION ---
        api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.getenv('OPENAI_API_KEY')
        base_url = getattr(settings, 'OPENAI_BASE_URL', "https://api.openai.com/v1")
        model_name = getattr(settings, 'OPENAI_MODEL', "gpt-4o")

        if not api_key:
            return {"error": "Gabim Konfigurimi: Mungon çelësi API."}
        
        client = OpenAI(api_key=str(api_key), base_url=base_url)
        # --------------------------------------

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

        # 5. ANOMALY DETECTION (TRANSLATED)
        anomalies: List[Dict[str, Any]] = []
        
        # Rule A: Round Numbers
        suspicious_round = df[(df[amount_col] > 50) & (df[amount_col] % 50 == 0) & (df[amount_col] != 0)]
        for idx, row in suspicious_round.head(3).iterrows():
            anomalies.append({
                "type": "Numër i Rrumbullakët", # ALBANIAN
                "severity": "medium",
                "description": f"Rreshti {idx}: Shumë e plotë prej {row[amount_col]:.2f} (Dyshim për vlerësim/manipulim)", # ALBANIAN
                "row_id": int(idx)
            })

        # Rule B: Weekend Transactions
        if has_dates and date_col:
            weekend_tx = df[df[date_col].dt.dayofweek >= 5]
            for idx, row in weekend_tx.head(3).iterrows():
                try:
                    date_str = row[date_col].strftime('%Y-%m-%d')
                    anomalies.append({
                        "type": "Aktivitet në Fundjavë", # ALBANIAN
                        "severity": "low",
                        "description": f"Rreshti {idx}: Transaksion i kryer në fundjavë ({date_str})", # ALBANIAN
                        "row_id": int(idx)
                    })
                except: continue

        # Rule C: Outliers
        if transaction_count > 5:
            cutoff = df[amount_col].std() * 3
            outliers = df[df[amount_col] > (avg_transaction + cutoff)]
            for idx, row in outliers.head(3).iterrows():
                 anomalies.append({
                    "type": "Vlerë e Jashtëzakonshme", # ALBANIAN
                    "severity": "high",
                    "description": f"Rreshti {idx}: Shuma {row[amount_col]:.2f} është jashtëzakonisht e lartë krahasuar me mesataren.", # ALBANIAN
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

        # 7. AI NARRATIVE (TRANSLATED PROMPT)
        system_prompt = """
        Ti je një Ekspert i Forenzikës Financiare dhe Auditues.
        Analizo të dhënat statistikore të mëposhtme nga një skedar financiar.
        
        Detyra jote:
        1. Shkruaj një përmbledhje ekzekutive të shkurtër dhe profesionale në gjuhën SHQIPE (Albanian).
        2. Mos përmend termat teknikë si "DataFrame" apo "Pandas".
        3. Përmend volumin total dhe numrin e transaksioneve.
        4. Thekso anomalitë kryesore nëse ka.
        
        Stili: Profesional, i drejtpërdrejtë, për një pronar biznesi.
        Maksimumi 3 fjali.
        """
        
        user_content = f"""
        Emri i Skedarit: {filename}
        Nr. Rreshtave: {transaction_count}
        Totali: {total_sum:.2f}
        Anomali të gjetura: {len(anomalies)}
        Anomalitë kryesore: {[a['description'] for a in anomalies[:2]]}
        """

        response = client.chat.completions.create(
            model=model_name,
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
        return {"error": f"Analiza dështoi: {str(e)}"}

def smart_detect_columns(df: pd.DataFrame) -> Tuple[Any, Any]:
    cols = df.columns
    cols_lower = cols.str.lower()
    
    date_keywords = ['date', 'data', 'time', 'koha', 'day', 'dita']
    high_priority_amount = ['total', 'shuma', 'amount', 'vlera', 'sum', 'balance']
    low_priority_amount = ['price', 'cmimi', 'cost', 'vlere', 'credit', 'debit']
    ignore = ['id', 'code', 'zip', 'phone', 'vat', 'tvsh', 'qty', 'sasia']

    date_col = None
    amount_col = None
    best_amount_score = -1

    for i, col_name in enumerate(cols_lower):
        if not date_col and any(k in col_name for k in date_keywords):
            date_col = cols[i]
        
        if any(bad in col_name for bad in ignore): continue

        score = 0
        if any(k in col_name for k in high_priority_amount): score = 2
        elif any(k in col_name for k in low_priority_amount): score = 1
        
        if score > best_amount_score:
            best_amount_score = score
            amount_col = cols[i]

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
        max_mean = -1
        for col in cols:
            if col == date_col: continue
            try:
                clean_series = df[col].astype(str).str.replace(r'[^\d,.-]', '', regex=True).str.replace(',', '.')
                numeric_series = pd.to_numeric(clean_series, errors='coerce')
                if numeric_series.notna().mean() > 0.8:
                    current_mean = numeric_series.mean()
                    if current_mean > max_mean:
                        max_mean = current_mean
                        amount_col = col
            except: continue

    return date_col, amount_col