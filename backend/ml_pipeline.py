"""
ML Pipeline Module - Advanced machine learning for recommendation system
"""
import numpy as np
import pandas as pd
from sklearn.decomposition import NMF, TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from database import Database
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLPipeline:
    def __init__(self, db: Database = None):
        """Initialize ML pipeline with models and data processors"""
        if db is None:
            # Use backend database path if no database provided
            db_path = os.path.join(os.path.dirname(__file__), "recommendation_engine.db")
            self.db = Database(db_path)
        else:
            self.db = db
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.user_behavior_data = {}
        self.model_path = "models/"
        os.makedirs(self.model_path, exist_ok=True)
        
        # Initialize models
        self._initialize_models()
        
    def _initialize_models(self):
        """Initialize ML models"""
        # Collaborative Filtering Models
        self.models['collaborative_filtering'] = {
            'nmf': NMF(n_components=50, random_state=42, max_iter=200),
            'svd': TruncatedSVD(n_components=50, random_state=42)
        }
        
        # Content-based filtering
        self.models['content_based'] = {
            'skill_similarity': None,  # Will be computed dynamically
            'location_similarity': None
        }
        
        # Success prediction model
        self.models['success_prediction'] = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            max_depth=10
        )
        
        # User behavior learning
        self.models['user_preference'] = {
            'skill_preference': RandomForestRegressor(n_estimators=50, random_state=42),
            'company_preference': RandomForestRegressor(n_estimators=50, random_state=42),
            'location_preference': RandomForestRegressor(n_estimators=50, random_state=42)
        }
        
        # Scalers and encoders
        self.scalers['features'] = StandardScaler()
        self.encoders['skills'] = LabelEncoder()
        self.encoders['companies'] = LabelEncoder()
        self.encoders['locations'] = LabelEncoder()
        
    def collect_user_behavior_data(self, candidate_id: int, action: str, 
                                 internship_id: int, metadata: Dict = None):
        """Collect user behavior data for learning"""
        behavior_record = {
            'candidate_id': candidate_id,
            'action': action,  # 'view', 'apply', 'save', 'dismiss', 'accept'
            'internship_id': internship_id,
            'timestamp': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        # Store in database
        self.db.store_user_behavior(behavior_record)
        
        # Update in-memory cache
        if candidate_id not in self.user_behavior_data:
            self.user_behavior_data[candidate_id] = []
        self.user_behavior_data[candidate_id].append(behavior_record)
        
        logger.info(f"Recorded behavior: {action} for candidate {candidate_id}, internship {internship_id}")
    
    def build_interaction_matrix(self) -> Tuple[np.ndarray, List[int], List[int]]:
        """Build user-item interaction matrix for collaborative filtering"""
        # Get all user behaviors
        behaviors = self.db.get_user_behaviors()
        
        if not behaviors:
            logger.warning("No user behavior data found for collaborative filtering")
            return np.array([]), [], []
        
        # Create interaction matrix
        users = list(set([b['candidate_id'] for b in behaviors]))
        items = list(set([b['internship_id'] for b in behaviors]))
        
        # Create mapping
        user_to_idx = {user: idx for idx, user in enumerate(users)}
        item_to_idx = {item: idx for idx, item in enumerate(items)}
        
        # Build matrix with weighted interactions
        interaction_weights = {
            'view': 1,
            'save': 3,
            'apply': 5,
            'accept': 10,
            'dismiss': -1
        }
        
        matrix = np.zeros((len(users), len(items)))
        
        for behavior in behaviors:
            user_idx = user_to_idx[behavior['candidate_id']]
            item_idx = item_to_idx[behavior['internship_id']]
            weight = interaction_weights.get(behavior['action'], 1)
            
            # Use max weight if multiple interactions
            matrix[user_idx, item_idx] = max(matrix[user_idx, item_idx], weight)
        
        return matrix, users, items
    
    def train_collaborative_filtering(self):
        """Train collaborative filtering models"""
        logger.info("Training collaborative filtering models...")
        
        matrix, users, items = self.build_interaction_matrix()
        
        if matrix.size == 0:
            logger.warning("No interaction data available for collaborative filtering")
            return
        
        # Train NMF model
        try:
            self.models['collaborative_filtering']['nmf'].fit(matrix)
            logger.info("NMF model trained successfully")
        except Exception as e:
            logger.error(f"Error training NMF model: {e}")
        
        # Train SVD model with adaptive components
        try:
            n_components = min(50, matrix.shape[1] - 1)  # Ensure n_components < n_features
            if n_components > 0:
                self.models['collaborative_filtering']['svd'] = TruncatedSVD(n_components=n_components, random_state=42)
                self.models['collaborative_filtering']['svd'].fit(matrix)
                logger.info(f"SVD model trained successfully with {n_components} components")
            else:
                logger.warning("Not enough features for SVD model")
        except Exception as e:
            logger.error(f"Error training SVD model: {e}")
        
        # Save user and item mappings
        self.user_item_mapping = {
            'users': users,
            'items': items,
            'user_to_idx': {user: idx for idx, user in enumerate(users)},
            'item_to_idx': {item: idx for idx, item in enumerate(items)}
        }
        
        # Save models
        self._save_models()
    
    def get_collaborative_recommendations(self, candidate_id: int, 
                                        top_n: int = 10) -> List[Dict]:
        """Get recommendations using collaborative filtering"""
        if 'user_item_mapping' not in self.__dict__:
            logger.warning("Collaborative filtering not trained yet")
            return []
        
        if candidate_id not in self.user_item_mapping['user_to_idx']:
            logger.warning(f"User {candidate_id} not in training data")
            return []
        
        user_idx = self.user_item_mapping['user_to_idx'][candidate_id]
        
        # Get user factors from NMF
        user_factors = self.models['collaborative_filtering']['nmf'].transform(
            self.user_item_mapping['matrix'][user_idx:user_idx+1]
        )[0]
        
        # Get item factors
        item_factors = self.models['collaborative_filtering']['nmf'].components_.T
        
        # Calculate scores
        scores = np.dot(item_factors, user_factors)
        
        # Get top recommendations
        top_indices = np.argsort(scores)[::-1][:top_n]
        
        recommendations = []
        for idx in top_indices:
            internship_id = self.user_item_mapping['items'][idx]
            score = scores[idx]
            
            # Get internship details
            internship = self.db.get_internship(internship_id)
            if internship:
                recommendations.append({
                    'internship_id': internship_id,
                    'score': float(score),
                    'method': 'collaborative_filtering',
                    'explanation': f"Similar users also liked this internship (Score: {score:.3f})"
                })
        
        return recommendations
    
    def build_user_preference_features(self, candidate_id: int) -> Dict[str, Any]:
        """Build user preference features for learning"""
        # Get user behavior history
        behaviors = self.db.get_user_behaviors(candidate_id=candidate_id)
        
        if not behaviors:
            return {}
        
        # Analyze preferences
        preferences = {
            'skill_preferences': {},
            'company_preferences': {},
            'location_preferences': {},
            'stipend_preferences': [],
            'duration_preferences': [],
            'action_patterns': {}
        }
        
        for behavior in behaviors:
            internship = self.db.get_internship(behavior['internship_id'])
            if not internship:
                continue
            
            action = behavior['action']
            weight = {'view': 1, 'save': 2, 'apply': 3, 'accept': 5}.get(action, 1)
            
            # Skill preferences
            if internship.get('required_skills'):
                skills = internship['required_skills'].split(',')
                for skill in skills:
                    skill = skill.strip().lower()
                    preferences['skill_preferences'][skill] = \
                        preferences['skill_preferences'].get(skill, 0) + weight
            
            # Company preferences
            company = internship.get('company', '').lower()
            if company:
                preferences['company_preferences'][company] = \
                    preferences['company_preferences'].get(company, 0) + weight
            
            # Location preferences
            location = internship.get('location', '').lower()
            if location:
                preferences['location_preferences'][location] = \
                    preferences['location_preferences'].get(location, 0) + weight
            
            # Stipend preferences
            if internship.get('stipend'):
                try:
                    stipend = int(internship['stipend'])
                    preferences['stipend_preferences'].append(stipend)
                except:
                    pass
            
            # Duration preferences
            if internship.get('duration'):
                preferences['duration_preferences'].append(internship['duration'])
            
            # Action patterns
            preferences['action_patterns'][action] = \
                preferences['action_patterns'].get(action, 0) + 1
        
        return preferences
    
    def train_user_preference_models(self):
        """Train user preference learning models"""
        logger.info("Training user preference models...")
        
        # Get all users with behavior data
        users = self.db.get_users_with_behaviors()
        
        if not users:
            logger.warning("No users with behavior data found")
            return
        
        # Prepare training data
        X_skill = []
        X_company = []
        X_location = []
        y_skill = []
        y_company = []
        y_location = []
        
        for user_id in users:
            preferences = self.build_user_preference_features(user_id)
            
            if not preferences:
                continue
            
            # Skill preferences
            for skill, score in preferences['skill_preferences'].items():
                X_skill.append([user_id, len(preferences['skill_preferences'])])
                y_skill.append(score)
            
            # Company preferences
            for company, score in preferences['company_preferences'].items():
                X_company.append([user_id, len(preferences['company_preferences'])])
                y_company.append(score)
            
            # Location preferences
            for location, score in preferences['location_preferences'].items():
                X_location.append([user_id, len(preferences['location_preferences'])])
                y_location.append(score)
        
        # Train models
        if X_skill:
            self.models['user_preference']['skill_preference'].fit(X_skill, y_skill)
            logger.info("Skill preference model trained")
        
        if X_company:
            self.models['user_preference']['company_preference'].fit(X_company, y_company)
            logger.info("Company preference model trained")
        
        if X_location:
            self.models['user_preference']['location_preference'].fit(X_location, y_location)
            logger.info("Location preference model trained")
    
    def predict_user_preference_score(self, candidate_id: int, 
                                    internship: Dict) -> float:
        """Predict user preference score for an internship"""
        preferences = self.build_user_preference_features(candidate_id)
        
        if not preferences:
            return 0.5  # Neutral score
        
        score = 0.0
        factors = 0
        
        # Skill preference score
        if internship.get('required_skills'):
            skills = [s.strip().lower() for s in internship['required_skills'].split(',')]
            skill_scores = [preferences['skill_preferences'].get(skill, 0) for skill in skills]
            if skill_scores:
                score += np.mean(skill_scores) * 0.4
                factors += 0.4
        
        # Company preference score
        company = internship.get('company', '').lower()
        if company and company in preferences['company_preferences']:
            score += preferences['company_preferences'][company] * 0.3
            factors += 0.3
        
        # Location preference score
        location = internship.get('location', '').lower()
        if location and location in preferences['location_preferences']:
            score += preferences['location_preferences'][location] * 0.3
            factors += 0.3
        
        # Normalize score
        if factors > 0:
            return min(score / factors, 1.0)
        
        return 0.5
    
    def build_success_prediction_features(self, candidate: Dict, 
                                        internship: Dict) -> np.ndarray:
        """Build features for success prediction"""
        features = []
        
        # Candidate features
        features.append(candidate.get('experience_years', 0))
        features.append(len(candidate.get('skills', '').split(',')) if candidate.get('skills') else 0)
        
        # Education level
        education_hierarchy = {
            'high school': 1, 'diploma': 2, 'bachelor': 3, 
            'master': 4, 'phd': 5
        }
        education = candidate.get('education', '').lower()
        education_level = 0
        for edu, level in education_hierarchy.items():
            if edu in education:
                education_level = level
                break
        features.append(education_level)
        
        # Internship features
        features.append(len(internship.get('required_skills', '').split(',')) if internship.get('required_skills') else 0)
        features.append(len(internship.get('preferred_skills', '').split(',')) if internship.get('preferred_skills') else 0)
        
        # Stipend amount
        try:
            stipend = int(internship.get('stipend', 0))
            features.append(stipend)
        except:
            features.append(0)
        
        # Duration in months
        duration = internship.get('duration', '')
        duration_months = 0
        if 'month' in duration.lower():
            try:
                duration_months = int(duration.split()[0])
            except:
                pass
        features.append(duration_months)
        
        return np.array(features)
    
    def train_success_prediction_model(self):
        """Train model to predict application success"""
        logger.info("Training success prediction model...")
        
        # Get historical application data
        applications = self.db.get_historical_applications()
        
        if not applications:
            logger.warning("No historical application data found")
            return
        
        X = []
        y = []
        
        for app in applications:
            candidate = self.db.get_candidate(candidate_id=app['candidate_id'])
            internship = self.db.get_internship(app['internship_id'])
            
            if not candidate or not internship:
                continue
            
            features = self.build_success_prediction_features(candidate, internship)
            X.append(features)
            
            # Success label (1 for accepted, 0 for rejected/pending)
            success = 1 if app['status'] == 'accepted' else 0
            y.append(success)
        
        if not X:
            logger.warning("No valid training data for success prediction")
            return
        
        X = np.array(X)
        y = np.array(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train model
        self.models['success_prediction'].fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.models['success_prediction'].predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        
        logger.info(f"Success prediction model trained - MSE: {mse:.4f}, MAE: {mae:.4f}")
        
        # Save model
        self._save_models()
    
    def predict_application_success(self, candidate: Dict, 
                                  internship: Dict) -> float:
        """Predict likelihood of application success"""
        features = self.build_success_prediction_features(candidate, internship)
        features = features.reshape(1, -1)
        
        try:
            success_prob = self.models['success_prediction'].predict_proba(features)[0][1]
            return float(success_prob)
        except:
            return 0.5  # Default neutral probability
    
    def generate_explanation(self, candidate: Dict, internship: Dict, 
                           score: float, method: str) -> str:
        """Generate human-readable explanation for recommendation"""
        explanations = []
        
        # Base explanation
        if method == 'collaborative_filtering':
            explanations.append("Similar users with your profile also liked this internship")
        elif method == 'content_based':
            explanations.append("This internship matches your skills and preferences")
        elif method == 'hybrid':
            explanations.append("This internship combines multiple matching factors")
        
        # Skill matching explanation
        candidate_skills = set(candidate.get('skills', '').lower().split(','))
        required_skills = set(internship.get('required_skills', '').lower().split(','))
        matched_skills = candidate_skills.intersection(required_skills)
        
        if matched_skills:
            explanations.append(f"Skills match: {', '.join(list(matched_skills)[:3])}")
        
        # Location explanation
        if candidate.get('location') and internship.get('location'):
            if 'remote' in internship.get('location', '').lower():
                explanations.append("Remote opportunity")
            elif candidate.get('location').lower() == internship.get('location').lower():
                explanations.append(f"Location match: {candidate.get('location')}")
        
        # Success probability explanation
        success_prob = self.predict_application_success(candidate, internship)
        if success_prob > 0.7:
            explanations.append("High success probability based on similar profiles")
        elif success_prob > 0.5:
            explanations.append("Good success probability")
        
        # User preference explanation
        pref_score = self.predict_user_preference_score(candidate_id=candidate.get('id'), internship=internship)
        if pref_score > 0.7:
            explanations.append("Matches your past preferences")
        
        return " | ".join(explanations) if explanations else "Good potential match"
    
    def get_hybrid_recommendations(self, candidate_id: int, 
                                 top_n: int = 10) -> List[Dict]:
        """Get hybrid recommendations combining all methods"""
        candidate = self.db.get_candidate(candidate_id=candidate_id)
        if not candidate:
            return []
        
        # Get all available internships
        internships = self.db.get_all_internships(active_only=True)
        
        # CRITICAL FIX: Filter out applied internships
        filtered_internships = []
        for internship in internships:
            internship_id = internship['id']
            # Check if candidate has applied for this internship (excluding withdrawn)
            if not self.db.is_internship_applied(candidate_id, internship_id):
                if not self.db.is_internship_accepted(candidate_id, internship_id):
                    filtered_internships.append(internship)
                else:
                    logger.info(f"Excluding accepted internship {internship_id} ({internship['title']}) for candidate {candidate_id}")
            else:
                logger.info(f"Excluding applied internship {internship_id} ({internship['title']}) for candidate {candidate_id}")
        
        logger.info(f"ML Pipeline: Filtered {len(internships)} internships to {len(filtered_internships)} (removed {len(internships) - len(filtered_internships)} applied ones)")
        
        recommendations = []
        
        for internship in filtered_internships:
            # Calculate different scores
            scores = {}
            
            # Collaborative filtering score
            collab_recs = self.get_collaborative_recommendations(candidate_id, top_n=len(filtered_internships))
            collab_score = next((r['score'] for r in collab_recs if r['internship_id'] == internship['id']), 0)
            scores['collaborative'] = collab_score
            
            # User preference score
            pref_score = self.predict_user_preference_score(candidate_id, internship)
            scores['preference'] = pref_score
            
            # Success prediction score
            success_score = self.predict_application_success(candidate, internship)
            scores['success'] = success_score
            
            # Content-based score (from original recommender)
            from recommender import RecommendationEngine
            orig_engine = RecommendationEngine(self.db)
            content_score, _, _ = orig_engine.calculate_hybrid_score(candidate, internship)
            scores['content'] = content_score
            
            # IMPROVED: More dynamic weighting based on data availability
            weights = {
                'collaborative': 0.3,
                'preference': 0.25,
                'success': 0.2,
                'content': 0.25
            }
            
            # Adjust weights based on data quality
            if scores['collaborative'] == 0:  # No collaborative data
                weights['collaborative'] = 0.1
                weights['content'] = 0.4
            if scores['preference'] == 0:  # No preference data
                weights['preference'] = 0.1
                weights['content'] = 0.4
            
            # Normalize weights
            total_weight = sum(weights.values())
            for key in weights:
                weights[key] /= total_weight
            
            final_score = (
                scores['collaborative'] * weights['collaborative'] +
                scores['preference'] * weights['preference'] +
                scores['success'] * weights['success'] +
                scores['content'] * weights['content']
            )
            
            # Generate explanation
            explanation = self.generate_explanation(candidate, internship, final_score, 'hybrid')
            
            recommendations.append({
                'internship_id': internship['id'],
                'title': internship['title'],
                'company': internship['company'],
                'location': internship['location'],
                'score': final_score,
                'explanation': explanation,
                'method': 'hybrid_ml',
                'score_breakdown': scores
            })
        
        # Apply score normalization to prevent clustering
        recommendations = self._normalize_ml_scores(recommendations)
        
        # Sort by score and return top N
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        # FINAL SAFETY CHECK: Ensure no applied internships are in recommendations
        final_recommendations = []
        for rec in recommendations:
            internship_id = rec['internship_id']
            if not self.db.is_internship_applied(candidate_id, internship_id):
                if not self.db.is_internship_accepted(candidate_id, internship_id):
                    final_recommendations.append(rec)
                else:
                    logger.warning(f"ML Pipeline CRITICAL: Accepted internship {internship_id} still in recommendations! Removing...")
            else:
                logger.warning(f"ML Pipeline CRITICAL: Applied internship {internship_id} still in recommendations! Removing...")
        
        logger.info(f"ML Pipeline Final: {len(final_recommendations)} recommendations (removed {len(recommendations) - len(final_recommendations)} applied ones)")
        return final_recommendations[:top_n]
    
    def _normalize_ml_scores(self, recommendations: List[Dict]) -> List[Dict]:
        """Normalize ML scores to prevent clustering and improve differentiation"""
        if not recommendations:
            return recommendations
        
        scores = [rec['score'] for rec in recommendations]
        if not scores:
            return recommendations
        
        # Calculate statistics
        min_score = min(scores)
        max_score = max(scores)
        score_range = max_score - min_score
        
        # If all scores are too similar, apply normalization
        if score_range < 0.15:  # Less than 15% difference for ML scores
            # Apply more aggressive scaling for ML scores
            for rec in recommendations:
                original_score = rec['score']
                # Apply exponential scaling to create more differentiation
                normalized_score = (original_score - min_score) / max(score_range, 0.01)
                rec['score'] = min(1.0, normalized_score * 0.7 + 0.3)  # Scale to 0.3-1.0 range
        
        return recommendations
    
    def _save_models(self):
        """Save trained models to disk"""
        try:
            for model_name, model in self.models.items():
                if isinstance(model, dict):
                    for sub_name, sub_model in model.items():
                        if sub_model is not None:
                            joblib.dump(sub_model, f"{self.model_path}/{model_name}_{sub_name}.joblib")
                else:
                    joblib.dump(model, f"{self.model_path}/{model_name}.joblib")
            
            # Save scalers and encoders
            for name, scaler in self.scalers.items():
                joblib.dump(scaler, f"{self.model_path}/scaler_{name}.joblib")
            
            for name, encoder in self.encoders.items():
                joblib.dump(encoder, f"{self.model_path}/encoder_{name}.joblib")
            
            logger.info("Models saved successfully")
        except Exception as e:
            logger.error(f"Error saving models: {e}")
    
    def _load_models(self):
        """Load trained models from disk"""
        try:
            # Load models
            for model_name in ['collaborative_filtering', 'success_prediction', 'user_preference']:
                model_path = f"{self.model_path}/{model_name}.joblib"
                if os.path.exists(model_path):
                    self.models[model_name] = joblib.load(model_path)
            
            # Load scalers and encoders
            for name in ['features']:
                scaler_path = f"{self.model_path}/scaler_{name}.joblib"
                if os.path.exists(scaler_path):
                    self.scalers[name] = joblib.load(scaler_path)
            
            logger.info("Models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    def retrain_models(self):
        """Retrain all models with latest data"""
        logger.info("Retraining all ML models...")
        
        # Train collaborative filtering
        self.train_collaborative_filtering()
        
        # Train user preference models
        self.train_user_preference_models()
        
        # Train success prediction
        self.train_success_prediction_model()
        
        logger.info("All models retrained successfully")

# Testing
if __name__ == "__main__":
    from database import Database
    import os
    
    db_path = os.path.join(os.path.dirname(__file__), "recommendation_engine.db")
    db = Database(db_path)
    ml_pipeline = MLPipeline(db)
    
    # Test user behavior collection
    ml_pipeline.collect_user_behavior_data(1, 'view', 1, {'duration': 5})
    ml_pipeline.collect_user_behavior_data(1, 'save', 1)
    
    print("ML Pipeline initialized successfully")
