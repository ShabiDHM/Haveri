# FILE: backend/scripts/force_admin.py
# PHOENIX PROTOCOL - DEFINITIVE CORRECTION V3.0
# 1. FIX: The script now correctly sets 'subscription_status' to 'active'
#    in addition to setting the admin role. This was the final gatekeeper
#    preventing login.

import os
import sys
import pymongo
from urllib.parse import urlparse
from pymongo.errors import OperationFailure

def promote():
    mongo_url = os.environ.get("DATABASE_URI")
    if not mongo_url:
        print("❌ FATAL: DATABASE_URI environment variable not found.")
        sys.exit(1)

    if len(sys.argv) < 2:
        print("❌ FATAL: No email address provided.")
        sys.exit(1)
    target_email = sys.argv[1]
    
    print(f"🔧 Attempting to activate and promote user: {target_email}")
    
    client = None
    try:
        client = pymongo.MongoClient(mongo_url)
        db_name = urlparse(mongo_url).path.lstrip('/')
        db = client[db_name]

        # --- THE DEFINITIVE FIX IS HERE ---
        update_data = {
            "$set": {
                "role": "admin",
                "is_superuser": True,
                "is_staff": True,
                "subscription_status": "active"  # This was the missing piece.
            }
        }
        
        for col_name in ["User", "users"]:
            collection = db[col_name]
            result = collection.update_one({"email": target_email}, update_data)
            
            if result.matched_count > 0:
                print(f"✅ SUCCESS! User '{target_email}' is now an ACTIVE ADMIN.")
                client.close()
                return

        print(f"❌ FAILED: User not found with email '{target_email}'.")

    except OperationFailure as e:
        print(f"❌ DATABASE ERROR: {e}")
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
    finally:
        if client:
            client.close()

if __name__ == "__main__":
    promote()
