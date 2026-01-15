# FILE: backend/app/services/graph_service.py
# PHOENIX PROTOCOL - GRAPH SERVICE V2.0 (DELETION SYNC)
# 1. NEW FEATURE: Added delete_node method to handle entity removal.
# 2. LOGIC: Executes 'DETACH DELETE' to ensure no orphaned relationships remain.

from neo4j import Driver, ManagedTransaction
from fastapi import Depends
import logging

from app.core.db import get_neo4j_driver
from app.models.finance import InvoiceInDB

logger = logging.getLogger(__name__)

class GraphService:
    def __init__(self, driver: Driver = Depends(get_neo4j_driver)):
        self.driver = driver

    def add_or_update_client_and_invoice(self, invoice: InvoiceInDB): 
        """
        Creates or updates a Client node and an Invoice node, ensuring a relationship exists.
        This is the core of building the financial graph.
        """
        if not self.driver:
            logger.warning("--- [GraphService] Neo4j driver not available. Skipping graph update. ---")
            return

        client_name = invoice.client_name
        invoice_id = str(invoice.id)
        invoice_total = invoice.total_amount
        invoice_status = invoice.status
        user_id = str(invoice.user_id)

        try:
            with self.driver.session() as session:
                session.execute_write(
                    self._create_client_invoice_relationship,
                    user_id,
                    client_name,
                    invoice_id,
                    invoice_total,
                    invoice_status
                )
            logger.info(f"--- [GraphService] Successfully added/updated nodes for Invoice ID: {invoice_id} ---")
        except Exception as e:
            logger.error(f"--- [GraphService] Failed to update graph for Invoice ID {invoice_id}: {e} ---")

    def delete_node(self, node_id: str):
        """
        Removes a node and its relationships from the graph.
        Used for synchronization when deleting Invoices or Expenses from MongoDB.
        """
        if not self.driver:
            return

        try:
            with self.driver.session() as session:
                session.execute_write(self._execute_node_deletion, node_id)
            logger.info(f"--- [GraphService] Successfully deleted node with ID: {node_id} ---")
        except Exception as e:
            logger.error(f"--- [GraphService] Failed to delete node {node_id}: {e} ---")

    @staticmethod
    def _create_client_invoice_relationship(
        tx: ManagedTransaction, 
        user_id: str, 
        client_name: str, 
        invoice_id: str, 
        invoice_total: float, 
        invoice_status: str
    ):
        """
        A single, atomic transaction to create nodes and relationships.
        This ensures data integrity.
        """
        query = (
            "MERGE (c:Client {name: $client_name, userId: $user_id}) "
            "MERGE (i:Invoice {invoiceId: $invoice_id, userId: $user_id}) "
            "ON CREATE SET i.total = $invoice_total, i.status = $invoice_status "
            "ON MATCH SET i.total = $invoice_total, i.status = $invoice_status "
            "MERGE (c)-[r:HAS_INVOICE]->(i) "
            "RETURN c, i, r"
        )
        result = tx.run(query, user_id=user_id, client_name=client_name, invoice_id=invoice_id, invoice_total=invoice_total, invoice_status=invoice_status)
        return [record for record in result]

    @staticmethod
    def _execute_node_deletion(tx: ManagedTransaction, node_id: str):
        """
        Hard delete of the node and its connections.
        Matches primarily on 'invoiceId' or generic 'id'.
        """
        query = (
            "MATCH (n) "
            "WHERE n.invoiceId = $node_id OR n.id = $node_id "
            "DETACH DELETE n"
        )
        tx.run(query, node_id=node_id)