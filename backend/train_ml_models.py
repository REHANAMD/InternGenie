"""
ML Model Training Script - Train and evaluate ML models for the recommendation system
"""
import logging
import json
import os
from datetime import datetime
from database import Database
from ml_pipeline import MLPipeline
from enhanced_recommender import EnhancedRecommendationEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_sample_behavior_data(db: Database, num_users: int = 50, num_interactions: int = 200):
    """Generate sample user behavior data for training"""
    logger.info("Generating sample behavior data...")
    
    # Get all candidates and internships
    candidates = db.get_all_candidates()
    internships = db.get_all_internships()
    
    if not candidates or not internships:
        logger.warning("No candidates or internships found for behavior data generation")
        return
    
    import random
    from datetime import datetime, timedelta
    
    # Generate random behavior data
    actions = ['view', 'save', 'apply', 'dismiss']
    action_weights = [0.5, 0.2, 0.2, 0.1]  # More views than other actions
    
    for _ in range(num_interactions):
        candidate = random.choice(candidates)
        internship = random.choice(internships)
        action = random.choices(actions, weights=action_weights)[0]
        
        # Generate timestamp within last 30 days
        days_ago = random.randint(0, 30)
        timestamp = datetime.now() - timedelta(days=days_ago)
        
        metadata = {
            'duration': random.randint(1, 10),  # seconds spent viewing
            'source': random.choice(['recommendations', 'search', 'browse'])
        }
        
        behavior_record = {
            'candidate_id': candidate['id'],
            'action': action,
            'internship_id': internship['id'],
            'timestamp': timestamp.isoformat(),
            'metadata': metadata
        }
        
        db.store_user_behavior(behavior_record)
    
    logger.info(f"Generated {num_interactions} behavior records")

def generate_sample_application_data(db: Database, num_applications: int = 50):
    """Generate sample application data for success prediction"""
    logger.info("Generating sample application data...")
    
    candidates = db.get_all_candidates()
    internships = db.get_all_internships()
    
    if not candidates or not internships:
        logger.warning("No candidates or internships found for application data generation")
        return
    
    import random
    from datetime import datetime, timedelta
    
    statuses = ['accepted', 'rejected', 'pending']
    status_weights = [0.3, 0.4, 0.3]  # 30% accepted, 40% rejected, 30% pending
    
    # Only generate applications for a subset of candidates to avoid over-filtering
    selected_candidates = random.sample(candidates, min(3, len(candidates)))
    
    for _ in range(num_applications):
        candidate = random.choice(selected_candidates)
        internship = random.choice(internships)
        status = random.choices(statuses, weights=status_weights)[0]
        
        # Generate application date within last 90 days
        days_ago = random.randint(0, 90)
        applied_at = datetime.now() - timedelta(days=days_ago)
        
        # Insert application
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO applications (candidate_id, internship_id, status, applied_at)
            VALUES (?, ?, ?, ?)
        ''', (candidate['id'], internship['id'], status, applied_at.isoformat()))
        
        conn.commit()
        conn.close()
    
    logger.info(f"Generated {num_applications} application records for {len(selected_candidates)} candidates")

def evaluate_models(enhanced_engine: EnhancedRecommendationEngine):
    """Evaluate ML model performance"""
    logger.info("Evaluating model performance...")
    
    # Get test users
    test_users = enhanced_engine.db.get_all_candidates()[:5]  # Test with first 5 users
    
    if not test_users:
        logger.warning("No test users available")
        return
    
    evaluation_results = {
        'collaborative_filtering': {'precision': 0, 'recall': 0, 'f1': 0},
        'user_preference': {'precision': 0, 'recall': 0, 'f1': 0},
        'success_prediction': {'accuracy': 0, 'precision': 0, 'recall': 0}
    }
    
    # Test collaborative filtering
    try:
        collab_scores = []
        for user in test_users:
            recommendations = enhanced_engine.ml_pipeline.get_collaborative_recommendations(
                user['id'], top_n=5
            )
            if recommendations:
                avg_score = sum(r['score'] for r in recommendations) / len(recommendations)
                collab_scores.append(avg_score)
        
        if collab_scores:
            evaluation_results['collaborative_filtering']['precision'] = sum(collab_scores) / len(collab_scores)
    except Exception as e:
        logger.error(f"Error evaluating collaborative filtering: {e}")
    
    # Test user preference learning
    try:
        pref_scores = []
        for user in test_users:
            # Test with a random internship
            internships = enhanced_engine.db.get_all_internships()[:3]
            for internship in internships:
                score = enhanced_engine.ml_pipeline.predict_user_preference_score(
                    user['id'], internship
                )
                pref_scores.append(score)
        
        if pref_scores:
            evaluation_results['user_preference']['precision'] = sum(pref_scores) / len(pref_scores)
    except Exception as e:
        logger.error(f"Error evaluating user preference: {e}")
    
    # Test success prediction
    try:
        success_scores = []
        applications = enhanced_engine.db.get_historical_applications()[:10]
        
        for app in applications:
            candidate = enhanced_engine.db.get_candidate(app['candidate_id'])
            internship = enhanced_engine.db.get_internship(app['internship_id'])
            
            if candidate and internship:
                success_prob = enhanced_engine.ml_pipeline.predict_application_success(
                    candidate, internship
                )
                success_scores.append(success_prob)
        
        if success_scores:
            evaluation_results['success_prediction']['accuracy'] = sum(success_scores) / len(success_scores)
    except Exception as e:
        logger.error(f"Error evaluating success prediction: {e}")
    
    logger.info(f"Evaluation results: {evaluation_results}")
    return evaluation_results

def main():
    """Main training function"""
    logger.info("Starting ML model training...")
    
    # Initialize database and components
    import os
    db_path = os.path.join(os.path.dirname(__file__), "recommendation_engine.db")
    db = Database(db_path)
    enhanced_engine = EnhancedRecommendationEngine(db)
    
    # Generate sample data if needed
    behaviors = db.get_user_behaviors()
    applications = db.get_historical_applications()
    
    if len(behaviors) < 50:
        logger.info("Generating sample behavior data...")
        generate_sample_behavior_data(db, num_users=20, num_interactions=100)
    
    if len(applications) < 20:
        logger.info("Generating sample application data...")
        generate_sample_application_data(db, num_applications=50)
    
    # Train models
    logger.info("Training collaborative filtering models...")
    enhanced_engine.ml_pipeline.train_collaborative_filtering()
    
    logger.info("Training user preference models...")
    enhanced_engine.ml_pipeline.train_user_preference_models()
    
    logger.info("Training success prediction model...")
    enhanced_engine.ml_pipeline.train_success_prediction_model()
    
    # Evaluate models
    evaluation_results = evaluate_models(enhanced_engine)
    
    # Save evaluation results
    with open('ml_evaluation_results.json', 'w') as f:
        json.dump(evaluation_results, f, indent=2)
    
    logger.info("ML model training completed successfully!")
    logger.info(f"Evaluation results saved to ml_evaluation_results.json")
    
    # Test enhanced recommendations
    logger.info("Testing enhanced recommendations...")
    test_user = db.get_all_candidates()[0] if db.get_all_candidates() else None
    
    if test_user:
        recommendations = enhanced_engine.get_recommendations(test_user['id'], top_n=3)
        logger.info(f"Generated {len(recommendations)} recommendations for test user")
        
        for i, rec in enumerate(recommendations, 1):
            logger.info(f"Recommendation {i}: {rec['title']} at {rec['company']} (Score: {rec['score']:.3f})")
            logger.info(f"Explanation: {rec['explanation']}")

if __name__ == "__main__":
    main()
