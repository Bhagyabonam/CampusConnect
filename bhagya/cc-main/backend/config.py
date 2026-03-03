import os
import pymysql

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Srilu@03',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

# Database name
DB_NAME = 'campusconnect'

def get_db_connection():
    """Create and return a database connection"""
    try:
        # First try to connect without database to create it
        temp_config = DB_CONFIG.copy()
        connection = pymysql.connect(**temp_config)
        
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
            cursor.execute(f"USE {DB_NAME}")
        
        connection.commit()
        connection.close()
        
        # Now connect with database specified
        temp_config['database'] = DB_NAME
        connection = pymysql.connect(**temp_config)
        return connection
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def init_db():
    """Initialize the database with required tables"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        with connection.cursor() as cursor:
            # Note: Tables are already created in MySQL Workbench
            # This function will just verify the connection works
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print("Database connection verified successfully!")
            
            connection.commit()
            print("Database initialized successfully!")
            return True
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        connection.rollback()
        return False
    finally:
        connection.close()

def seed_data():
    """Verify database connection and check if tables exist"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        with connection.cursor() as cursor:
            # Check if main tables exist
            tables_to_check = ['users', 'clubs', 'events', 'event_registrations', 'wishlist']
            
            for table in tables_to_check:
                cursor.execute(f"SHOW TABLES LIKE '{table}'")
                if cursor.fetchone():
                    print(f"✓ Table '{table}' exists")
                else:
                    print(f"✗ Table '{table}' not found")
            
            # Check if users table has demo data
            cursor.execute("SELECT COUNT(*) as count FROM users")
            user_count = cursor.fetchone()['count']
            
            if user_count > 0:
                print(f"✓ Database has {user_count} users")
            else:
                print("⚠ Database is empty - users will be created through the application")
            
            return True
            
    except Exception as e:
        print(f"Error checking database: {e}")
        return False
    finally:
        connection.close()
