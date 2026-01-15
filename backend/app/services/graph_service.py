# FILE: backend/app/services/graph_service.py
# PHOENIX PROTOCOL - GRAPH SERVICE V2.3 (ORPHAN CLEANUP)
# 1. IMPROVEMENT: Added _cleanup_orphans to remove Clients with no active connections.
# 2. RESULT: Deleting the last invoice of a client will now remove the client node too.

from neo4j import Driver, ManagedTransaction
from fastapi import Depends
import logging

from app.core.db import get_neo4j_driver
from app.models.finance import InvoiceInDB

logger = logging.getLogger(__name__)

class GraphService:
    def __init__(self, driver: Driver = Depends(get_neo4j_driver)):
        self.driver = driver
        self.database_name = "neo4j" 

    def add_or_update_client_and_invoice(self, invoice: InvoiceInDB): 
        if not self.driver:
            logger.error("--- [GraphService] DRIVER MISSING. Cannot write to Neo4j. ---")
            return

        client_name = invoice.client_name
        invoice_id = str(invoice.id)
        invoice_total = invoice.total_amount
        invoice_status = invoice.status
        user_id = str(invoice.user_id)

        print(f"--- [GraphService] Attempting Write: Invoice {invoice_id} for Client {client_name} ---")

        with self.driver.session(database=self.database_name) as session:
            session.execute_write(
                self._create_client_invoice_relationship,
                user_id,
                client_name,
                invoice_id,
                invoice_total,
                invoice_status
            )
        print(f"--- [GraphService] SUCCESS: Wrote Invoice {invoice_id} to Neo4j ---")

    def delete_node(self, node_id: str):
        """
        1. Deletes the specific node (Invoice, Expense, etc.)
        2. Scans for any 'Client' nodes that are now empty (Orphans) and deletes them.
        """
        if not self.driver:
            return

        print(f"--- [GraphService] Attempting Delete: Node ID {node_id} ---")
        
        with self.driver.session(database=self.database_name) as session:
            # Step 1: Delete the target node
            session.execute_write(self._execute_node_deletion, node_id)
            # Step 2: Cleanup any Clients left behind with no connections
            session.execute_write(self._cleanup_orphans)
            
        print(f"--- [GraphService] SUCCESS: Deleted Node {node_id} and cleaned orphans ---")

    @staticmethod
    def _create_client_invoice_relationship(
        tx: ManagedTransaction, 
        user_id: str, 
        client_name: str, 
        invoice_id: str, 
        invoice_total: float, 
        invoice_status: str
    ):
        query = (
            "MERGE (c:Client {name: $client_name, userId: $user_id}) "
            "MERGE (i:Invoice {invoiceId: $invoice_id, userId: $user_id}) "
            "ON CREATE SET i.total = $invoice_total, i.status = $invoice_status "
            "ON MATCH SET i.total = $invoice_total, i.status = $invoice_status "
            "MERGE (c)-[r:HAS_INVOICE]->(i) "
            "RETURN c, i, r"
        )
        tx.run(query, user_id=user_id, client_name=client_name, invoice_id=invoice_id, invoice_total=invoice_total, invoice_status=invoice_status)

    @staticmethod
    def _execute_node_deletion(tx: ManagedTransaction, node_id: str):
        query = (
            "MATCH (n) "
            "WHERE n.id = $node_id "
            "   OR n.invoiceId = $node_id "
            "   OR n.expenseId = $node_id "
            "   OR n.inventoryId = $node_id "
            "   OR n.productId = $node_id "
            "   OR n.documentId = $node_id "
            "DETACH DELETE n"
        )
        tx.run(query, node_id=node_id)

    @staticmethod
    def _cleanup_orphans(tx: ManagedTransaction):
        """
        Finds any Client nodes that have NO relationships (--) to anything else
        and deletes them. Keeps the graph clean.
        """
        query = "MATCH (c:Client) WHERE NOT (c)--() DELETE c"
        tx.run(query)