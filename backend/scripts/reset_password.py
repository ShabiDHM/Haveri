# FILE: backend/scripts/reset_password.py
# PHOENIX PROTOCOL - USER STATE CORRECTION SCRIPT V1.0
# 1. FUNCTION: Finds a user by email and overwrites their password with a new,
#    correctly hashed password. This is a surgical tool to fix corrupted user records.

import os
import sys
import pymongo
from urllib.parse import urlparse
from pymongo.errors import OperationFailure
from passlib.context import CryptContext

# Define the hashing context, identical to the main application
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Hashes the plain password."""
    return pwd_context.hash(password)

def reset_password():
    """Finds a user and resets their password."""
    mongo_url = os.environ.get("DATABASE_URI")
    if not mongo_url:
        print("❌ FATAL: DATABASE_URI environment variable not found.")
        sys.exit(1)

    if len(sys.argv) < 3:
        print("❌ FATAL: Missing arguments.")
        print("   Usage: python scripts/reset_password.py <email> <new_password>")
        sys.exit(1)
        
    target_email = sys.argv[1]
    new_password = sys.argv[2]
    
    print(f"🔧 Attempting to reset password for user: {target_email}")
    
    client = None
    try:
        client = pymongo.MongoClient(mongo_url)
        db_name = urlparse(mongo_url).path.lstrip('/')
        db = client[db_name]

        hashed_password = get_password_hash(new_password)
        update_data = {"$set": {"hashed_password": hashed_password}}
        
        for col_name in ["User", "users"]:
            collection = db[col_name]
            result = collection.update_one({"email": target_email}, update_data)
            
            if result.matched_count > 0:
                print(f"✅ SUCCESS! Password for '{target_email}' has been reset.")
                client.close()
                return

        print(f"❌ FAILED: User not found with email '{target_email}'.")

    except OperationFailure as e:
        print(f"❌ DATABASE ERROR: Authentication failed. Check DATABASE_URI in .env file.")
        print(f"   Details: {e}")
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
    finally:
        if client:
            client.close()

if __name__ == "__main__":
    reset_password()