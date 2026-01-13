# FILE: backend/app/api/endpoints/graph.py
# PHOENIX PROTOCOL - GRAPH API V1.6 (DEFINITIVE QUERY FIX)
# 1. FIX: Implemented a multi-stage, explicit Cypher query to guarantee relationship fetching.
# 2. STATUS: This is the final, robust version for data retrieval.

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
        # --- DEFINITIVE CYPHER QUERY ---
        # Step 1: Collect all nodes for the user.
        nodes_query = "MATCH (n {userId: $user_id}) RETURN id(n) AS id, labels(n) AS labels, properties(n) AS properties"
        nodes_result = tx.run(nodes_query, user_id=user_id)
        
        nodes = []
        node_ids = set()
        for record in nodes_result:
            node_id = record["id"]
            if node_id in node_ids: continue
            node_ids.add(node_id)
            
            label = "Unknown"
            props = record["properties"]
            if "name" in props: label = props["name"]
            elif "title" in props: label = props["title"]
            elif "invoiceId" in props: label = f"Invoice #{props['invoiceId'][-6:]}"
            
            nodes.append({
                "id": node_id,
                "label": label,
                "group": record["labels"][0] if record["labels"] else "Default"
            })

        # Step 2: Collect all relationships between those nodes.
        links_query = "MATCH (source {userId: $user_id})-[r]->(target {userId: $user_id}) RETURN id(source) AS source, id(target) AS target, type(r) AS type"
        links_result = tx.run(links_query, user_id=user_id)
        
        links = [
            {"source": record["source"], "target": record["target"], "label": record["type"]}
            for record in links_result
        ]
        
        return {"nodes": nodes, "links": links}


@router.get("/visualize", response_model=Dict[str, List[Dict[str, Any]]], tags=["Graph"])
async def get_graph_data(
    graph_service: GraphVisualizationService = Depends(),
    current_user: User = Depends(get_current_active_user)
):
    user_id = str(current_user.id)
    graph_data = graph_service.get_full_graph_for_user(user_id)
    return graph_data