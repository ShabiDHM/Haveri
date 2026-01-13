# FILE: backend/app/api/endpoints/graph.py
# PHOENIX PROTOCOL - GRAPH API V1.4 (FORCED PYLANCE RESOLUTION)
# 1. FIX: Changed the import for the 'User' model to a fully qualified path to force Pylance resolution.
# 2. FEATURE: Exposes Neo4j data for frontend visualization.

from fastapi import APIRouter, Depends, HTTPException
from neo4j import Driver, ManagedTransaction
from typing import Dict, List, Any

from app.api.endpoints.dependencies import get_current_active_user
from app.core.db import get_neo4j_driver
# --- PYLANCE FIX: Use a fully qualified import from the 'models' package ---
from app.models.user import UserInDB as User # Using UserInDB as the concrete type for an active user

router = APIRouter()

class GraphVisualizationService:
    def __init__(self, driver: Driver = Depends(get_neo4j_driver)):
        self.driver = driver

    def get_full_graph_for_user(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Retrieves the entire graph for a given user, formatted for D3/vis.js.
        """
        if not self.driver:
            raise HTTPException(status_code=503, detail="Graph database is not connected.")

        with self.driver.session() as session:
            result = session.execute_read(self._get_graph_data, user_id)
            return result

    @staticmethod
    def _get_graph_data(tx: ManagedTransaction, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        query = """
        MATCH (n) WHERE n.userId = $user_id
        OPTIONAL MATCH (n)-[r]->(m) WHERE m.userId = $user_id
        RETURN n, r, m
        """
        results = tx.run(query, user_id=user_id)
        
        nodes = []
        links = []
        node_ids = set()

        for record in results:
            node_n = record["n"]
            node_m = record["m"]
            rel_r = record["r"]

            if node_n and node_n.id not in node_ids:
                node_ids.add(node_n.id)
                label = node_n.get("name") or node_n.get("invoiceId", f"Node {node_n.id}")
                nodes.append({"id": node_n.id, "label": label, "group": list(node_n.labels)[0]})

            if node_m and node_m.id not in node_ids:
                node_ids.add(node_m.id)
                label = node_m.get("name") or node_m.get("invoiceId", f"Node {node_m.id}")
                nodes.append({"id": node_m.id, "label": label, "group": list(node_m.labels)[0]})
            
            if rel_r:
                links.append({"source": rel_r.start_node.id, "target": rel_r.end_node.id, "label": type(rel_r).__name__})
                
        return {"nodes": nodes, "links": links}


@router.get("/visualize", response_model=Dict[str, List[Dict[str, Any]]], tags=["Graph"])
async def get_graph_data(
    graph_service: GraphVisualizationService = Depends(),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the 2D Node/Link structure for the current user.
    Used by the 'Detective Board' visualization.
    """
    # The get_current_active_user dependency returns a UserInDB model, which has the 'id' attribute.
    user_id = str(current_user.id)
    graph_data = graph_service.get_full_graph_for_user(user_id)
    if not graph_data["nodes"]:
        return {"nodes": [], "links": []}
    return graph_data