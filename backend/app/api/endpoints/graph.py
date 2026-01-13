# FILE: backend/app/api/endpoints/graph.py
# PHOENIX PROTOCOL - GRAPH API V2.3 (SYNC DRIVER FALLBACK)
# 1. ARCHITECTURE CHANGE: Switched from Async (Motor) to Sync (PyMongo) to match FinanceService.
# 2. DEBUG: Enhanced logging to trace exactly why queries might return 0 results.

from fastapi import APIRouter, Depends
from typing import Dict, List, Any
from pymongo.database import Database
from app.api.endpoints.dependencies import get_current_active_user
from app.models.user import UserInDB as User
from app.core.db import get_db 

router = APIRouter()

class MongoGraphService:
    def __init__(self, db: Database):
        self.db = db

    def build_financial_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        print(f"--- [GRAPH DEBUG] Sync Query for User ID: {user_id} ---")
        
        nodes = []
        links = []
        node_ids = set()
        
        # --- 1. FETCH DATA (Synchronous) ---
        # Using dictionary access ["collection"] to be 100% safe
        cases = list(self.db["cases"].find({"user_id": user_id}))
        invoices = list(self.db["invoices"].find({"user_id": user_id}))
        expenses = list(self.db["expenses"].find({"user_id": user_id}))

        print(f"--- [GRAPH DEBUG] Found: {len(cases)} Cases, {len(invoices)} Invoices, {len(expenses)} Expenses ---")

        # --- 2. INTELLIGENCE: CLIENT LAYER ---
        clients_map = {} 
        
        for inv in invoices:
            c_name = inv.get("client_name")
            # Fallback for nested client object
            if not c_name and "client" in inv and isinstance(inv["client"], dict):
                c_name = inv["client"].get("name")
            
            if not c_name: c_name = "Unknown Client"

            amount = inv.get("total_amount", 0)
            status = inv.get("status", "DRAFT")
            
            if c_name not in clients_map:
                clients_map[c_name] = {"value": 0, "risk_factors": 0}
            
            clients_map[c_name]["value"] += amount
            
            if status in ["OVERDUE", "UNPAID", "PENDING"]:
                clients_map[c_name]["risk_factors"] += 1

        # Create Client Nodes
        for name, data in clients_map.items():
            if not name: continue
            client_id = f"client_{name.replace(' ', '_')}"
            
            client_status = "Active"
            if data["risk_factors"] > 0: client_status = "Pending"
            if data["risk_factors"] > 2: client_status = "Unpaid"

            nodes.append({
                "id": client_id,
                "label": name,
                "group": "Client",
                "value": data["value"],
                "subLabel": f"€ {data['value']:,.2f}",
                "status": client_status
            })
            node_ids.add(client_id)

        # --- 3. OPERATIONAL LAYER ---
        
        # Invoices
        for inv in invoices:
            inv_id = str(inv["_id"])
            
            c_name = inv.get("client_name")
            if not c_name and "client" in inv and isinstance(inv["client"], dict):
                c_name = inv["client"].get("name")
            if not c_name: c_name = "Unknown Client"

            client_node_id = f"client_{c_name.replace(' ', '_')}"
            
            status_map = {"PAID": "Paid", "SENT": "Pending", "OVERDUE": "Overdue", "DRAFT": "Draft"}
            fe_status = status_map.get(inv.get("status", "DRAFT"), "Active")
            
            nodes.append({
                "id": inv_id,
                "label": f"Invoice #{inv.get('invoice_number', '???')}",
                "group": "Invoice",
                "subLabel": f"€ {inv.get('total_amount', 0):,.2f}",
                "status": "Unpaid" if fe_status == "Overdue" else fe_status,
                "value": 1
            })
            node_ids.add(inv_id)
            
            if client_node_id in node_ids:
                links.append({
                    "source": client_node_id,
                    "target": inv_id,
                    "value": 0 if fe_status == "Overdue" else 1
                })

        # Expenses
        for exp in expenses:
            exp_id = str(exp["_id"])
            nodes.append({
                "id": exp_id,
                "label": exp.get("category", "Expense"),
                "group": "Expense",
                "subLabel": f"€ {exp.get('amount', 0):,.2f}",
                "status": "Paid", 
                "value": 1
            })
            
            if "related_case_id" in exp and exp["related_case_id"]:
                case_link_id = str(exp["related_case_id"])
                # Only add link if case node will exist
                links.append({"source": case_link_id, "target": exp_id, "value": 1})

        # Cases
        for case in cases:
            case_id = str(case["_id"])
            if case_id not in node_ids:
                nodes.append({
                    "id": case_id,
                    "label": case.get("title", "Untitled Case"),
                    "group": "Case",
                    "subLabel": case.get("case_number", ""),
                    "status": "Active",
                    "value": 2
                })
                node_ids.add(case_id)
            
            if "client" in case and "name" in case["client"]:
                c_name = case["client"]["name"]
                client_node_id = f"client_{c_name.replace(' ', '_')}"
                if client_node_id in node_ids:
                    links.append({"source": client_node_id, "target": case_id, "value": 1})

        valid_links = [l for l in links if l["source"] in node_ids and l["target"] in node_ids]
        
        return {"nodes": nodes, "links": valid_links}


@router.get("/visualize", response_model=Dict[str, List[Dict[str, Any]]], tags=["Graph"])
def get_graph_data(
    current_user: User = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    service = MongoGraphService(db)
    graph_data = service.build_financial_topology(str(current_user.id))
    
    if not graph_data["nodes"]:
        print("--- [GRAPH DEBUG] No data found. Returning Seed Data. ---")
        return {
            "nodes": [
                {"id": "demo_1", "label": "Start Here", "group": "Client", "subLabel": "Create a Client", "status": "Active", "value": 1},
                {"id": "demo_2", "label": "First Invoice", "group": "Invoice", "subLabel": "€ 0.00", "status": "Draft", "value": 1}
            ],
            "links": [{"source": "demo_1", "target": "demo_2", "value": 1}]
        }
        
    return graph_data