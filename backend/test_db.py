import os
import psycopg
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit()

try:
    # Connect to Neon PostgreSQL
    with psycopg.connect(DATABASE_URL) as conn:

        with conn.cursor() as cursor:

            # Test database connection
            cursor.execute("""
                SELECT
                    version(),
                    current_database(),
                    current_user;
            """)

            result = cursor.fetchone()

            print("\nSuccessfully connected to Neon PostgreSQL!")
            print("Database:", result[1])
            print("User:", result[2])
            print("PostgreSQL version:", result[0])

except Exception as error:
    print("\nDatabase connection failed!")
    print("Error:", error)