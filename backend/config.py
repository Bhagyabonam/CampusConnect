import os
import pymysql

DB_CONFIG = {
    "host": os.getenv("MYSQLHOST") or os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("MYSQLUSER") or os.getenv("DB_USER", "root"),
    "password": os.getenv("MYSQLPASSWORD") or os.getenv("DB_PASSWORD"),
    "database": os.getenv("MYSQLDATABASE") or os.getenv("DB_NAME", "campusconnect"),
    "port": int(os.getenv("MYSQLPORT", 3306)),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": True,
}

def get_db_connection():
    try:
        return pymysql.connect(**DB_CONFIG)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def init_db():
    conn = get_db_connection()
    if not conn:
        return False
    conn.close()
    return True


def seed_data():
    return True

print(os.getenv("DB_PASSWORD"))