# FILE: backend/app/models/finance.py
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from .common import PyObjectId

# --- IMPORT BATCH (AUDIT TRAIL) ---
class ImportBatch(BaseModel):
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: str
    business_id: Optional[str] = None
    filename: str
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "processing"
    row_count: int = 0
    total_amount: float = 0.0
    mapping_snapshot: Dict[str, str] = {}
    
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

# --- POS TRANSACTION (OPERATIONAL DATA) ---
class Transaction(BaseModel):
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: str
    business_id: Optional[str] = None
    batch_id: Optional[str] = None
    date: datetime
    amount: float
    type: str = "income"
    category: str = "Uncategorized"
    description: str
    quantity: float = 1.0
    unit_price: Optional[float] = None
    original_row_data: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

# --- INVOICE MODELS ---
class InvoiceItem(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    total: float = 0.0

class InvoiceBase(BaseModel):
    invoice_number: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_phone: Optional[str] = None
    client_city: Optional[str] = None
    client_tax_id: Optional[str] = None
    client_website: Optional[str] = None
    issue_date: datetime = Field(default_factory=datetime.utcnow)
    due_date: datetime = Field(default_factory=datetime.utcnow)
    items: List[InvoiceItem] = []
    notes: Optional[str] = None
    subtotal: float = 0.0
    tax_rate: float = 0.0
    tax_amount: float = 0.0
    total_amount: float = 0.0
    currency: str = "EUR"
    status: str = "DRAFT"
    is_locked: bool = False
    related_case_id: Optional[str] = None

class InvoiceCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_phone: Optional[str] = None
    client_city: Optional[str] = None
    client_tax_id: Optional[str] = None
    client_website: Optional[str] = None
    items: List[InvoiceItem]
    tax_rate: float = 0.0
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    related_case_id: Optional[str] = None

class InvoiceUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_phone: Optional[str] = None
    client_city: Optional[str] = None
    client_tax_id: Optional[str] = None
    client_website: Optional[str] = None
    items: Optional[List[InvoiceItem]] = None
    tax_rate: Optional[float] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    is_locked: Optional[bool] = None
    related_case_id: Optional[str] = None

class InvoiceInDB(InvoiceBase):
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class InvoiceOut(InvoiceInDB):
    id: PyObjectId = Field(alias="_id", serialization_alias="id", default=None)

# --- EXPENSE MODELS ---
class ExpenseBase(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    currency: str = "EUR"
    receipt_url: Optional[str] = None
    related_case_id: Optional[str] = None
    is_locked: bool = False

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    related_case_id: Optional[str] = None
    is_locked: Optional[bool] = None

class ExpenseInDB(ExpenseBase):
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class ExpenseOut(ExpenseInDB):
    id: PyObjectId = Field(alias="_id", serialization_alias="id", default=None)

# --- ANALYTICS MODELS ---
class SalesTrendPoint(BaseModel):
    date: str
    amount: float

class TopProductItem(BaseModel):
    product_name: str
    total_quantity: float
    total_revenue: float

class AnalyticsDashboardData(BaseModel):
    total_revenue_period: float
    total_transactions_period: int
    sales_trend: List[SalesTrendPoint]
    top_products: List[TopProductItem]

class CaseFinancialSummary(BaseModel):
    case_id: str
    case_title: str
    case_number: str
    total_billed: float
    total_expenses: float
    net_balance: float

# --- TAX MODELS ---
class TaxCalculation(BaseModel):
    period_month: int
    period_year: int
    total_sales_gross: float
    total_purchases_gross: float
    vat_collected: float
    vat_deductible: float
    net_obligation: float
    currency: str = "EUR"
    status: str
    regime: str = "SMALL_BUSINESS"
    tax_rate_applied: str = "9%" 
    description: str = "Tatimi"

class AuditIssue(BaseModel):
    id: str
    severity: str
    message: str
    related_item_id: Optional[str] = None
    item_type: Optional[str] = None

class WizardState(BaseModel):
    calculation: TaxCalculation
    issues: List[AuditIssue]
    ready_to_close: bool