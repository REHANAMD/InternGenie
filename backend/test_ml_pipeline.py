"""
Test Script for ML Pipeline - Demonstrates ML capabilities
"""
import logging
from database import Database
from enhanced_recommender import EnhancedRecommendationEngine
from train_ml_models import generate_sample_behavior_data, generate_sample_application_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_ml_pipeline():
    """Test the ML pipeline functionality"""
    logger.info("Testing ML Pipeline...")
    
    # Initialize components
    import os
    db_path = os.path.join(os.path.dirname(__file__), "recommendation_engine.db")
    db = Database(db_path)
    enhanced_engine = EnhancedRecommendationEngine(db)
    
    # Generate sample data if needed
    behaviors = db.get_user_behaviors()
    applications = db.get_historical_applications()
    
    if len(behaviors) < 10:
        logger.info("Generating sample behavior data...")
        generate_sample_behavior_data(db, num_users=5, num_interactions=20)
    
    if len(applications) < 5:
        logger.info("Generating sample application data...")
        generate_sample_application_data(db, num_applications=10)
    
    # Test 1: Behavior Tracking
    logger.info("\n=== Test 1: Behavior Tracking ===")
    enhanced_engine.track_user_behavior(
        candidate_id=1,
        action='view',
        internship_id=1,
        metadata={'duration': 5, 'source': 'test'}
    )
    logger.info("✅ Behavior tracking successful")
    
    # Test 2: User Insights
    logger.info("\n=== Test 2: User Insights ===")
    insights = enhanced_engine.get_user_insights(1)
    logger.info(f"User insights: {insights}")
    
    # Test 3: Market Insights
    logger.info("\n=== Test 3: Market Insights ===")
    market_insights = enhanced_engine.get_market_insights()
    logger.info(f"Market insights: {market_insights}")
    
    # Test 4: Trending Skills
    logger.info("\n=== Test 4: Trending Skills ===")
    trending = enhanced_engine.get_trending_skills()
    logger.info(f"Trending skills: {trending}")
    
    # Test 5: Enhanced Recommendations
    logger.info("\n=== Test 5: Enhanced Recommendations ===")
    recommendations = enhanced_engine.get_recommendations(1, top_n=3)
    logger.info(f"Generated {len(recommendations)} recommendations")
    
    for i, rec in enumerate(recommendations, 1):
        logger.info(f"Recommendation {i}:")
        logger.info(f"  Title: {rec['title']}")
        logger.info(f"  Company: {rec['company']}")
        logger.info(f"  Score: {rec['score']:.3f}")
        logger.info(f"  Method: {rec.get('method', 'unknown')}")
        logger.info(f"  Explanation: {rec['explanation']}")
        logger.info("")
    
    # Test 6: Recommendation Explanation
    if recommendations:
        logger.info("\n=== Test 6: Recommendation Explanation ===")
        explanation = enhanced_engine.get_recommendation_explanation(
            1, recommendations[0]['internship_id']
        )
        logger.info(f"Detailed explanation: {explanation}")
    
    logger.info("\n✅ All ML Pipeline tests completed successfully!")

if __name__ == "__main__":
    test_ml_pipeline()
