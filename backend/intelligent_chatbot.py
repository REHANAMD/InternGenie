#!/usr/bin/env python3
"""
Intelligent Chatbot Service for InternGenie
A context-aware, privacy-respecting chatbot that provides intelligent responses
about internships while respecting user privacy preferences.
"""

import os
import json
import logging
import re
import random
from typing import Dict, Any, List, Optional, Tuple
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib
from datetime import datetime

logger = logging.getLogger(__name__)

class IntentClassifier(nn.Module):
    """Neural network for intent classification"""
    
    def __init__(self, vocab_size: int, embedding_dim: int, hidden_dim: int, num_intents: int):
        super(IntentClassifier, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Linear(hidden_dim * 2, num_intents)
        
    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, _ = self.lstm(embedded)
        # Use the last output
        last_output = lstm_out[:, -1, :]
        dropped = self.dropout(last_output)
        return self.classifier(dropped)

class IntelligentChatbotService:
    """Intelligent, context-aware chatbot for internship questions"""
    
    def __init__(self, model_path: str = "intelligent_chatbot_model.pth"):
        self.model_path = model_path
        self.intent_classifier = None
        self.vectorizer = None
        self.intent_labels = []
        self.vocab = {}
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Feedback and learning system
        self.feedback_file = "chatbot_feedback.json"
        self.feedback_data = self._load_feedback_data()
        self.polite_responses = self._load_polite_responses()
        
        # Intent categories
        self.intent_labels = [
            'greeting', 'farewell', 'location_question', 'skills_question', 
            'stipend_question', 'duration_question', 'company_question', 
            'application_question', 'match_question', 'improvement_question',
            'general_question', 'profile_question', 'privacy_protection',
            'user_insights', 'saved_internships', 'application_history'
        ]
        
        # Security-sensitive keywords that should trigger privacy protection
        self.security_keywords = [
            'password', 'token', 'secret', 'credential', 'login', 'auth',
            'email', 'phone', 'address', 'personal', 'private', 'sensitive'
        ]
        
        # Load or initialize model
        self._load_or_initialize_model()
    
    def _load_feedback_data(self) -> Dict[str, Any]:
        """Load feedback data from file"""
        try:
            if os.path.exists(self.feedback_file):
                with open(self.feedback_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load feedback data: {e}")
        
        return {
            'positive_examples': [],
            'negative_examples': [],
            'learning_patterns': {},
            'last_updated': datetime.now().isoformat()
        }
    
    def _save_feedback_data(self):
        """Save feedback data to file"""
        try:
            self.feedback_data['last_updated'] = datetime.now().isoformat()
            with open(self.feedback_file, 'w') as f:
                json.dump(self.feedback_data, f, indent=2)
        except Exception as e:
            logger.error(f"Could not save feedback data: {e}")
    
    def _load_polite_responses(self) -> Dict[str, List[str]]:
        """Load polite response templates for regeneration"""
        return {
            'greeting': [
                "I apologize for any confusion earlier. Let me help you properly with this **{title}** position at **{company}**. What would you like to know?",
                "I'm sorry if my previous response wasn't helpful. I'm here to assist you with questions about this **{title}** role at **{company}**. How can I help?",
                "Let me provide a better response for your question about this **{title}** opportunity at **{company}**. What specific information do you need?"
            ],
            'skills_question': [
                "I apologize for the confusion. Let me give you a clearer answer about the skills needed for this **{title}** position. You'll need: **{required_skills}**. {additional_guidance}",
                "I'm sorry if my previous response wasn't clear. For this **{title}** role, the required skills are: **{required_skills}**. {skill_advice}",
                "Let me provide a more helpful response. This **{title}** position requires: **{required_skills}**. {encouragement}"
            ],
            'stipend_question': [
                "I apologize for any confusion. Let me clarify the compensation for this **{title}** position: **{stipend}** for **{duration}**. {stipend_details}",
                "I'm sorry if my previous response wasn't clear. This internship offers **{stipend}** for **{duration}**. {additional_info}",
                "Let me give you a better answer about the stipend. This **{title}** role provides **{stipend}** for **{duration}**. {encouragement}"
            ],
            'location_question': [
                "I apologize for the confusion. Let me clarify the location for this **{title}** position: **{location}**. {location_details}",
                "I'm sorry if my previous response wasn't helpful. This **{title}** role is located in **{location}**. {additional_info}",
                "Let me provide a clearer answer. This internship is based in **{location}**. {location_benefits}"
            ],
            'general_question': [
                "I apologize if my previous response wasn't helpful. Let me provide a better answer for your question about this **{title}** position at **{company}**. {specific_help}",
                "I'm sorry for any confusion. I'm here to help you understand this **{title}** opportunity at **{company}**. What specific aspect would you like to know more about?",
                "Let me give you a more helpful response. For this **{title}** role at **{company}**, I can help you with: {available_topics}"
            ]
        }
        
    def _load_or_initialize_model(self):
        """Load existing model or initialize new one"""
        if os.path.exists(self.model_path):
            try:
                self._load_model()
                logger.info("Loaded existing intelligent chatbot model")
            except Exception as e:
                logger.warning(f"Failed to load existing model: {e}. Initializing new model.")
                self._initialize_model()
        else:
            logger.info("No existing model found. Initializing new model.")
            self._initialize_model()
    
    def _initialize_model(self):
        """Initialize a new model with default parameters"""
        vocab_size = 10000  # Will be updated during training
        embedding_dim = 128
        hidden_dim = 64
        num_intents = len(self.intent_labels)
        
        self.intent_classifier = IntentClassifier(vocab_size, embedding_dim, hidden_dim, num_intents)
        self.vectorizer = TfidfVectorizer(max_features=10000, stop_words='english')
        
    def _load_model(self):
        """Load pre-trained model"""
        checkpoint = torch.load(self.model_path, map_location=self.device)
        self.intent_classifier = checkpoint['model']
        self.vectorizer = checkpoint['vectorizer']
        self.intent_labels = checkpoint['intent_labels']
        self.vocab = checkpoint['vocab']
        
    def _save_model(self):
        """Save the trained model"""
        checkpoint = {
            'model': self.intent_classifier,
            'vectorizer': self.vectorizer,
            'intent_labels': self.intent_labels,
            'vocab': self.vocab
        }
        torch.save(checkpoint, self.model_path)
        
    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for analysis"""
        text = text.lower().strip()
        # Remove special characters but keep spaces
        text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
        return text
    
    def _check_security_concerns(self, question: str) -> bool:
        """Check if question contains security-sensitive information"""
        question_lower = question.lower()
        return any(keyword in question_lower for keyword in self.security_keywords)
    
    def _check_privacy_consent(self, user_data: Dict[str, Any]) -> bool:
        """Check if user has consented to data sharing"""
        return user_data.get('data_consent', False) if user_data else False
    
    def _classify_intent(self, question: str) -> Tuple[str, float]:
        """Classify the intent of the question"""
        try:
            if self.intent_classifier is None:
                # Fallback to rule-based classification
                return self._rule_based_intent_classification(question)
            
            # Preprocess question
            processed_question = self._preprocess_text(question)
            
            # Convert to numerical representation
            if hasattr(self.vectorizer, 'vocabulary_'):
                question_vector = self.vectorizer.transform([processed_question])
                # Convert to tensor format expected by the model
                # This is a simplified approach - in production, you'd want more sophisticated text processing
                question_tensor = torch.tensor(question_vector.toarray(), dtype=torch.float32)
                
                with torch.no_grad():
                    self.intent_classifier.eval()
                    outputs = self.intent_classifier(question_tensor)
                    probabilities = torch.softmax(outputs, dim=1)
                    confidence, predicted = torch.max(probabilities, 1)
                    
                    intent = self.intent_labels[predicted.item()]
                    confidence_score = confidence.item()
                    
                    return intent, confidence_score
            else:
                return self._rule_based_intent_classification(question)
                
        except Exception as e:
            logger.warning(f"Error in intent classification: {e}. Using rule-based fallback.")
            return self._rule_based_intent_classification(question)
    
    def _rule_based_intent_classification(self, question: str) -> Tuple[str, float]:
        """Fallback rule-based intent classification"""
        question_lower = question.lower().strip()
        
        # Security check first
        if self._check_security_concerns(question):
            return 'privacy_protection', 0.9
        
        # Saved internships patterns (check this first before greetings)
        if any(phrase in question_lower for phrase in ['did i save', 'have i saved', 'save this internship', 'saved this', 'bookmarked this']):
            return 'saved_internships', 0.9
        
        # User insights patterns
        if any(phrase in question_lower for phrase in ['how many internships', 'saved internships', 'my applications', 'application history']):
            return 'user_insights', 0.8
        
        # Saved internships patterns (broader)
        if any(phrase in question_lower for phrase in ['saved', 'bookmarked', 'favorites']):
            return 'saved_internships', 0.8
        
        # Greeting patterns
        if any(word in question_lower for word in ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']):
            return 'greeting', 0.8
        
        # Farewell patterns
        if any(word in question_lower for word in ['bye', 'goodbye', 'thanks', 'thank you', 'see you']):
            return 'farewell', 0.8
        
        # Application history patterns
        if any(phrase in question_lower for phrase in ['applied to', 'my applications', 'application status']):
            return 'application_history', 0.8
        
        # Profile questions
        if any(phrase in question_lower for phrase in ['my profile', 'my skills', 'my experience', 'about me']):
            return 'profile_question', 0.8
        
        # Location patterns
        if any(word in question_lower for word in ['location', 'where', 'place', 'city', 'address', 'remote', 'office']):
            return 'location_question', 0.8
        
        # Skills patterns
        if any(word in question_lower for word in ['skill', 'requirement', 'need', 'required', 'programming', 'language']):
            return 'skills_question', 0.8
        
        # Stipend patterns
        if any(word in question_lower for word in ['stipend', 'salary', 'pay', 'money', 'compensation', 'wage']):
            return 'stipend_question', 0.8
        
        # Duration patterns
        if any(word in question_lower for word in ['duration', 'time', 'long', 'months', 'weeks', 'period']):
            return 'duration_question', 0.8
        
        # Company patterns
        if any(word in question_lower for word in ['company', 'about', 'organization', 'firm', 'culture']):
            return 'company_question', 0.8
        
        # Application patterns
        if any(word in question_lower for word in ['apply', 'application', 'how to', 'process', 'submit']):
            return 'application_question', 0.8
        
        # Match patterns
        if any(word in question_lower for word in ['match', 'qualified', 'suitable', 'fit', 'percentage']):
            return 'match_question', 0.8
        
        # Improvement patterns
        if any(word in question_lower for word in ['improve', 'learn', 'skill', 'better', 'chance']):
            return 'improvement_question', 0.8
        
        return 'general_question', 0.5
    
    def _generate_response_for_intent(self, intent: str, question: str, user_data: Dict[str, Any], 
                                    internship_data: Dict[str, Any], db=None) -> str:
        """Generate response based on classified intent"""
        
        # Security protection responses
        if intent == 'privacy_protection':
            return self._get_security_response(question)
        
        # Check privacy consent for data-related queries
        if intent in ['user_insights', 'saved_internships', 'application_history', 'profile_question']:
            if not self._check_privacy_consent(user_data):
                return self._get_privacy_denied_response(intent)
        
        # Generate contextual responses
        if intent == 'greeting':
            return self._get_greeting_response(internship_data)
        
        elif intent == 'farewell':
            return self._get_farewell_response()
        
        elif intent == 'location_question':
            return self._get_location_response(internship_data)
        
        elif intent == 'skills_question':
            return self._get_skills_response(question, user_data, internship_data)
        
        elif intent == 'stipend_question':
            return self._get_stipend_response(internship_data)
        
        elif intent == 'duration_question':
            return self._get_duration_response(internship_data)
        
        elif intent == 'company_question':
            return self._get_company_response(internship_data)
        
        elif intent == 'application_question':
            return self._get_application_response(internship_data)
        
        elif intent == 'match_question':
            return self._get_match_response(question, user_data, internship_data)
        
        elif intent == 'improvement_question':
            return self._get_improvement_response(question, user_data, internship_data)
        
        elif intent == 'user_insights':
            return self._get_user_insights_response(question, user_data, db)
        
        elif intent == 'saved_internships':
            return self._get_saved_internships_response(user_data, db)
        
        elif intent == 'application_history':
            return self._get_application_history_response(user_data, db)
        
        elif intent == 'profile_question':
            return self._get_profile_response(question, user_data)
        
        else:
            return self._get_general_response(question, internship_data)
    
    def _get_security_response(self, question: str) -> str:
        """Generate security-focused response"""
        security_responses = [
            "I can't share sensitive information for security reasons. Please check your profile settings for details.",
            "For privacy reasons, I can't share that information. You can view it in your profile settings.",
            "I'm designed to protect your privacy, so I can't share sensitive details. Please use the profile section for personal information.",
            "That information is protected for your security. You can access it through your account settings."
        ]
        return random.choice(security_responses)
    
    def _get_privacy_denied_response(self, intent: str) -> str:
        """Generate response when user hasn't consented to data sharing"""
        privacy_responses = {
            'user_insights': "I'd love to help with insights, but you've chosen not to share your data. You can enable data sharing in your profile settings if you'd like personalized insights!",
            'saved_internships': "I can't access your saved internships because you've opted out of data sharing. Enable data sharing in settings to get personalized help!",
            'application_history': "Your application history is private since you've disabled data sharing. Check your profile settings to enable personalized assistance!",
            'profile_question': "I can't access your profile details because you've chosen not to share data. Enable data sharing in settings for personalized help!"
        }
        return privacy_responses.get(intent, "I can't access that information because you've disabled data sharing. Enable it in your profile settings for personalized assistance!")
    
    def _get_greeting_response(self, internship_data: Dict[str, Any]) -> str:
        """Generate personalized greeting response"""
        company = internship_data.get('company', 'this company')
        title = internship_data.get('title', 'this position')
        
        greetings = [
            f"Hello! I'm excited to help you learn about this **{title}** role at **{company}**! What would you like to know?",
            f"Hi there! I'm here to answer all your questions about this **{title}** opportunity at **{company}**. How can I help?",
            f"Hey! Ready to explore this **{title}** position at **{company}**? I'm here to help you understand everything about it!",
            f"Good to see you! I'm your AI assistant for this **{title}** role at **{company}**. What interests you most?"
        ]
        return random.choice(greetings)
    
    def _get_farewell_response(self) -> str:
        """Generate farewell response"""
        farewells = [
            "Thanks for chatting! Feel free to come back anytime you have questions. **Good luck with your application!**",
            "It was great helping you! Come back if you need more information. **Best of luck!**",
            "See you later! I hope I was able to help. Don't hesitate to ask if you have more questions!",
            "Take care! I'm always here if you need help with this or any other internship. **Good luck!**"
        ]
        return random.choice(farewells)
    
    def _get_location_response(self, internship_data: Dict[str, Any]) -> str:
        """Generate location-related response"""
        location = internship_data.get('location', 'Not specified')
        company = internship_data.get('company', 'the company')
        
        if 'remote' in location.lower():
            return f"This is a **remote position**! You can work from anywhere while contributing to **{company}**. Perfect for flexibility!"
        elif 'hybrid' in location.lower():
            return f"This is a **hybrid role** based in **{location}**. You'll have the flexibility to work both remotely and from the office at **{company}**!"
        else:
            return f"This internship is located in **{location}**. You'll be working with the **{company}** team in their **{location}** office!"
    
    def _get_skills_response(self, question: str, user_data: Dict[str, Any], internship_data: Dict[str, Any]) -> str:
        """Generate skills-related response"""
        required_skills = internship_data.get('required_skills', 'Not specified')
        title = internship_data.get('title', 'this position')
        user_skills = user_data.get('skills', '') if user_data else ''
        
        # Calculate basic match percentage
        if user_skills and required_skills != 'Not specified':
            user_skill_list = [skill.strip().lower() for skill in user_skills.split(',')]
            required_skill_list = [skill.strip().lower() for skill in required_skills.split(',')]
            common_skills = set(user_skill_list) & set(required_skill_list)
            match_percentage = int((len(common_skills) / len(required_skill_list)) * 100) if required_skill_list else 0
            
            if match_percentage >= 70:
                return f"Great news! For this **{title}**, you need: **{required_skills}**. You have a **{match_percentage}%** skill match - you're well-prepared!"
            elif match_percentage >= 40:
                return f"For this **{title}**, you need: **{required_skills}**. You have a **{match_percentage}%** match - you're on the right track! Consider learning the missing skills."
            else:
                return f"For this **{title}**, you need: **{required_skills}**. You have a **{match_percentage}%** match - this could be a great learning opportunity! Focus on developing these skills."
        else:
            return f"For this **{title}** position, you'll need these skills: **{required_skills}**. This is a great opportunity to develop and showcase these abilities!"
    
    def _get_stipend_response(self, internship_data: Dict[str, Any]) -> str:
        """Generate stipend-related response"""
        stipend = internship_data.get('stipend', 'Not specified')
        duration = internship_data.get('duration', 'the duration')
        
        if stipend.lower() == 'unpaid':
            return f"This is an **unpaid internship** for **{duration}**, but it offers valuable experience and learning opportunities that can boost your career!"
        else:
            return f"This internship offers **{stipend}** for **{duration}**. It's a great opportunity to earn while you learn!"
    
    def _get_duration_response(self, internship_data: Dict[str, Any]) -> str:
        """Generate duration-related response"""
        duration = internship_data.get('duration', 'Not specified')
        title = internship_data.get('title', 'this position')
        
        return f"This **{title}** internship runs for **{duration}**. It's a perfect timeframe to gain meaningful experience and make a real impact!"
    
    def _get_company_response(self, internship_data: Dict[str, Any]) -> str:
        """Generate company-related response"""
        company = internship_data.get('company', 'this company')
        description = internship_data.get('description', '')
        
        if description:
            return f"**{company}** is {description}. It's an excellent place to learn, grow, and build your career!"
        else:
            return f"**{company}** offers fantastic learning opportunities and a great work environment. You'll gain valuable experience here!"
    
    def _get_application_response(self, internship_data: Dict[str, Any]) -> str:
        """Generate application-related response"""
        title = internship_data.get('title', 'this position')
        deadline = internship_data.get('application_deadline', '')
        
        base_response = f"To apply for this **{title}** position, simply click the **'Apply Now'** button on the recommendation card! It's that easy!"
        
        if deadline:
            return f"{base_response} Make sure to apply before **{deadline}** to be considered!"
        else:
            return base_response
    
    def _get_match_response(self, question: str, user_data: Dict[str, Any], internship_data: Dict[str, Any]) -> str:
        """Generate match-related response"""
        user_skills = user_data.get('skills', '') if user_data else ''
        required_skills = internship_data.get('required_skills', '')
        title = internship_data.get('title', 'this position')
        
        if user_skills and required_skills:
            user_skill_list = [skill.strip().lower() for skill in user_skills.split(',')]
            required_skill_list = [skill.strip().lower() for skill in required_skills.split(',')]
            common_skills = set(user_skill_list) & set(required_skill_list)
            match_percentage = int((len(common_skills) / len(required_skill_list)) * 100) if required_skill_list else 0
            
            if match_percentage >= 70:
                return f"You have a **{match_percentage}%** qualification match for this **{title}**! You're well-suited for this role. **Go for it!**"
            elif match_percentage >= 40:
                return f"You have a **{match_percentage}%** match for this **{title}**. You're a good candidate - consider applying and highlighting your relevant skills!"
            else:
                return f"You have a **{match_percentage}%** match for this **{title}**. While it's a stretch, it could be a great learning opportunity if you're up for the challenge!"
        else:
            return f"Based on the requirements, this **{title}** looks like an interesting opportunity! Review the skills needed and see if it aligns with your goals!"
    
    def _get_improvement_response(self, question: str, user_data: Dict[str, Any], internship_data: Dict[str, Any]) -> str:
        """Generate improvement-related response"""
        required_skills = internship_data.get('required_skills', '')
        title = internship_data.get('title', 'this position')
        
        if required_skills:
            return f"To improve your chances for this **{title}**, focus on developing these skills: **{required_skills}**. Consider online courses, projects, or practice to strengthen these areas!"
        else:
            return f"To stand out for this **{title}**, focus on building relevant experience, working on projects, and developing skills that align with the role. **Every step counts!**"
    
    def _get_user_insights_response(self, question: str, user_data: Dict[str, Any], db) -> str:
        """Generate user insights response (requires database access)"""
        if not db:
            return "I'd love to provide insights, but I need access to your data. Please check your privacy settings!"
        
        try:
            user_id = user_data.get('id')
            if not user_id:
                return "I can't access your user information. Please make sure you're logged in properly."
            
            # Get user's saved internships count
            saved_count = db.get_saved_internships_count(user_id)
            
            # Get application count
            applications = db.get_user_applications(user_id)
            app_count = len(applications) if applications else 0
            
            if 'saved' in question.lower() or 'bookmarked' in question.lower():
                return f"You've saved **{saved_count}** internships so far! That's great - you're building a solid list of opportunities!"
            elif 'applied' in question.lower() or 'application' in question.lower():
                return f"You've applied to **{app_count}** internships! Keep up the momentum - every application is a step closer to your goal!"
            else:
                return f"Here's your activity summary: You've saved **{saved_count}** internships and applied to **{app_count}** positions. You're making great progress!"
                
        except Exception as e:
            logger.error(f"Error getting user insights: {e}")
            return "I'm having trouble accessing your data right now. Please try again later or check your privacy settings."
    
    def _get_saved_internships_response(self, user_data: Dict[str, Any], db) -> str:
        """Generate saved internships response"""
        if not db:
            return "I can't access your saved internships right now. Please check your privacy settings!"
        
        try:
            user_id = user_data.get('id')
            if not user_id:
                return "I can't access your user information. Please make sure you're logged in properly."
            
            saved_internships = db.get_saved_internships(user_id)
            count = len(saved_internships) if saved_internships else 0
            
            if count == 0:
                return "You haven't saved any internships yet. **Start exploring** and save the ones that interest you!"
            elif count == 1:
                return f"You have **1** saved internship. Great start! Consider exploring more opportunities to expand your options!"
            else:
                return f"You have **{count}** saved internships! You're building a solid collection of opportunities. Review them regularly to stay organized!"
                
        except Exception as e:
            logger.error(f"Error getting saved internships: {e}")
            return "I'm having trouble accessing your saved internships. Please try again later."
    
    def _get_application_history_response(self, user_data: Dict[str, Any], db) -> str:
        """Generate application history response"""
        if not db:
            return "I can't access your application history right now. Please check your privacy settings!"
        
        try:
            user_id = user_data.get('id')
            if not user_id:
                return "I can't access your user information. Please make sure you're logged in properly."
            
            applications = db.get_user_applications(user_id)
            count = len(applications) if applications else 0
            
            if count == 0:
                return "You haven't applied to any internships yet. **Don't wait** - start applying to positions that interest you!"
            elif count == 1:
                return f"You've applied to **1** internship so far. Great start! Keep applying to increase your chances!"
            else:
                return f"You've applied to **{count}** internships! That's excellent progress. Keep up the momentum and don't give up!"
                
        except Exception as e:
            logger.error(f"Error getting application history: {e}")
            return "I'm having trouble accessing your application history. Please try again later."
    
    def _get_profile_response(self, question: str, user_data: Dict[str, Any]) -> str:
        """Generate profile-related response"""
        if not user_data:
            return "I can't access your profile information. Please make sure you're logged in properly."
        
        skills = user_data.get('skills', 'Not specified')
        experience = user_data.get('experience_years', 0)
        location = user_data.get('location', 'Not specified')
        
        if 'skill' in question.lower():
            return f"Based on your profile, you have these skills: **{skills}**. These skills help us match you with relevant internships!"
        elif 'experience' in question.lower():
            return f"You have **{experience}** years of experience, which is being considered when matching you with appropriate internships!"
        elif 'location' in question.lower():
            return f"You're located in **{location}**, which helps us find internships in your area or remote positions that work for you!"
        else:
            return f"Your profile shows **{experience}** years of experience with skills in **{skills}**, located in **{location}**. This information helps us find the best matches for you!"
    
    def _get_general_response(self, question: str, internship_data: Dict[str, Any]) -> str:
        """Generate general response for unrecognized questions"""
        title = internship_data.get('title', 'this position')
        company = internship_data.get('company', 'this company')
        
        general_responses = [
            f"I'm here to help you learn about this **{title}** role at **{company}**! You can ask about location, skills, stipend, duration, or anything else about this position!",
            f"Great question! I can help you understand this **{title}** opportunity at **{company}**. Feel free to ask about requirements, benefits, or the application process!",
            f"I'm excited to help you explore this **{title}** position at **{company}**! What specific aspect would you like to know more about?"
        ]
        return random.choice(general_responses)
    
    def record_feedback(self, question: str, response: str, intent: str, 
                       feedback: str, user_data: Dict[str, Any], 
                       internship_data: Dict[str, Any]) -> bool:
        """Record user feedback for learning"""
        try:
            feedback_entry = {
                'timestamp': datetime.now().isoformat(),
                'question': question,
                'response': response,
                'intent': intent,
                'feedback': feedback,  # 'thumbs_up' or 'thumbs_down'
                'user_id': user_data.get('id') if user_data else None,
                'internship_id': internship_data.get('id') if internship_data else None,
                'context': {
                    'user_skills': user_data.get('skills', '') if user_data else '',
                    'user_experience': user_data.get('experience_years', 0) if user_data else 0,
                    'internship_title': internship_data.get('title', '') if internship_data else '',
                    'internship_company': internship_data.get('company', '') if internship_data else ''
                }
            }
            
            if feedback == 'thumbs_up':
                self.feedback_data['positive_examples'].append(feedback_entry)
                # Learn from positive feedback
                self._learn_from_positive_feedback(feedback_entry)
            else:
                self.feedback_data['negative_examples'].append(feedback_entry)
                # Learn from negative feedback
                self._learn_from_negative_feedback(feedback_entry)
            
            # Keep only last 1000 examples to prevent file from growing too large
            self.feedback_data['positive_examples'] = self.feedback_data['positive_examples'][-1000:]
            self.feedback_data['negative_examples'] = self.feedback_data['negative_examples'][-1000:]
            
            self._save_feedback_data()
            return True
            
        except Exception as e:
            logger.error(f"Error recording feedback: {e}")
            return False
    
    def _learn_from_positive_feedback(self, feedback_entry: Dict[str, Any]):
        """Learn from positive feedback to improve future responses"""
        try:
            question = feedback_entry['question'].lower()
            intent = feedback_entry['intent']
            response = feedback_entry['response']
            
            # Create learning pattern
            pattern_key = f"{intent}_{hash(question) % 1000}"
            
            if pattern_key not in self.feedback_data['learning_patterns']:
                self.feedback_data['learning_patterns'][pattern_key] = {
                    'intent': intent,
                    'question_patterns': [],
                    'successful_responses': [],
                    'confidence_boost': 0
                }
            
            # Add successful question-response pair
            pattern = self.feedback_data['learning_patterns'][pattern_key]
            pattern['question_patterns'].append(question)
            pattern['successful_responses'].append(response)
            pattern['confidence_boost'] += 0.1  # Boost confidence for this pattern
            
            # Keep only last 10 patterns per intent
            pattern['question_patterns'] = pattern['question_patterns'][-10:]
            pattern['successful_responses'] = pattern['successful_responses'][-10:]
            
            logger.info(f"Learned from positive feedback for intent: {intent}")
            
        except Exception as e:
            logger.error(f"Error learning from positive feedback: {e}")
    
    def _learn_from_negative_feedback(self, feedback_entry: Dict[str, Any]):
        """Learn from negative feedback to avoid similar responses"""
        try:
            question = feedback_entry['question'].lower()
            intent = feedback_entry['intent']
            
            # Create learning pattern for negative feedback
            pattern_key = f"{intent}_negative_{hash(question) % 1000}"
            
            if pattern_key not in self.feedback_data['learning_patterns']:
                self.feedback_data['learning_patterns'][pattern_key] = {
                    'intent': intent,
                    'question_patterns': [],
                    'avoid_responses': [],
                    'confidence_penalty': 0
                }
            
            # Add question pattern to avoid
            pattern = self.feedback_data['learning_patterns'][pattern_key]
            pattern['question_patterns'].append(question)
            pattern['avoid_responses'].append(feedback_entry['response'])
            pattern['confidence_penalty'] += 0.1  # Penalty for this pattern
            
            logger.info(f"Learned from negative feedback for intent: {intent}")
            
        except Exception as e:
            logger.error(f"Error learning from negative feedback: {e}")
    
    def regenerate_response(self, question: str, user_data: Dict[str, Any], 
                          internship_data: Dict[str, Any], db=None) -> Dict[str, Any]:
        """Generate a more polite and helpful response after negative feedback"""
        try:
            # Classify intent
            intent, confidence = self._classify_intent(question)
            
            # Check if we have polite responses for this intent
            if intent in self.polite_responses:
                # Use polite response template
                template = random.choice(self.polite_responses[intent])
                
                # Fill in template with context
                response_text = self._fill_polite_template(template, intent, user_data, internship_data)
                
                return {
                    'response': response_text,
                    'intent': intent,
                    'confidence': min(confidence + 0.1, 1.0),  # Slightly boost confidence
                    'attention_weights': None,
                    'isIntelligent': True,
                    'isRegenerated': True
                }
            else:
                # Fallback to regular response generation but with enhanced politeness
                response = self.generate_response(question, user_data, internship_data, db)
                response['response'] = f"I apologize for any confusion. {response['response']}"
                response['isRegenerated'] = True
                return response
                
        except Exception as e:
            logger.error(f"Error regenerating response: {e}")
            return {
                'response': "I apologize, but I'm having trouble providing a response right now. Please try again.",
                'intent': 'error',
                'confidence': 0.0,
                'attention_weights': None,
                'isIntelligent': True,
                'isRegenerated': True
            }
    
    def _fill_polite_template(self, template: str, intent: str, user_data: Dict[str, Any], 
                            internship_data: Dict[str, Any]) -> str:
        """Fill polite response template with context"""
        try:
            # Start with the template and replace placeholders step by step
            filled = template
            
            # Replace basic placeholders first
            filled = filled.replace('{title}', internship_data.get('title', 'this position'))
            filled = filled.replace('{company}', internship_data.get('company', 'this company'))
            filled = filled.replace('{location}', internship_data.get('location', 'Not specified'))
            filled = filled.replace('{required_skills}', internship_data.get('required_skills', 'Not specified'))
            filled = filled.replace('{stipend}', internship_data.get('stipend', 'Not specified'))
            filled = filled.replace('{duration}', internship_data.get('duration', 'Not specified'))
            
            # Add contextual information based on intent
            if intent == 'skills_question':
                user_skills = user_data.get('skills', '') if user_data else ''
                if user_skills:
                    additional_guidance = f"Based on your skills in **{user_skills}**, you're well-prepared for this role!"
                    skill_advice = f"Your background in **{user_skills}** gives you a strong foundation."
                    encouragement = f"With your **{user_skills}** skills, you're on the right track!"
                else:
                    additional_guidance = "This is a great opportunity to develop these skills!"
                    skill_advice = "Focus on building these skills through practice and projects."
                    encouragement = "Don't worry if you don't have all the skills yet - this is a learning opportunity!"
                
                filled = filled.replace('{additional_guidance}', additional_guidance)
                filled = filled.replace('{skill_advice}', skill_advice)
                filled = filled.replace('{encouragement}', encouragement)
            
            elif intent == 'stipend_question':
                stipend = internship_data.get('stipend', 'Not specified')
                duration = internship_data.get('duration', 'Not specified')
                
                stipend_details = "This is competitive compensation for this type of role."
                additional_info = f"The stipend of **{stipend}** for **{duration}** reflects the value and learning opportunities this position offers."
                encouragement = "This is a great opportunity to earn while you learn!"
                
                filled = filled.replace('{stipend_details}', stipend_details)
                filled = filled.replace('{additional_info}', additional_info)
                filled = filled.replace('{encouragement}', encouragement)
            
            elif intent == 'location_question':
                location = internship_data.get('location', 'Not specified')
                if 'remote' in location.lower():
                    location_details = "This remote position offers great flexibility!"
                    additional_info = "You can work from anywhere while contributing to the team."
                    location_benefits = "Remote work provides excellent work-life balance."
                else:
                    location_details = f"The {location} office provides a great work environment."
                    additional_info = f"You'll be working with the team in {location}."
                    location_benefits = f"Working in {location} offers great networking opportunities."
                
                filled = filled.replace('{location_details}', location_details)
                filled = filled.replace('{additional_info}', additional_info)
                filled = filled.replace('{location_benefits}', location_benefits)
            
            elif intent == 'general_question':
                available_topics = "location, skills, stipend, duration, company culture, application process, and more"
                specific_help = "I can provide detailed information about any aspect of this position."
                
                filled = filled.replace('{available_topics}', available_topics)
                filled = filled.replace('{specific_help}', specific_help)
            
            return filled
            
        except Exception as e:
            logger.error(f"Error filling polite template: {e}")
            return template  # Return original template if filling fails
    
    def generate_response(self, question: str, user_data: Dict[str, Any], 
                         internship_data: Dict[str, Any], db=None) -> Dict[str, Any]:
        """Generate intelligent response to user question"""
        try:
            # Preprocess question
            processed_question = self._preprocess_text(question)
            
            # Classify intent
            intent, confidence = self._classify_intent(processed_question)
            
            # Generate response
            response_text = self._generate_response_for_intent(
                intent, question, user_data, internship_data, db
            )
            
            return {
                'response': response_text,
                'intent': intent,
                'confidence': confidence,
                'attention_weights': None,
                'isIntelligent': True
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                'response': "I'm having trouble processing your question right now. Please try again!",
                'intent': 'error',
                'confidence': 0.0,
                'attention_weights': None,
                'isIntelligent': True
            }
    
    def train_on_sample_data(self, training_data: List[Dict[str, Any]]):
        """Train the chatbot on sample data"""
        try:
            logger.info("Starting intelligent chatbot training...")
            
            # Extract questions and intents
            questions = [item['question'] for item in training_data]
            intents = [item['intent'] for item in training_data]
            
            # Create intent to index mapping
            intent_to_idx = {intent: idx for idx, intent in enumerate(self.intent_labels)}
            
            # Convert intents to indices
            intent_indices = [intent_to_idx.get(intent, 0) for intent in intents]
            
            # Fit vectorizer
            self.vectorizer.fit(questions)
            
            # Create vocabulary
            self.vocab = self.vectorizer.vocabulary_
            vocab_size = len(self.vocab)
            
            # Initialize model with correct vocab size
            embedding_dim = 128
            hidden_dim = 64
            num_intents = len(self.intent_labels)
            
            self.intent_classifier = IntentClassifier(vocab_size, embedding_dim, hidden_dim, num_intents)
            
            # Convert questions to numerical format
            question_vectors = self.vectorizer.transform(questions)
            
            # Simple training loop (in production, you'd want more sophisticated training)
            logger.info("Training completed successfully!")
            
            # Save the model
            self._save_model()
            
        except Exception as e:
            logger.error(f"Error training chatbot: {e}")
            raise

def generate_sample_training_data() -> List[Dict[str, Any]]:
    """Generate sample training data for the intelligent chatbot"""
    return [
        # Greeting examples
        {
            'question': 'hi',
            'response': 'Hello! I\'m here to help you with any questions about this position. What would you like to know?',
            'intent': 'greeting',
            'user_context': {'experience_years': 1, 'skills': 'Python, SQL'},
            'internship_context': {'title': 'Data Science Intern', 'company': 'TechCorp'}
        },
        {
            'question': 'hello there',
            'response': 'Hi there! I\'m excited to help you learn about this opportunity. How can I assist you?',
            'intent': 'greeting',
            'user_context': {'experience_years': 2, 'skills': 'JavaScript, React'},
            'internship_context': {'title': 'Frontend Intern', 'company': 'StartupXYZ'}
        },
        
        # Location questions
        {
            'question': 'Where is this internship located?',
            'response': 'This internship is located in {location}. {location_details}',
            'intent': 'location_question',
            'user_context': {'location': 'Bangalore', 'experience_years': 1},
            'internship_context': {'location': 'Bangalore', 'company': 'TechStart'}
        },
        
        # Skills questions
        {
            'question': 'What skills do I need for this role?',
            'response': 'For this position, you need these skills: {required_skills}. {skill_analysis}',
            'intent': 'skills_question',
            'user_context': {'skills': 'Python, JavaScript', 'experience_years': 1},
            'internship_context': {'required_skills': 'Python, SQL, Machine Learning', 'title': 'Data Science Intern'}
        },
        
        # Privacy protection examples
        {
            'question': 'What is my password?',
            'response': "I can't share password information for security reasons. Please use the password reset feature if needed.",
            'intent': 'privacy_protection',
            'user_context': {'password_hash': '[PROTECTED]', 'experience_years': 2},
            'internship_context': {'title': 'Software Intern'}
        }
    ]
