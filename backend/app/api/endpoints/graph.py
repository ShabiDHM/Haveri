# FILE: backend/app/api/endpoints/graph.py
# PHOENIX PROTOCOL - GRAPH API V2.1 (DEPENDENCY INJECTION FIX)
# 1. FIX: Removed invalid 'from app.core.db import db'.
# 2. ARCHITECTURE: Now properly injects 'get_async_db' into the service.
# 3. STATUS: Production Ready & Type Safe.

from fastapi import APIRouter, Depends
from typing import Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.endpoints.dependencies import get_current_active_user
from app.models.user import UserInDB as User
from app.core.db import get_async_db 

router = APIRouter()

class MongoGraphService:
    """
    Generates an 'Interconnected Intelligence' graph directly from 
    relational documents in MongoDB (Cases, Invoices, Expenses).
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def build_financial_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        nodes = []
        links = []
        
        # Track IDs to prevent duplicates
        node_ids = set()
        
        # --- 1. FETCH DATA ---
        cases = await self.db.cases.find({"user_id": user_id}).to_list(length=100)
        invoices = await self.db.invoices.find({"user_id": user_id}).to_list(length=200)
        expenses = await self.db.expenses.find({"user_id": user_id}).to_list(length=200)

        # --- 2. INTELLIGENCE: CLIENT LAYER ---
        # Aggregating clients from Cases & Invoices
        clients_map = {} # Name -> {total_value: 0, status: 'Active'}
        
        for inv in invoices:
            c_name = inv.get("client_name", "Unknown Client")
            amount = inv.get("total_amount", 0)
            status = inv.get("status", "DRAFT")
            
            if c_name not in clients_map:
                clients_map[c_name] = {"value": 0, "risk_factors": 0}
            
            clients_map[c_name]["value"] += amount
            
            # Risk Logic: Unpaid invoices increase risk factor
            if status in ["OVERDUE", "UNPAID", "PENDING"]:
                clients_map[c_name]["risk_factors"] += 1

        # Create Client Nodes
        for name, data in clients_map.items():
            if not name: continue
            client_id = f"client_{name.replace(' ', '_')}"
            
            # Determine Status based on Risk
            client_status = "Active"
            if data["risk_factors"] > 0:
                client_status = "Pending" # Yellow warning
            if data["risk_factors"] > 2:
                client_status = "Unpaid" # Red warning (High Risk)

            nodes.append({
                "id": client_id,
                "label": name,
                "group": "Client",
                "value": data["value"],
                "subLabel": f"€ {data['value']:,.2f}",
                "status": client_status
            })
            node_ids.add(client_id)

        # --- 3. OPERATIONAL LAYER: CASES & INVOICES ---
        
        # Invoices (The "Money" Nodes)
        for inv in invoices:
            inv_id = str(inv["_id"])
            c_name = inv.get("client_name", "Unknown Client")
            client_node_id = f"client_{c_name.replace(' ', '_')}"
            
            # Status Mapping for Frontend
            status_map = {
                "PAID": "Paid",
                "SENT": "Pending",
                "OVERDUE": "Overdue",
                "DRAFT": "Draft"
            }
            fe_status = status_map.get(inv.get("status", "DRAFT"), "Active")
            
            # Node
            nodes.append({
                "id": inv_id,
                "label": f"Invoice #{inv.get('invoice_number', '???')}",
                "group": "Invoice",
                "subLabel": f"€ {inv.get('total_amount', 0):,.2f}",
                "status": "Unpaid" if fe_status == "Overdue" else fe_status, # Force red for overdue
                "value": 1
            })
            node_ids.add(inv_id)
            
            # Link: Invoice -> Client
            if client_node_id in node_ids:
                links.append({
                    "source": client_node_id,
                    "target": inv_id,
                    "value": 0 if fe_status == "Overdue" else 1 # 0 triggers Red Particles
                })

        # Expenses (The "Cost" Nodes)
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
            
            # Link: Expense -> Case (if linked)
            if "related_case_id" in exp and exp["related_case_id"]:
                case_link_id = str(exp["related_case_id"])
                # We handle case nodes below, but we store the link intent
                links.append({"source": case_link_id, "target": exp_id, "value": 1})

        # Cases (The "Context" Nodes)
        for case in cases:
            case_id = str(case["_id"])
            # Ensure case node exists
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
            
            # Link: Case -> Client
            if "client" in case and "name" in case["client"]:
                c_name = case["client"]["name"]
                client_node_id = f"client_{c_name.replace(' ', '_')}"
                if client_node_id in node_ids:
                    links.append({
                        "source": client_node_id,
                        "target": case_id,
                        "value": 1
                    })

        # Filter links to ensure both source/target exist (Safety)
        valid_links = [l for l in links if l["source"] in node_ids and l["target"] in node_ids]

        return {"nodes": nodes, "links": valid_links}


@router.get("/visualize", response_model=Dict[str, List[Dict[str, Any]]], tags=["Graph"])
async def get_graph_data(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db) # <-- CORRECT INJECTION
):
    """
    Generates the War Room topology.
    Unlike standard REST endpoints, this calculates relationships on the fly.
    """
    service = MongoGraphService(db) # Pass DB instance
    graph_data = await service.build_financial_topology(str(current_user.id))
    
    # If empty (new user), return a sample seed to prevent empty screen
    if not graph_data["nodes"]:
        return {
            "nodes": [
                {"id": "demo_1", "label": "Start Here", "group": "Client", "subLabel": "Create a Client", "status": "Active", "value": 1},
                {"id": "demo_2", "label": "First Invoice", "group": "Invoice", "subLabel": "€ 0.00", "status": "Draft", "value": 1}
            ],
            "links": [
                {"source": "demo_1", "target": "demo_2", "value": 1}
            ]
        }
        
    return graph_data