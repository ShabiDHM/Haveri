# FILE: scripts/force_admin.py
# PHOENIX PROTOCOL - SCRIPT TRANSFORMATION V2.2 (LINTER VALIDATED)
# 1. FIX: Added the correct import 'from pymongo.errors import OperationFailure'
#    at the top of the file to resolve all Pylance diagnostic errors.
# 2. ARCHITECTURE: The script correctly reads the DATABASE_URI from the environment.
# 3. DYNAMIC: The script correctly uses the email address from the command-line.

import os
import sys
import pymongo
from urllib.parse import urlparse
from pymongo.errors import OperationFailure

def promote():
    """
    Elevates a user to full admin status by reading the database configuration
    from the environment variables.
    """
    mongo_url = os.environ.get("DATABASE_URI")
    if not mongo_url:
        print("❌ FATAL: DATABASE_URI environment variable not found.")
        print("   This script must be run inside the 'backend' container using 'docker-compose exec'.")
        sys.exit(1)

    if len(sys.argv) < 2:
        print("❌ FATAL: No email address provided.")
        print("   Usage: python scripts/force_admin.py user@example.com")
        sys.exit(1)
    target_email = sys.argv[1]
    
    print(f"🔧 Attempting to promote user: {target_email}")
    
    client = None
    try:
        print("🔧 Connecting to Database...")
        client = pymongo.MongoClient(mongo_url)
        
        db_name = urlparse(mongo_url).path.lstrip('/')
        if not db_name:
             raise ValueError("No database specified in DATABASE_URI path (e.g., .../haveri_main_db)")
        db = client[db_name]

        update_data = {
            "$set": {
                "role": "admin",
                "is_superuser": True,
                "is_staff": True,
                "subscription_status": "active"
            }
        }
        
        for col_name in ["User", "users"]:
            collection = db[col_name]
            result = collection.update_one({"email": target_email}, update_data)
            
            if result.matched_count > 0:
                print(f"✅ SUCCESS! User '{target_email}' in collection '{col_name}' is now an ADMIN.")
                client.close()
                return

        print(f"❌ FAILED: User not found. Could not find user with email '{target_email}' in the database.")

    except OperationFailure as e:
        print(f"❌ DATABASE ERROR: Authentication failed. Is the DATABASE_URI in your .env file correct?")
        print(f"   Details: {e}")
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
    finally:
        if client:
            client.close()

if __name__ == "__main__":
    promote()