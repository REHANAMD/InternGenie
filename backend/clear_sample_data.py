"""
Clear Sample Data Script - Remove sample data to reset the system
"""
import logging
from database import Database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clear_sample_data():
    """Clear all sample data from the database"""
    logger.info("Clearing sample data...")
    
    import os
    db_path = os.path.join(os.path.dirname(__file__), "recommendation_engine.db")
    db = Database(db_path)
    conn = db.get_connection()
    cursor = conn.cursor()
    
    try:
        # Clear applications
        cursor.execute('DELETE FROM applications')
        logger.info("Cleared applications table")
        
        # Clear user behaviors
        cursor.execute('DELETE FROM user_behaviors')
        logger.info("Cleared user_behaviors table")
        
        # Clear recommendations cache
        cursor.execute('DELETE FROM recommendations')
        logger.info("Cleared recommendations cache")
        
        conn.commit()
        logger.info("Sample data cleared successfully!")
        
    except Exception as e:
        logger.error(f"Error clearing sample data: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    clear_sample_data()
