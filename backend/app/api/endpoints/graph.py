# FILE: backend/app/api/endpoints/graph.py
# PHOENIX PROTOCOL - GRAPH API V1.5 (ROBUST QUERY)
# 1. FIX: Replaced the Cypher query with a more robust version that correctly gathers nodes and relationships.
# 2. FIX: Improved label generation to prioritize human-readable names over IDs.

from fastapi import APIRouter, Depends, HTTPException
from neo4j import Driver, ManagedTransaction
from typing import Dict, List, Any

from app.api.endpoints.dependencies import get_current_active_user
from app.core.db import get_neo4j_driver
from app.models.user import UserInDB as User

router = APIRouter()

class GraphVisualizationService:
    def __init__(self, driver: Driver = Depends(get_neo4j_driver)):
        self.driver = driver

    def get_full_graph_for_user(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        if not self.driver:
            raise HTTPException(status_code=503, detail="Graph database is not connected.")

        with self.driver.session() as session:
            result = session.execute_read(self._get_graph_data, user_id)
            return result

    @staticmethod
    def _get_graph_data(tx: ManagedTransaction, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        # --- ROBUST CYPHER QUERY ---
        # This query collects all nodes and relationships for a user and returns them as a collection.
        query = """
        MATCH (n {userId: $user_id})
        WITH COLLECT({id: id(n), labels: labels(n), properties: properties(n)}) AS nodes
        MATCH (source {userId: $user_id})-[r]->(target {userId: $user_id})
        WITH nodes, COLLECT({id: id(r), source: id(source), target: id(target), type: type(r)}) AS relationships
        RETURN nodes, relationships
        """
        result = tx.run(query, user_id=user_id).single()
        
        if not result:
            return {"nodes": [], "links": []}

        processed_nodes = []
        for node_data in result["nodes"]:
            label = "Unknown"
            props = node_data["properties"]
            # Prioritize human-readable names for labels
            if "name" in props:
                label = props["name"]
            elif "title" in props:
                label = props["title"]
            elif "invoiceId" in props:
                label = f"Invoice #{props['invoiceId'][-6:]}" # Shortened ID
            
            processed_nodes.append({
                "id": node_data["id"],
                "label": label,
                "group": node_data["labels"][0] if node_data["labels"] else "Default"
            })

        processed_links = []
        for rel_data in result["relationships"]:
            processed_links.append({
                "source": rel_data["source"],
                "target": rel_data["target"],
                "label": rel_data["type"]
            })
                
        return {"nodes": processed_nodes, "links": processed_links}


@router.get("/visualize", response_model=Dict[str, List[Dict[str, Any]]], tags=["Graph"])
async def get_graph_data(
    graph_service: GraphVisualizationService = Depends(),
    current_user: User = Depends(get_current_active_user)
):
    user_id = str(current_user.id)
    graph_data = graph_service.get_full_graph_for_user(user_id)
    return graph_data