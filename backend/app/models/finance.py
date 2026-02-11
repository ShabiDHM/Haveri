# FILE: backend/app/models/finance.py
# PHOENIX PROTOCOL - FINANCE MODELS V11.5 (ANALYTICS SYNC)
# 1. ADDED: total_cogs_period to AnalyticsDashboardData for real dashboard reporting.
# 2. STATUS: 100% Complete.

from pydantic import BaseModel, Field, ConfigDict, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema
from typing import List, Optional, Dict, Any, Annotated
from datetime import datetime
from bson import ObjectId

# --- PYOBJECTID ---
class _ObjectIdPydanticAnnotation:
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type: Any, _handler: GetJsonSchemaHandler) -> core_schema.CoreSchema:
        def validate_from_str(value: str) -> ObjectId: return ObjectId(value)
        from_str_schema = core_schema.chain_schema([core_schema.str_schema(), core_schema.no_info_plain_validator_function(validate_from_str)])
        return core_schema.json_or_python_schema(json_schema=from_str_schema, python_schema=core_schema.union_schema([core_schema.is_instance_schema(ObjectId), from_str_schema]), serialization=core_schema.plain_serializer_function_ser_schema(lambda instance: str(instance)))
    @classmethod
    def __get_pydantic_json_schema__(cls, _core_schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler) -> JsonSchemaValue:
        return handler(core_schema.str_schema())

PyObjectId = Annotated[ObjectId, _ObjectIdPydanticAnnotation]

# --- PARTNER MODELS ---
class PartnerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    type: str = "CLIENT"

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    type: Optional[str] = None

class PartnerInDB(PartnerBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    organization_id: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class PartnerOut(PartnerInDB):
    id: Optional[PyObjectId] = Field(alias="_id", serialization_alias="id", default=None)

# --- TRANSACTION MODELS ---
class Transaction(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    organization_id: Optional[PyObjectId] = None
    date: datetime
    amount: float
    description: str
    product_name: Optional[str] = None 
    category: str = "Uncategorized"
    status: str = "PAID"
    source: str = "IMPORT"
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class PosTransactionOut(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", serialization_alias="id", default=None)
    product_name: Optional[str] = Field(alias="description", default="Produkt i panjohur")
    quantity: Optional[float] = Field(default=1.0)
    total_price: Optional[float] = Field(alias="amount", default=0.0)
    transaction_date: datetime = Field(alias="date")
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
    client_tax_id: Optional[str] = None
    issue_date: datetime = Field(default_factory=datetime.utcnow)
    due_date: datetime = Field(default_factory=datetime.utcnow)
    items: List[InvoiceItem] = []
    subtotal: float = 0.0
    tax_rate: float = 18.0
    tax_amount: float = 0.0
    total_amount: float = 0.0
    status: str = "DRAFT"
    is_locked: bool = False

class InvoiceCreate(InvoiceBase): pass
class InvoiceUpdate(BaseModel):
    client_name: Optional[str] = None
    status: Optional[str] = None
    is_locked: Optional[bool] = None

class InvoiceInDB(InvoiceBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    organization_id: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class InvoiceOut(InvoiceInDB):
    id: Optional[PyObjectId] = Field(alias="_id", serialization_alias="id", default=None)

# --- EXPENSE MODELS ---
class ExpenseBase(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    receipt_url: Optional[str] = None
    is_locked: bool = False

class ExpenseCreate(ExpenseBase): pass
class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[float] = None
    is_locked: Optional[bool] = None

class ExpenseInDB(ExpenseBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    organization_id: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class ExpenseOut(ExpenseInDB):
    id: Optional[PyObjectId] = Field(alias="_id", serialization_alias="id", default=None)

# --- ANALYTICS MODELS ---
class SalesTrendPoint(BaseModel):
    date: str
    amount: float
    count: int = 0

class TopProductItem(BaseModel):
    product_name: str
    total_quantity: float
    total_revenue: float

class AnalyticsDashboardData(BaseModel):
    total_revenue_period: float
    total_transactions_period: int
    total_cogs_period: float = 0.0 # PHOENIX: Added for real calculation
    sales_trend: List[SalesTrendPoint]
    top_products: List[TopProductItem]

class CaseFinancialSummary(BaseModel):
    case_id: str
    total_billed: float
    total_expenses: float
    net_balance: float

# --- TAX WIZARD MODELS ---
class TaxCalculation(BaseModel):
    period_month: int
    period_year: int
    total_sales_gross: float
    total_purchases_gross: float
    vat_collected: float
    vat_deductible: float
    net_obligation: float
    currency: str = "EUR"
    status: str = "DRAFT"
    regime: str = "STANDARD"
    tax_rate_applied: str = "18%"
    description: str = "Llogaritja e TVSH-së"

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