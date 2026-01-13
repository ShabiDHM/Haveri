# FILE: backend/app/api/endpoints/graph.py
# PHOENIX PROTOCOL - GRAPH API V2.4 (DEEP DIAGNOSTICS)
# 1. DIAGNOSTIC: Prints all collection names to debug "Missing Data" issue.
# 2. ROBUSTNESS: Tries both String and ObjectId for user_id lookup.
# 3. SCHEMA DISCOVERY: Inspects the first found invoice to determine correct field names.

from fastapi import APIRouter, Depends
from typing import Dict, List, Any
from pymongo.database import Database
from bson import ObjectId
from app.api.endpoints.dependencies import get_current_active_user
from app.models.user import UserInDB as User
from app.core.db import get_db 

router = APIRouter()

class MongoGraphService:
    def __init__(self, db: Database):
        self.db = db

    def build_financial_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        print(f"\n--- [GRAPH DIAGNOSTICS] STARTING ANALYSIS FOR USER: {user_id} ---")
        
        nodes = []
        links = []
        node_ids = set()
        
        # --- DIAGNOSTIC STEP 1: CHECK COLLECTIONS ---
        collections = self.db.list_collection_names()
        print(f"[GRAPH DIAGNOSTICS] Available Collections: {collections}")
        
        # Determine correct collection names
        inv_coll_name = "invoices" if "invoices" in collections else "Invoice" if "Invoice" in collections else None
        exp_coll_name = "expenses" if "expenses" in collections else "Expense" if "Expense" in collections else None
        case_coll_name = "cases" if "cases" in collections else "Case" if "Case" in collections else None
        
        if not inv_coll_name:
            print("[GRAPH DIAGNOSTICS] CRITICAL: Could not find 'invoices' collection.")
            return {"nodes": [], "links": []}

        # --- DIAGNOSTIC STEP 2: SCHEMA INSPECTION ---
        # Grab ONE invoice just to see how it looks
        sample = self.db[inv_coll_name].find_one()
        if sample:
            print(f"[GRAPH DIAGNOSTICS] Sample Invoice Keys: {list(sample.keys())}")
            if "user_id" in sample:
                print(f"[GRAPH DIAGNOSTICS] user_id type in DB: {type(sample['user_id'])}")
        else:
            print("[GRAPH DIAGNOSTICS] Collection exists but is EMPTY.")

        # --- DIAGNOSTIC STEP 3: SMART QUERY ---
        # Try finding by String ID
        invoices = list(self.db[inv_coll_name].find({"user_id": user_id}))
        print(f"[GRAPH DIAGNOSTICS] Query 'user_id' (string): Found {len(invoices)}")
        
        # If 0, try ObjectId (just in case)
        if len(invoices) == 0:
            try:
                oid = ObjectId(user_id)
                invoices = list(self.db[inv_coll_name].find({"user_id": oid}))
                print(f"[GRAPH DIAGNOSTICS] Query 'user_id' (ObjectId): Found {len(invoices)}")
            except:
                pass

        # Fetch Expenses & Cases using similar logic
        expenses = []
        if exp_coll_name:
            expenses = list(self.db[exp_coll_name].find({"user_id": user_id}))
            if not expenses:
                try: expenses = list(self.db[exp_coll_name].find({"user_id": ObjectId(user_id)}))
                except: pass
        
        cases = []
        if case_coll_name:
            cases = list(self.db[case_coll_name].find({"user_id": user_id}))
            if not cases:
                try: cases = list(self.db[case_coll_name].find({"user_id": ObjectId(user_id)}))
                except: pass

        print(f"[GRAPH DIAGNOSTICS] Final Counts -> Invoices: {len(invoices)}, Expenses: {len(expenses)}, Cases: {len(cases)}")

        # --- 2. INTELLIGENCE: CLIENT LAYER ---
        clients_map = {} 
        
        for inv in invoices:
            c_name = inv.get("client_name")
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
                links.append({"source": str(exp["related_case_id"]), "target": exp_id, "value": 1})

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
        return {
            "nodes": [
                {"id": "demo_1", "label": "Start Here", "group": "Client", "subLabel": "Create a Client", "status": "Active", "value": 1},
                {"id": "demo_2", "label": "First Invoice", "group": "Invoice", "subLabel": "€ 0.00", "status": "Draft", "value": 1}
            ],
            "links": [{"source": "demo_1", "target": "demo_2", "value": 1}]
        }
        
    return graph_data