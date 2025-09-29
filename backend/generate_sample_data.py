#!/usr/bin/env python3
"""
Generate Sample Data Script - Generate sample behavior and application data for testing insights
"""
import logging
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Database
from train_ml_models import generate_sample_behavior_data, generate_sample_application_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Generate sample data for testing insights"""
    logger.info("Starting sample data generation...")
    
    # Initialize database
    import os
    db_path = os.path.join(os.path.dirname(__file__), "recommendation_engine.db")
    db = Database(db_path)
    
    # Generate behavior data
    logger.info("Generating user behavior data...")
    generate_sample_behavior_data(db, num_users=10, num_interactions=100)
    
    # Generate application data
    logger.info("Generating application data...")
    generate_sample_application_data(db, num_applications=30)
    
    # Check what we generated
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM user_behaviors")
    behavior_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM applications")
    application_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM internships")
    internship_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM candidates")
    candidate_count = cursor.fetchone()[0]
    
    conn.close()
    
    logger.info(f"Sample data generation complete!")
    logger.info(f"Generated {behavior_count} behavior records")
    logger.info(f"Generated {application_count} applications")
    logger.info(f"Total internships: {internship_count}")
    logger.info(f"Total candidates: {candidate_count}")
    
    print("\n✅ Sample data generated successfully!")
    print(f"📊 {behavior_count} behavior records")
    print(f"📝 {application_count} applications")
    print(f"🏢 {internship_count} internships")
    print(f"👥 {candidate_count} candidates")
    print("\nNow you can test the insights page with real data!")

if __name__ == "__main__":
    main()
