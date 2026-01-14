# FILE: backend/app/services/visual_graph_service.py
# PHOENIX PROTOCOL - VISUALIZATION GRAPH SERVICE V2.0 (CURATIVE)
# 1. CURE: Imported ObjectId from bson and now convert the user_id string into a proper ObjectId before querying. This is the definitive fix for the "No Data" issue.
# 2. INTEGRITY: Added a try-except block to handle invalid ID formats gracefully.
# 3. RESTORATION: Re-integrated the 'originalId' field to ensure nodes are clickable by the frontend.

from pymongo.database import Database
from typing import Dict, List, Any
from collections import defaultdict
from bson import ObjectId # PHOENIX: CURE - Import ObjectId
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
            # Return a filter that will find nothing, preventing data leakage
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
        inventory = data["inventory"]
        recipes = data["recipes"]

        nodes: List[Dict[str, Any]] = []
        links: List[Dict[str, Any]] = []
        node_ids = set()
        
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
            nodes.append({"id": client_id, "label": name, "group": "Client", "value": data["value"], "subLabel": f"€ {data['value']:,.2f}", "status": client_status, "name": name})
            node_ids.add(client_id)

        for inv in invoices:
            inv_id_str = str(inv["_id"])
            c_name = inv.get("client_name", "Unknown Client")
            client_node_id = f"client_{c_name.replace(' ', '_')}"
            status_map = {"PAID": "Paid", "SENT": "Pending", "OVERDUE": "Overdue", "DRAFT": "Draft"}
            fe_status = status_map.get(inv.get("status", "DRAFT"), "Active")
            nodes.append({"id": inv_id_str, "originalId": inv_id_str, "label": f"Fatura #{inv.get('invoice_number', '???')}", "group": "Invoice", "subLabel": f"€ {inv.get('total_amount', 0):,.2f}", "status": "Unpaid" if fe_status == "Overdue" else fe_status, "value": 1})
            node_ids.add(inv_id_str)
            if client_node_id in node_ids:
                links.append({"source": client_node_id, "target": inv_id_str, "value": 0 if fe_status == "Overdue" else 1})

        for exp in expenses:
            exp_id_str = str(exp["_id"])
            nodes.append({"id": exp_id_str, "originalId": exp_id_str, "label": exp.get("category", "Shpenzim"), "group": "Expense", "subLabel": f"€ {exp.get('amount', 0):,.2f}", "status": "Paid", "value": 1})
            node_ids.add(exp_id_str)
        
        for item in inventory:
            item_id_str = str(item["_id"])
            stock_status = "Active" if item.get("current_stock", 0) > item.get("low_stock_threshold", 5) else "Unpaid"
            nodes.append({"id": item_id_str, "originalId": item_id_str, "label": item.get("name", "Artikull"), "group": "Inventory", "subLabel": f"{item.get('current_stock', 0)} {item.get('unit', 'pcs')}", "status": stock_status, "value": 1})
            node_ids.add(item_id_str)

        for recipe in recipes:
            recipe_id_str = str(recipe["_id"])
            nodes.append({"id": recipe_id_str, "originalId": recipe_id_str, "label": recipe.get("product_name", "Produkt"), "group": "Product", "subLabel": "Recetë", "status": "Active", "value": 2})
            node_ids.add(recipe_id_str)
            for ing in recipe.get("ingredients", []):
                if str(ing.get("inventory_item_id")) in node_ids:
                    links.append({"source": recipe_id_str, "target": str(ing.get("inventory_item_id")), "value": 1})

        valid_links = [l for l in links if l.get("source") in node_ids and l.get("target") in node_ids]
        return {"nodes": nodes, "links": valid_links}

    def build_risk_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        data = self._get_base_data(user_id)
        # ... (rest of the functions will now work correctly)
        invoices = data["invoices"]
        inventory = data["inventory"]
        nodes: List[Dict[str, Any]] = []
        links: List[Dict[str, Any]] = []
        node_ids = set()
        risky_clients = {}

        for inv in invoices:
            if inv.get("status") in ["OVERDUE", "UNPAID", "PENDING"]:
                client_name = inv.get("client_name", "Unknown Client")
                risky_clients[client_name] = client_name
                inv_id_str = str(inv["_id"])
                nodes.append({"id": inv_id_str, "originalId": inv_id_str, "label": f"Fatura #{inv.get('invoice_number', '???')}", "group": "Invoice", "subLabel": f"€ {inv.get('total_amount', 0):,.2f}", "status": "Unpaid", "value": 1})
                node_ids.add(inv_id_str)

        for client_name in risky_clients.values():
             if not client_name: continue
             client_id = f"client_{client_name.replace(' ', '_')}"
             nodes.append({"id": client_id, "label": client_name, "group": "Client", "subLabel": "Risk Factor", "status": "Unpaid", "value": 5, "name": client_name})
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
                nodes.append({"id": item_id_str, "originalId": item_id_str, "label": item.get("name", "Artikull"), "group": "Inventory", "subLabel": f"Low Stock: {item.get('current_stock', 0)}", "status": "Unpaid", "value": 2})
                node_ids.add(item_id_str)
        
        return {"nodes": nodes, "links": links}

    def build_cost_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        data = self._get_base_data(user_id)
        expenses = data["expenses"]

        if not expenses:
            return { "nodes": [{"id": "no_cost_data", "label": "No Expenses Logged", "group": "System", "subLabel": "Add expenses to track costs here", "status": "Pending"}], "links": [] }

        nodes, links, node_ids, total_cost = [], [], set(), 0

        for exp in expenses:
            exp_id_str = str(exp["_id"])
            amount = exp.get('amount', 0)
            total_cost += amount
            nodes.append({"id": exp_id_str, "originalId": exp_id_str, "label": exp.get("category", "Shpenzim"), "group": "Expense", "subLabel": f"€ {amount:,.2f}", "status": "Paid", "value": amount})
            node_ids.add(exp_id_str)
        
        if nodes:
            total_cost_id = "total_cost_node"
            nodes.append({"id": total_cost_id, "label": "Total Costs", "group": "Metric", "subLabel": f"€ {total_cost:,.2f}", "status": "Active", "value": total_cost})
            node_ids.add(total_cost_id)
            for node in nodes:
                if node["id"] != total_cost_id:
                    links.append({"source": total_cost_id, "target": node["id"], "value": 1})

        return {"nodes": nodes, "links": links}

    def build_opportunity_topology(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        data = self._get_base_data(user_id)
        invoices = data["invoices"]
        
        product_sales = defaultdict(set)
        all_clients = set()
        for inv in invoices:
            client = inv.get("client_name")
            if not client: continue
            all_clients.add(client)
            for item in inv.get("items", []):
                product_name = item.get("description")
                if product_name:
                    product_sales[product_name].add(client)

        if not product_sales or len(all_clients) < 2:
            return { "nodes": [{"id": "no_opportunity_data", "label": "Not Enough Sales Data", "group": "System", "subLabel": "Log sales with item descriptions to find opportunities", "status": "Pending"}], "links": [] }

        top_products = sorted(product_sales.items(), key=lambda item: len(item[1]), reverse=True)[:3]
        nodes, links, node_ids = [], [], set()

        for product, buyers in top_products:
            prod_id = f"prod_{product.replace(' ', '_')}"
            nodes.append({"id": prod_id, "label": product, "group": "Product", "subLabel": f"Sold to {len(buyers)} clients", "status": "Active", "name": product})
            node_ids.add(prod_id)
            non_buyers = all_clients - buyers
            for client_name in non_buyers:
                client_id = f"client_{client_name.replace(' ', '_')}"
                if client_id not in node_ids:
                    nodes.append({"id": client_id, "label": client_name, "group": "Client", "subLabel": "Potential Sale", "status": "Pending", "name": client_name})
                    node_ids.add(client_id)
                links.append({"source": prod_id, "target": client_id, "value": 1, "type": "opportunity"})
        
        return {"nodes": nodes, "links": links}