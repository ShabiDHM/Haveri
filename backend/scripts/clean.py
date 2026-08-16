import os
import shutil
from pathlib import Path

# Root folder is Haveri
ROOT_DIR = Path(__file__).resolve().parent.parent.parent

TARGETS = [
    # 1. Backend Endpoints
    "backend/app/api/endpoints/accountant.py",
    "backend/app/api/endpoints/finance.py",
    "backend/app/api/endpoints/finance_wizard.py",
    "backend/app/api/endpoints/inventory.py",
    "backend/app/api/endpoints/calendar.py",
    "backend/app/api/endpoints/daily_briefing.py",
    "backend/app/api/endpoints/drafting.py",
    "backend/app/api/endpoints/laws.py",

    # 2. Backend Models & Modules
    "backend/app/models/finance.py",
    "backend/app/models/inventory.py",
    "backend/app/models/calendar.py",
    "backend/app/modules/finance",

    # 3. Backend Services
    "backend/app/services/accountant_chat_service.py",
    "backend/app/services/accountant_llm_service.py",
    "backend/app/services/accountant_vector_service.py",
    "backend/app/services/calendar_service.py",
    "backend/app/services/daily_briefing_service.py",
    "backend/app/services/finance_service.py",
    "backend/app/services/inventory_service.py",
    "backend/app/services/drafting_service.py",
    "backend/app/services/spreadsheet_service.py",

    # 4. Frontend Insights & Tabs
    "frontend/src/components/business/insights/TaxModule.tsx",
    "frontend/src/components/business/insights/StockModule.tsx",
    "frontend/src/components/business/insights/SmartAgendaCard.tsx",
    "frontend/src/components/business/insights/ForensicAccountantModal.tsx",
    "frontend/src/components/business/FinanceTab.tsx",
    "frontend/src/components/business/InventoryTab.tsx",
    "frontend/src/components/business/LegalDraftingTab.tsx",
    "frontend/src/components/business/TransactionImporter.tsx",
    "frontend/src/components/business/finance",
    "frontend/src/components/business/inventory",

    # 5. Frontend Modals
    "frontend/src/components/business/modals/PosModal.tsx",
    "frontend/src/components/business/modals/RecipeModal.tsx",
    "frontend/src/components/business/modals/ExpenseModal.tsx",
    "frontend/src/components/business/modals/InvoiceModal.tsx",
    "frontend/src/components/business/modals/InventoryItemModal.tsx",
    "frontend/src/components/business/modals/InventoryImportModal.tsx",
    "frontend/src/components/business/modals/EditPurchaseOrderModal.tsx",

    # 6. Frontend Pages & Hooks
    "frontend/src/pages/FinanceWizardPage.tsx",
    "frontend/src/pages/CalendarPage.tsx",
    "frontend/src/pages/DraftingPage.tsx",
    "frontend/src/pages/LawArticlePage.tsx",
    "frontend/src/pages/LawOverviewPage.tsx",
    "frontend/src/pages/LawSearchPage.tsx",
    "frontend/src/pages/LawViewerPage.tsx",
    "frontend/src/hooks/useFinanceData.ts",
    "frontend/src/hooks/useFiscal.ts",
    "frontend/src/hooks/useInventoryData.ts"
]

def clean():
    print(f"[*] Starting cleanup in: {ROOT_DIR}")
    deleted = 0

    for relative_path in TARGETS:
        full_path = ROOT_DIR / relative_path
        if full_path.exists():
            if full_path.is_dir():
                shutil.rmtree(full_path, ignore_errors=True)
                print(f"[DELETED FOLDER] {relative_path}")
            else:
                full_path.unlink(missing_ok=True)
                print(f"[DELETED FILE]   {relative_path}")
            deleted += 1

    print("=" * 60)
    print(f"[SUCCESS] Removed {deleted} redundant files/folders.")
    print("[*] Ready to build the Kosovo Intelligence Engine!")
    print("=" * 60)

if __name__ == "__main__":
    clean()