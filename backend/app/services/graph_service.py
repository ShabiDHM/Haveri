# FILE: backend/app/services/graph_service.py
# PHOENIX PROTOCOL - GRAPH SERVICE V1.1 (TYPE CORRECTION)
# 1. FIX: Changed the expected invoice type from 'InvoiceOut' to 'InvoiceInDB' to match the service layer.
# 2. STATUS: Resolves the Pylance type mismatch error.

from neo4j import Driver, ManagedTransaction
from fastapi import Depends
import logging

from app.core.db import get_neo4j_driver
from app.models.finance import InvoiceInDB # <-- CORRECTED IMPORT

logger = logging.getLogger(__name__)

class GraphService:
    def __init__(self, driver: Driver = Depends(get_neo4j_driver)):
        self.driver = driver

    def add_or_update_client_and_invoice(self, invoice: InvoiceInDB): # <-- CORRECTED TYPE HINT
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