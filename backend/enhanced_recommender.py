"""
Enhanced Recommender Module - Integrates ML pipeline with original recommender
"""
import logging
from typing import List, Dict, Tuple, Optional
from database import Database
from recommender import RecommendationEngine
from ml_pipeline import MLPipeline
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedRecommendationEngine:
    def __init__(self, db: Database = None):
        """Initialize enhanced recommendation engine with ML capabilities"""
        self.db = db or Database()
        self.original_engine = RecommendationEngine(self.db)
        self.ml_pipeline = MLPipeline(self.db)
        
        # Load existing models if available
        self.ml_pipeline._load_models()
        
    def get_recommendations(self, candidate_id: int, 
                          top_n: int = 5,
                          use_cache: bool = True,
                          use_ml: bool = True) -> List[Dict]:
        """Get enhanced recommendations with ML integration"""
        
        # Check if we have enough data for ML
        has_ml_data = self._check_ml_data_availability()
        
        if use_ml and has_ml_data:
            logger.info(f"Using ML-enhanced recommendations for candidate {candidate_id}")
            return self._get_ml_recommendations(candidate_id, top_n)
        else:
            logger.info(f"Using original recommendations for candidate {candidate_id}")
            return self._get_original_recommendations(candidate_id, top_n, use_cache)
    
    def _check_ml_data_availability(self) -> bool:
        """Check if we have enough data for ML recommendations"""
        # Check for user behavior data
        behaviors = self.db.get_user_behaviors()
        if len(behaviors) < 10:  # Need at least 10 interactions
            return False
        
        # Check for historical applications
        applications = self.db.get_historical_applications()
        if len(applications) < 5:  # Need at least 5 applications
            return False
        
        return True
    
    def _get_ml_recommendations(self, candidate_id: int, top_n: int) -> List[Dict]:
        """Get ML-enhanced recommendations"""
        try:
            # Get hybrid ML recommendations
            ml_recommendations = self.ml_pipeline.get_hybrid_recommendations(candidate_id, top_n)
            
            # Enhance with original engine data
            enhanced_recommendations = []
            for rec in ml_recommendations:
                internship = self.db.get_internship(rec['internship_id'])
                if not internship:
                    continue
                
                # Get original engine data
                candidate = self.db.get_candidate(candidate_id=candidate_id)
                if candidate:
                    orig_score, orig_explanation, matched_skills = self.original_engine.calculate_hybrid_score(
                        candidate, internship
                    )
                    
                    # Combine ML and original scores
                    combined_score = (rec['score'] * 0.7) + (orig_score * 0.3)
                    
                    # Add skill gaps
                    skill_gaps = self.original_engine.identify_skill_gaps(
                        candidate.get('skills', ''), internship
                    )
                    
                    enhanced_rec = {
                        'internship_id': rec['internship_id'],
                        'title': rec['title'],
                        'company': rec['company'],
                        'location': rec['location'],
                        'description': internship.get('description', ''),
                        'required_skills': internship.get('required_skills', ''),
                        'preferred_skills': internship.get('preferred_skills', ''),
                        'duration': internship.get('duration', ''),
                        'stipend': internship.get('stipend', ''),
                        'score': combined_score,
                        'explanation': rec['explanation'],
                        'matched_skills': matched_skills,
                        'skill_gaps': skill_gaps,
                        'method': 'enhanced_ml',
                        'ml_score': rec['score'],
                        'original_score': orig_score,
                        'score_breakdown': rec.get('score_breakdown', {})
                    }
                    
                    enhanced_recommendations.append(enhanced_rec)
            
            return enhanced_recommendations
            
        except Exception as e:
            logger.error(f"Error getting ML recommendations: {e}")
            # Fallback to original recommendations
            return self._get_original_recommendations(candidate_id, top_n, use_cache=False)
    
    def _get_original_recommendations(self, candidate_id: int, top_n: int, use_cache: bool) -> List[Dict]:
        """Get original engine recommendations"""
        return self.original_engine.get_recommendations(candidate_id, top_n, use_cache)
    
    def track_user_behavior(self, candidate_id: int, action: str, 
                          internship_id: int, metadata: Dict = None):
        """Track user behavior for ML learning"""
        self.ml_pipeline.collect_user_behavior_data(candidate_id, action, internship_id, metadata)
    
    def retrain_models(self):
        """Retrain all ML models with latest data"""
        self.ml_pipeline.retrain_models()
    
    def get_recommendation_explanation(self, candidate_id: int, 
                                     internship_id: int) -> Dict:
        """Get detailed explanation for a specific recommendation"""
        candidate = self.db.get_candidate(candidate_id=candidate_id)
        internship = self.db.get_internship(internship_id)
        
        if not candidate or not internship:
            return {"error": "Candidate or internship not found"}
        
        # Get original engine explanation
        orig_score, orig_explanation, matched_skills = self.original_engine.calculate_hybrid_score(
            candidate, internship
        )
        
        # Get ML explanations
        ml_score = self.ml_pipeline.predict_user_preference_score(candidate_id, internship)
        success_prob = self.ml_pipeline.predict_application_success(candidate, internship)
        
        # Get collaborative filtering explanation
        collab_recs = self.ml_pipeline.get_collaborative_recommendations(candidate_id, top_n=10)
        collab_score = next((r['score'] for r in collab_recs if r['internship_id'] == internship_id), 0)
        
        explanation = {
            'overall_score': (orig_score * 0.4) + (ml_score * 0.3) + (success_prob * 0.3),
            'score_breakdown': {
                'content_based': orig_score,
                'user_preference': ml_score,
                'success_probability': success_prob,
                'collaborative_filtering': collab_score
            },
            'explanations': {
                'content_based': orig_explanation,
                'user_preference': f"Matches your past preferences (Score: {ml_score:.3f})",
                'success_probability': f"Success probability: {success_prob:.1%}",
                'collaborative_filtering': f"Similar users liked this (Score: {collab_score:.3f})" if collab_score > 0 else "No similar user data available"
            },
            'matched_skills': matched_skills,
            'skill_gaps': self.original_engine.identify_skill_gaps(
                candidate.get('skills', ''), internship
            )
        }
        
        return explanation
    
    def get_user_insights(self, candidate_id: int) -> Dict:
        """Get user insights based on behavior analysis"""
        behaviors = self.db.get_user_behaviors(candidate_id=candidate_id)
        
        if not behaviors:
            return {"message": "No behavior data available yet"}
        
        # Analyze behavior patterns
        insights = {
            'total_interactions': len(behaviors),
            'action_breakdown': {},
            'preferred_skills': {},
            'preferred_companies': {},
            'preferred_locations': {},
            'application_success_rate': 0,
            'learning_recommendations': []
        }
        
        # Count actions
        for behavior in behaviors:
            action = behavior['action']
            insights['action_breakdown'][action] = insights['action_breakdown'].get(action, 0) + 1
        
        # Analyze preferences
        for behavior in behaviors:
            internship = self.db.get_internship(behavior['internship_id'])
            if not internship:
                continue
            
            # Skills
            if internship.get('required_skills'):
                skills = [s.strip().lower() for s in internship['required_skills'].split(',')]
                for skill in skills:
                    insights['preferred_skills'][skill] = insights['preferred_skills'].get(skill, 0) + 1
            
            # Companies
            company = internship.get('company', '').lower()
            if company:
                insights['preferred_companies'][company] = insights['preferred_companies'].get(company, 0) + 1
            
            # Locations
            location = internship.get('location', '').lower()
            if location:
                insights['preferred_locations'][location] = insights['preferred_locations'].get(location, 0) + 1
        
        # Calculate success rate
        applications = [b for b in behaviors if b['action'] == 'apply']
        if applications:
            # Get application statuses
            successful_apps = 0
            for app in applications:
                if self.db.is_internship_accepted(candidate_id, app['internship_id']):
                    successful_apps += 1
            
            insights['application_success_rate'] = successful_apps / len(applications)
        
        # Generate learning recommendations
        all_skills = set()
        for behavior in behaviors:
            internship = self.db.get_internship(behavior['internship_id'])
            if internship and internship.get('required_skills'):
                skills = [s.strip().lower() for s in internship['required_skills'].split(',')]
                all_skills.update(skills)
        
        # Find most common skills user doesn't have
        candidate = self.db.get_candidate(candidate_id=candidate_id)
        candidate_skills = set()
        if candidate and candidate.get('skills'):
            candidate_skills = set([s.strip().lower() for s in candidate['skills'].split(',')])
        
        missing_skills = all_skills - candidate_skills
        insights['learning_recommendations'] = list(missing_skills)[:5]
        
        return insights
    
    def get_similar_users(self, candidate_id: int, top_n: int = 5) -> List[Dict]:
        """Find similar users for networking (placeholder for future implementation)"""
        # This would implement user-to-user collaborative filtering
        # For now, return empty list
        return []
    
    def get_trending_skills(self, top_n: int = 10) -> List[Dict]:
        """Get trending skills based on recent applications"""
        behaviors = self.db.get_user_behaviors(days_back=7)  # Last 7 days
        
        skill_counts = {}
        for behavior in behaviors:
            internship = self.db.get_internship(behavior['internship_id'])
            if internship and internship.get('required_skills'):
                skills = [s.strip().lower() for s in internship['required_skills'].split(',')]
                for skill in skills:
                    skill_counts[skill] = skill_counts.get(skill, 0) + 1
        
        # Sort by count and return top skills
        trending_skills = [
            {'skill': skill, 'count': count} 
            for skill, count in sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
        ][:top_n]
        
        return trending_skills
    
    def get_market_insights(self) -> Dict:
        """Get market insights based on application data"""
        applications = self.db.get_historical_applications()
        
        if not applications:
            return {"message": "No application data available"}
        
        insights = {
            'total_applications': len(applications),
            'success_rate': 0,
            'popular_companies': {},
            'popular_locations': {},
            'average_stipend': 0,
            'skill_demand': {}
        }
        
        # Calculate success rate
        successful = len([app for app in applications if app['status'] == 'accepted'])
        insights['success_rate'] = successful / len(applications) if applications else 0
        
        # Analyze popular companies and locations
        stipends = []
        for app in applications:
            internship = self.db.get_internship(app['internship_id'])
            if not internship:
                continue
            
            # Company popularity
            company = internship.get('company', '').lower()
            if company:
                insights['popular_companies'][company] = insights['popular_companies'].get(company, 0) + 1
            
            # Location popularity
            location = internship.get('location', '').lower()
            if location:
                insights['popular_locations'][location] = insights['popular_locations'].get(location, 0) + 1
            
            # Stipend analysis
            try:
                stipend = int(internship.get('stipend', 0))
                if stipend > 0:
                    stipends.append(stipend)
            except:
                pass
            
            # Skill demand
            if internship.get('required_skills'):
                skills = [s.strip().lower() for s in internship['required_skills'].split(',')]
                for skill in skills:
                    insights['skill_demand'][skill] = insights['skill_demand'].get(skill, 0) + 1
        
        # Calculate average stipend
        if stipends:
            insights['average_stipend'] = sum(stipends) / len(stipends)
        
        # Sort by popularity
        insights['popular_companies'] = dict(sorted(insights['popular_companies'].items(), key=lambda x: x[1], reverse=True)[:5])
        insights['popular_locations'] = dict(sorted(insights['popular_locations'].items(), key=lambda x: x[1], reverse=True)[:5])
        insights['skill_demand'] = dict(sorted(insights['skill_demand'].items(), key=lambda x: x[1], reverse=True)[:10])
        
        return insights

# Testing
if __name__ == "__main__":
    from database import Database
    
    db = Database()
    enhanced_engine = EnhancedRecommendationEngine(db)
    
    # Test recommendations
    recommendations = enhanced_engine.get_recommendations(1, top_n=3)
    print(f"Generated {len(recommendations)} recommendations")
    
    # Test user insights
    insights = enhanced_engine.get_user_insights(1)
    print(f"User insights: {insights}")
    
    print("Enhanced recommendation engine initialized successfully")
