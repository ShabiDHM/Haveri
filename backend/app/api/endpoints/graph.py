# FILE: backend/app/api/endpoints/graph.py
# PHOENIX PROTOCOL - GRAPH API V5.1 (SERVICE CORRECTION)
# 1. FIX: Changed import from 'graph_service' to 'visual_graph_service' to prevent conflict with Neo4j service.
# 2. REFACTOR: Renamed service class to 'MongoVisualGraphService' for clarity.
# 3. STATUS: Endpoint is now correctly wired to the MongoDB visualization service, resolving the UI bug.

from fastapi import APIRouter, Depends
from typing import Dict, List, Any
from pymongo.database import Database
from app.api.endpoints.dependencies import get_current_active_user
from app.models.user import UserInDB as User
from app.core.db import get_db 
from app.services.visual_graph_service import MongoVisualGraphService

router = APIRouter()

@router.get("/visualize", response_model=Dict[str, List[Dict[str, Any]]], tags=["Graph"])
def get_graph_data(
    mode: str = "global",
    current_user: User = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """
    Provides structured data for graph visualization based on the selected mode.

    - **global**: A complete overview of clients, invoices, expenses, and products.
    - **risk**: Highlights clients with overdue/unpaid invoices and low inventory items.
    - **cost**: Focuses on business expenses.
    - **opportunity**: Identifies potential sales by showing top products and clients who haven't purchased them.
    """
    service = MongoVisualGraphService(db)
    user_id = str(current_user.id)
    view_mode = mode.lower()
    
    graph_builders = {
        "global": service.build_global_topology,
        "risk": service.build_risk_topology,
        "cost": service.build_cost_topology,
        "opportunity": service.build_opportunity_topology,
        "opportunities": service.build_opportunity_topology, # Alias
    }

    builder = graph_builders.get(view_mode, service.build_global_topology)
    graph_data = builder(user_id)
    
    if not graph_data.get("nodes"):
        return {
            "nodes": [{"id": "placeholder_node", "label": "No Data Available", "group": "System", "subLabel": f"No data found for '{view_mode}' view.", "status": "Active"}],
            "links": []
        }
        
    return graph_data