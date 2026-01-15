# FILE: backend/app/services/graph_service.py
# PHOENIX PROTOCOL - GRAPH SERVICE V2.1 (UNIVERSAL DELETE)
# 1. ROBUSTNESS: delete_node now checks invoiceId, expenseId, inventoryId, productId, and documentId.
# 2. COVERAGE: Ensures expenses, recipes, and inventory items are properly wiped from the graph.

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
        Universally removes a node from the graph by checking ALL potential ID fields.
        This handles Invoices, Expenses, Inventory, Products, and Documents.
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
        Universal Search & Destroy.
        Checks every possible ID variant to ensure the node is found and removed.
        """
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