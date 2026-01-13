# FILE: backend/app/api/endpoints/graph.py
# PHOENIX PROTOCOL - GRAPH API V4.0 (SALES RADAR)
# 1. NEW FEATURE: Added 'build_opportunity_topology' for "Hidden Opportunities".
# 2. ALGORITHM: Identifies top-selling products and finds clients who haven't bought them.
# 3. ENDPOINT: Added '/visualize/opportunities' to serve the new "Sales Radar" graph.

from fastapi import APIRouter, Depends
from typing import Dict, List, Any
from pymongo.database import Database
from app.api.endpoints.dependencies import get_current_active_user
from app.models.user import UserInDB as User
from app.core.db import get_db 
from collections import defaultdict

router = APIRouter()

class MongoGraphService:
    def __init__(self, db: Database):
        self.db = db

    def build_financial_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        nodes: List[Dict[str, Any]] = []
        links: List[Dict[str, Any]] = []
        node_ids = set()
        
        # --- Fetch Data ---
        cases = list(self.db["cases"].find({"user_id": user_id}))
        invoices = list(self.db["invoices"].find({"user_id": user_id}))
        expenses = list(self.db["expenses"].find({"user_id": user_id}))
        inventory = list(self.db["inventory"].find({"user_id": user_id}))
        recipes = list(self.db["recipes"].find({"user_id": user_id}))

        # --- Client Layer ---
        clients_map: Dict[str, Dict[str, Any]] = {}
        for inv in invoices:
            c_name = inv.get("client_name", "Unknown Client")
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
            nodes.append({"id": client_id, "label": name, "group": "Client", "value": data["value"], "subLabel": f"€ {data['value']:,.2f}", "status": client_status})
            node_ids.add(client_id)

        # --- Operational Layer ---
        for inv in invoices:
            inv_id = str(inv["_id"])
            c_name = inv.get("client_name", "Unknown Client")
            client_node_id = f"client_{c_name.replace(' ', '_')}"
            status_map = {"PAID": "Paid", "SENT": "Pending", "OVERDUE": "Overdue", "DRAFT": "Draft"}
            fe_status = status_map.get(inv.get("status", "DRAFT"), "Active")
            nodes.append({"id": inv_id, "label": f"Fatura #{inv.get('invoice_number', '???')}", "group": "Invoice", "subLabel": f"€ {inv.get('total_amount', 0):,.2f}", "status": "Unpaid" if fe_status == "Overdue" else fe_status, "value": 1})
            node_ids.add(inv_id)
            if client_node_id in node_ids:
                links.append({"source": client_node_id, "target": inv_id, "value": 0 if fe_status == "Overdue" else 1})

        for exp in expenses:
            exp_id = str(exp["_id"])
            nodes.append({"id": exp_id, "label": exp.get("category", "Shpenzim"), "group": "Expense", "subLabel": f"€ {exp.get('amount', 0):,.2f}", "status": "Paid", "value": 1})
            if "related_case_id" in exp and exp["related_case_id"]:
                links.append({"source": str(exp["related_case_id"]), "target": exp_id, "value": 1})
        
        # --- Supply Chain Layer ---
        for item in inventory:
            item_id = str(item["_id"])
            stock_status = "Active" if item.get("current_stock", 0) > item.get("low_stock_threshold", 5) else "Unpaid"
            nodes.append({"id": item_id, "label": item.get("name", "Artikull"), "group": "Inventory", "subLabel": f"{item.get('current_stock', 0)} {item.get('unit', 'pcs')}", "status": stock_status, "value": 1})
            node_ids.add(item_id)

        for recipe in recipes:
            recipe_id = str(recipe["_id"])
            nodes.append({"id": recipe_id, "label": recipe.get("product_name", "Produkt"), "group": "Product", "subLabel": "Recetë", "status": "Active", "value": 2})
            node_ids.add(recipe_id)
            for ing in recipe.get("ingredients", []):
                if str(ing.get("inventory_item_id")) in node_ids:
                    links.append({"source": recipe_id, "target": str(ing.get("inventory_item_id")), "value": 1})

        valid_links = [l for l in links if l.get("source") in node_ids and l.get("target") in node_ids]
        return {"nodes": nodes, "links": valid_links}

    def build_opportunity_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        invoices = list(self.db["invoices"].find({"user_id": user_id}))
        
        # 1. Analyze Sales History
        product_sales = defaultdict(set) # product_name -> {client_name_1, client_name_2}
        all_clients = set()
        for inv in invoices:
            client = inv.get("client_name")
            if not client: continue
            all_clients.add(client)
            for item in inv.get("items", []):
                product_name = item.get("description")
                if product_name:
                    product_sales[product_name].add(client)

        if not product_sales: return {"nodes": [], "links": []}

        # 2. Find Top 3 Products
        top_products = sorted(product_sales.items(), key=lambda item: len(item[1]), reverse=True)[:3]

        # 3. Build Graph
        nodes = []
        links = []
        node_ids = set()

        for product, buyers in top_products:
            prod_id = f"prod_{product.replace(' ', '_')}"
            nodes.append({"id": prod_id, "label": product, "group": "Product", "subLabel": f"Sold to {len(buyers)} clients", "status": "Active"})
            node_ids.add(prod_id)

            # Find clients who HAVE NOT bought this product
            non_buyers = all_clients - buyers
            for client_name in non_buyers:
                client_id = f"client_{client_name.replace(' ', '_')}"
                if client_id not in node_ids:
                    nodes.append({"id": client_id, "label": client_name, "group": "Client", "subLabel": "Potential Sale", "status": "Pending"})
                    node_ids.add(client_id)
                
                # Create "Opportunity" link
                links.append({"source": prod_id, "target": client_id, "value": 1, "type": "opportunity"})
        
        return {"nodes": nodes, "links": links}

@router.get("/visualize", response_model=Dict[str, List[Dict[str, Any]]], tags=["Graph"])
def get_graph_data(
    mode: str = "global",
    current_user: User = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    service = MongoGraphService(db)
    
    if mode == "opportunity":
        graph_data = service.build_opportunity_topology(str(current_user.id))
    else: # Default to global
        graph_data = service.build_financial_topology(str(current_user.id))
    
    if not graph_data["nodes"]:
        return {
            "nodes": [{"id": "demo_1", "label": "Start Here", "group": "Client", "subLabel": "Create Data to see graph", "status": "Active"}],
            "links": []
        }
    return graph_data