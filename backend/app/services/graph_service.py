# FILE: backend/app/services/graph_service.py
# PHOENIX PROTOCOL - GRAPH SERVICE V9.0 (BUSINESS INTELLIGENCE)
# 1. REFACTOR: Transformed from "Litigation Engine" to "Business Ecosystem Graph".
# 2. NODES: Now models Clients, Suppliers, Products, and Transactions.
# 3. RELATIONS: Tracks commercial relationships (SOLD_TO, ISSUED_BY, CONTAINS_ITEM).

import os
import structlog
from neo4j import GraphDatabase, Driver, basic_auth
from typing import List, Dict, Any, Optional

logger = structlog.get_logger(__name__)

# --- CONFIGURATION ---
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

class GraphService:
    _driver: Optional[Driver] = None

    def __init__(self):
        pass

    def _connect(self):
        if self._driver: return
        try:
            self._driver = GraphDatabase.driver(
                NEO4J_URI, 
                auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD)
            )
            self._driver.verify_connectivity()
        except Exception as e:
            logger.error(f"❌ Neo4j Connection Failed: {e}")
            self._driver = None

    def close(self):
        if self._driver:
            self._driver.close()

    # ==============================================================================
    # SECTION 1: MAINTENANCE & VISUALIZATION
    # ==============================================================================

    def delete_document_nodes(self, document_id: str):
        self._connect()
        if not self._driver: return
        try:
            with self._driver.session() as session:
                session.run("MATCH (d:Document {id: $doc_id}) DETACH DELETE d", doc_id=document_id)
                session.run("MATCH (n) WHERE NOT (n)--() DELETE n") # Cleanup orphans
            logger.info(f"🗑️ Deleted Graph Nodes for Document {document_id}")
        except Exception as e:
            logger.error(f"Graph Deletion Failed: {e}")

    def get_case_graph(self, case_id: str) -> Dict[str, List]:
        self._connect()
        if not self._driver: return {"nodes": [], "links": []}
        
        # PHOENIX: Updated query for business relationships
        query = """
        MATCH (d:Document {case_id: $case_id})
        OPTIONAL MATCH (d)-[:MENTIONS|ISSUED_BY|BILLED_TO]->(e)
        WITH collect(DISTINCT d) + collect(DISTINCT e) as nodes
        UNWIND nodes as n
        OPTIONAL MATCH (n)-[r]-(m)
        WHERE m IN nodes
        RETURN DISTINCT n, r, m
        """
        
        nodes_dict = {}
        links_list = []
        
        try:
            with self._driver.session() as session:
                result = session.run(query, case_id=case_id)
                for record in result:
                    n, m, r = record['n'], record['m'], record['r']
                    
                    for node_obj in [n, m]:
                        if node_obj:
                            nid = node_obj.get("id", node_obj.get("name"))
                            if nid and nid not in nodes_dict:
                                grp = node_obj.get("group", "ENTITY")
                                nodes_dict[nid] = {
                                    "id": nid,
                                    "name": node_obj.get("name", "Unknown"),
                                    "group": grp,
                                    "val": 20 if grp == 'DOCUMENT' else 8
                                }

                    if r and n and m:
                        links_list.append({
                            "source": n.get("id", n.get("name")),
                            "target": m.get("id", m.get("name")),
                            "label": r.type.replace("_", " ")
                        })

            return {"nodes": list(nodes_dict.values()), "links": links_list}
        except Exception as e:
            logger.error(f"Graph Retrieval Failed: {e}")
            return {"nodes": [], "links": []}

    # ==============================================================================
    # SECTION 2: DATA INGESTION (BUSINESS ENTITIES)
    # ==============================================================================

    def ingest_entities_and_relations(self, case_id: str, document_id: str, doc_name: str, entities: List[Dict], relations: List[Dict], doc_metadata: Optional[Dict] = None):
        """
        Ingests business entities: Clients, Suppliers, Money, Products.
        """
        self._connect()
        if not self._driver: return

        def _tx_ingest(tx, c_id, d_id, d_name, ents, rels, meta):
            tx.run("""
                MERGE (d:Document {id: $doc_id})
                SET d.case_id = $case_id, d.name = $doc_name, d.group = 'DOCUMENT'
            """, doc_id=d_id, case_id=c_id, doc_name=d_name)

            # PHOENIX: Business Metadata Ingestion
            if meta:
                # If metadata identifies a 'Supplier' or 'Issuer'
                if meta.get("issuer") or meta.get("supplier"):
                    name = meta.get("issuer") or meta.get("supplier")
                    tx.run("""
                        MERGE (c:Company {name: $name, group: 'SUPPLIER'})
                        MERGE (d:Document {id: $doc_id})
                        MERGE (c)-[:ISSUED]->(d)
                    """, name=name, doc_id=d_id)
                
                # If metadata identifies a 'Client' or 'Customer'
                if meta.get("client") or meta.get("customer"):
                    name = meta.get("client") or meta.get("customer")
                    tx.run("""
                        MERGE (c:Company {name: $name, group: 'CLIENT'})
                        MERGE (d:Document {id: $doc_id})
                        MERGE (d)-[:BILLED_TO]->(c)
                    """, name=name, doc_id=d_id)

            # Ingest standard entities from LLM
            for ent in ents:
                raw_label = ent.get("type", "Entity").strip().capitalize()
                label = "ENTITY"
                # Map LLM types to Business Graph Labels
                if raw_label in ["Person", "People"]: label = "PERSON"
                elif raw_label in ["Organization", "Company", "Business"]: label = "COMPANY"
                elif raw_label in ["Money", "Amount", "Price"]: label = "MONEY"
                elif raw_label in ["Product", "Item", "Service"]: label = "PRODUCT"
                elif raw_label in ["Date", "Time"]: label = "DATE"
                
                name = ent.get("name", "").strip().title()
                if not name or len(name) < 2: continue

                tx.run(f"""
                MERGE (e:{label} {{name: $name}})
                ON CREATE SET e.group = '{label}'
                MERGE (d:Document {{id: $doc_id}})
                MERGE (d)-[:MENTIONS]->(e)
                """, name=name, doc_id=d_id)

            # Ingest Relationships
            for rel in rels:
                subj = rel.get("subject", "").strip().title()
                obj = rel.get("object", "").strip().title()
                predicate = rel.get("relation", "RELATED_TO").upper().replace(" ", "_")
                
                if subj and obj:
                    tx.run(f"""
                    MATCH (a {{name: $subj}})
                    MATCH (b {{name: $obj}})
                    MERGE (a)-[:{predicate}]->(b)
                    """, subj=subj, obj=obj)

        try:
            with self._driver.session() as session:
                session.execute_write(_tx_ingest, case_id, document_id, doc_name, entities, relations, doc_metadata)
        except Exception as e:
            logger.error(f"Graph Ingestion Error: {e}")

    # ==============================================================================
    # SECTION 3: BUSINESS INTELLIGENCE QUERIES (V9)
    # ==============================================================================

    def find_hidden_connections(self, query_term: str) -> List[str]:
        """
        Finds business connections. E.g., "Show me everything related to 'Elkos'".
        """
        self._connect()
        if not self._driver: return []
        query = """
        MATCH (a)-[r]-(b)
        WHERE toLower(a.name) CONTAINS toLower($term)
        RETURN a.name, type(r), b.name
        LIMIT 15
        """
        results = []
        try:
            with self._driver.session() as session:
                res = session.run(query, term=query_term)
                for rec in res:
                    results.append(f"{rec['a.name']} --[{rec['type(r)']}]--> {rec['b.name']}")
            return list(set(results))
        except Exception:
            return []

    # PHOENIX: Removed 'find_contradictions' and 'get_accusation_chain' as they are legacy legal tools.
    # We can add 'find_pricing_trends' or 'find_top_suppliers' here in the future.
    def find_contradictions(self, case_id: str) -> str:
        return "Graph analysis disabled for business mode."

# Global Instance
graph_service = GraphService()