# FILE: backend/app/services/visual_graph_service.py
# PHOENIX PROTOCOL - VISUALIZATION GRAPH SERVICE V3.0 (ARCHITECTURAL CURE)
# 1. CURE: Re-architected data generation to create a hierarchical graph. Overlapping nodes and inconsistent clicks are resolved.
# 2. HIERARCHY: Node 'value' (size/gravity) is now dynamically calculated based on business importance (e.g., sales volume, opportunity score).
# 3. PROFESSIONAL STANDARD: This data-driven approach provides the frontend physics engine the data it needs to render a clean, interactive, and professional layout.

from pymongo.database import Database
from typing import Dict, List, Any
from collections import defaultdict
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class MongoVisualGraphService:
    def __init__(self, db: Database):
        self.db = db

    def _get_user_filter(self, user_id_str: str) -> Dict[str, ObjectId]:
        """Creates a valid user filter by converting the user_id string to ObjectId."""
        try:
            user_oid = ObjectId(user_id_str)
            return {"user_id": user_oid}
        except Exception as e:
            logger.error(f"Could not convert user_id '{user_id_str}' to ObjectId: {e}")
            return {"user_id": ObjectId("000000000000000000000000")}

    def _get_base_data(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        """Helper to fetch all required data in one go using the correct ObjectId."""
        user_filter = self._get_user_filter(user_id)
        return {
            "invoices": list(self.db["invoices"].find(user_filter)),
            "expenses": list(self.db["expenses"].find(user_filter)),
            "inventory": list(self.db["inventory"].find(user_filter)),
            "recipes": list(self.db["recipes"].find(user_filter)),
        }

    def build_global_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        data = self._get_base_data(user_id)
        invoices = data["invoices"]
        expenses = data["expenses"]
        nodes: List[Dict[str, Any]] = []
        links: List[Dict[str, Any]] = []
        node_ids = set()
        
        clients_map: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"total_amount": 0, "risk_factors": 0})
        for inv in invoices:
            c_name = inv.get("client_name", "Unknown Client")
            amount = inv.get("total_amount", 0)
            clients_map[c_name]["total_amount"] += amount
            if inv.get("status") in ["OVERDUE", "UNPAID", "PENDING"]:
                clients_map[c_name]["risk_factors"] += 1

        for name, data in clients_map.items():
            if not name: continue
            client_id = f"client_{name.replace(' ', '_')}"
            client_status = "Active" if data["risk_factors"] == 0 else ("Pending" if data["risk_factors"] < 3 else "Unpaid")
            # ARCHITECTURE: Client node value is proportional to their total spending
            nodes.append({"id": client_id, "label": name, "group": "Client", "value": max(5, data['total_amount'] / 1000), "subLabel": f"€ {data['total_amount']:,.2f}", "status": client_status, "name": name})
            node_ids.add(client_id)

        for inv in invoices:
            inv_id_str = str(inv["_id"])
            c_name = inv.get("client_name", "Unknown Client")
            client_node_id = f"client_{c_name.replace(' ', '_')}"
            status_map = {"PAID": "Paid", "SENT": "Pending", "OVERDUE": "Overdue", "DRAFT": "Draft"}
            fe_status = status_map.get(inv.get("status", "DRAFT"), "Active")
            # ARCHITECTURE: Invoice value is proportional to its amount, ensuring larger invoices stand out
            nodes.append({"id": inv_id_str, "originalId": inv_id_str, "label": f"Fatura #{inv.get('invoice_number', '???')}", "group": "Invoice", "subLabel": f"€ {inv.get('total_amount', 0):,.2f}", "status": "Unpaid" if fe_status == "Overdue" else fe_status, "value": max(2, inv.get('total_amount', 0) / 500)})
            node_ids.add(inv_id_str)
            if client_node_id in node_ids:
                links.append({"source": client_node_id, "target": inv_id_str, "value": 1 if fe_status == "Paid" else 0})

        for exp in expenses:
            exp_id_str = str(exp["_id"])
            nodes.append({"id": exp_id_str, "originalId": exp_id_str, "label": exp.get("category", "Shpenzim"), "group": "Expense", "subLabel": f"€ {exp.get('amount', 0):,.2f}", "status": "Paid", "value": max(2, exp.get('amount', 0) / 500)})
            node_ids.add(exp_id_str)
        
        valid_links = [l for l in links if l.get("source") in node_ids and l.get("target") in node_ids]
        return {"nodes": nodes, "links": valid_links}

    def build_risk_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        data = self._get_base_data(user_id)
        invoices = data["invoices"]
        inventory = data["inventory"]
        nodes, links, node_ids = [], [], set()
        
        risky_clients = defaultdict(int)
        for inv in invoices:
            if inv.get("status") in ["OVERDUE", "UNPAID", "PENDING"]:
                risky_clients[inv.get("client_name", "Unknown Client")] += 1
                inv_id_str = str(inv["_id"])
                nodes.append({"id": inv_id_str, "originalId": inv_id_str, "label": f"Fatura #{inv.get('invoice_number', '???')}", "group": "Invoice", "subLabel": f"€ {inv.get('total_amount', 0):,.2f}", "status": "Unpaid", "value": 3})
                node_ids.add(inv_id_str)

        for name, count in risky_clients.items():
             if not name: continue
             client_id = f"client_{name.replace(' ', '_')}"
             # ARCHITECTURE: Risk client value is proportional to the number of overdue invoices
             nodes.append({"id": client_id, "label": name, "group": "Client", "subLabel": f"{count} Fatura Problematike", "status": "Unpaid", "value": 5 + (count * 2), "name": name})
             node_ids.add(client_id)
        
        for inv in invoices:
             if inv.get("status") in ["OVERDUE", "UNPAID", "PENDING"]:
                inv_id_str = str(inv["_id"])
                client_id = f"client_{inv.get('client_name', 'Unknown Client').replace(' ', '_')}"
                if client_id in node_ids and inv_id_str in node_ids:
                    links.append({"source": client_id, "target": inv_id_str, "value": 0})

        for item in inventory:
            if item.get("current_stock", 0) <= item.get("low_stock_threshold", 5):
                item_id_str = str(item["_id"])
                nodes.append({"id": item_id_str, "originalId": item_id_str, "label": item.get("name", "Artikull"), "group": "Inventory", "subLabel": f"Stoku i Ulët: {item.get('current_stock', 0)}", "status": "Unpaid", "value": 8})
                node_ids.add(item_id_str)
        
        return {"nodes": nodes, "links": links}

    def build_cost_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        data = self._get_base_data(user_id)
        expenses = data["expenses"]
        if not expenses: return { "nodes": [{"id": "no_cost_data", "label": "No Expenses Logged", "group": "System", "subLabel": "Add expenses to track costs here", "status": "Pending"}], "links": [] }
        
        nodes, links, node_ids, total_cost = [], [], set(), 0
        for exp in expenses:
            exp_id_str = str(exp["_id"])
            amount = exp.get('amount', 0)
            total_cost += amount
            nodes.append({"id": exp_id_str, "originalId": exp_id_str, "label": exp.get("category", "Shpenzim"), "group": "Expense", "subLabel": f"€ {amount:,.2f}", "status": "Paid", "value": max(2, amount/100)})
            node_ids.add(exp_id_str)
        
        if nodes:
            total_cost_id = "total_cost_node"
            nodes.append({"id": total_cost_id, "label": "Total Costs", "group": "Metric", "subLabel": f"€ {total_cost:,.2f}", "status": "Active", "value": 10 + total_cost / 1000})
            node_ids.add(total_cost_id)
            for node in nodes:
                if node["id"] != total_cost_id: links.append({"source": total_cost_id, "target": node["id"], "value": 1})
        return {"nodes": nodes, "links": links}

    def build_opportunity_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        data = self._get_base_data(user_id)
        invoices = data["invoices"]
        
        product_sales = defaultdict(set)
        all_clients = set()
        for inv in invoices:
            client = inv.get("client_name", "").strip()
            if not client: continue
            all_clients.add(client)
            for item in inv.get("items", []):
                product_name = item.get("description", "").strip()
                if product_name: product_sales[product_name].add(client)

        if not product_sales or len(all_clients) < 2:
            return { "nodes": [{"id": "no_opportunity_data", "label": "Not Enough Sales Data", "group": "System", "subLabel": "Log sales with item descriptions to find opportunities", "status": "Pending"}], "links": [] }

        # ARCHITECTURE: Select up to 5 top products to act as graph anchors
        top_products = sorted(product_sales.items(), key=lambda item: len(item[1]), reverse=True)[:5]
        top_product_names = {p[0] for p in top_products}

        # ARCHITECTURE: Calculate opportunity score for each client
        client_opportunity_scores = defaultdict(int)
        for client in all_clients:
            for product_name in top_product_names:
                if client not in product_sales[product_name]:
                    client_opportunity_scores[client] += 1
        
        nodes, links, node_ids = [], [], set()

        # ARCHITECTURE: Create Product nodes with value based on number of buyers
        for product, buyers in top_products:
            prod_id = f"prod_{product.replace(' ', '_')}"
            nodes.append({
                "id": prod_id, "label": product, "group": "Product",
                "subLabel": f"Sold to {len(buyers)} clients", "status": "Active", "name": product,
                "value": 10 + len(buyers) * 2 # Key physics driver
            })
            node_ids.add(prod_id)

        # ARCHITECTURE: Create Client nodes with value based on their opportunity score
        for client_name in all_clients:
            client_id = f"client_{client_name.replace(' ', '_')}"
            score = client_opportunity_scores.get(client_name, 0)
            if score > 0 and client_id not in node_ids: # Only show clients with potential
                nodes.append({
                    "id": client_id, "label": client_name, "group": "Client",
                    "subLabel": f"{score} Opportunities", "status": "Pending", "name": client_name,
                    "value": 3 + score * 2 # Key physics driver
                })
                node_ids.add(client_id)
        
        # ARCHITECTURE: Create opportunity links
        for product_name, buyers in top_products:
            prod_id = f"prod_{product_name.replace(' ', '_')}"
            non_buyers = all_clients - buyers
            for client_name in non_buyers:
                if client_opportunity_scores.get(client_name, 0) > 0:
                    client_id = f"client_{client_name.replace(' ', '_')}"
                    if client_id in node_ids: # Ensure client node was added
                        links.append({"source": prod_id, "target": client_id, "value": 2, "type": "opportunity"})
        
        return {"nodes": nodes, "links": links}