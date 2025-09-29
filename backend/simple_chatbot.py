"""
Simple Chatbot for Internship Questions
A basic rule-based chatbot that answers common questions about internships.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class SimpleChatbot:
    """Simple rule-based chatbot for internship questions"""
    
    def __init__(self):
        self.responses = {
            'greeting': [
                "Hello! I'm here to help you with questions about this internship. What would you like to know?",
                "Hi there! I can help you learn more about this position. What interests you?",
                "Hey! I'm excited to help you explore this opportunity. What questions do you have?"
            ],
            'farewell': [
                "Thanks for chatting! Feel free to come back if you have more questions.",
                "Goodbye! I hope I was able to help you learn about this position.",
                "See you later! Best of luck with your application!"
            ],
            'location': [
                "This internship is located in {location}. {location_details}",
                "The position is based in {location}. {location_details}",
                "You'll be working from {location}. {location_details}"
            ],
            'skills': [
                "For this {title}, you'll need these skills: {required_skills}",
                "The required skills are: {required_skills}",
                "This position requires: {required_skills}"
            ],
            'stipend': [
                "The stipend for this position is {stipend}",
                "This internship offers {stipend} as compensation",
                "You'll receive {stipend} for this role"
            ],
            'duration': [
                "This internship lasts for {duration}",
                "The duration is {duration}",
                "You'll be working for {duration}"
            ],
            'company': [
                "{company} is a great place to work and learn",
                "This is an opportunity at {company}",
                "{company} offers excellent learning opportunities"
            ],
            'application': [
                "You can apply using the 'Apply Now' button on the recommendation card",
                "To apply, click the 'Apply Now' button",
                "Use the application button to submit your application"
            ],
            'match': [
                "Based on your profile, you have a good match for this position",
                "Your skills align well with what we're looking for",
                "You seem like a great fit for this role"
            ],
            'default': [
                "I'm here to help you with questions about this internship. You can ask about location, skills, stipend, duration, or anything else!",
                "Feel free to ask me about the position details, requirements, or application process!",
                "I can help you learn more about this opportunity. What would you like to know?"
            ]
        }
    
    def generate_response(self, question: str, user_data: Dict[str, Any], 
                         internship_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a simple response based on the question"""
        
        question_lower = question.lower().strip()
        
        # Determine intent
        intent = self._classify_intent(question_lower)
        
        # Generate response
        response = self._generate_response_for_intent(intent, question_lower, internship_data)
        
        return {
            'response': response,
            'intent': intent,
            'confidence': 0.8,
            'attention_weights': None,
            'isIntelligent': False
        }
    
    def _classify_intent(self, question: str) -> str:
        """Classify the question intent"""
        
        # Greeting patterns
        if any(word in question for word in ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']):
            return 'greeting'
        
        # Farewell patterns
        if any(word in question for word in ['bye', 'goodbye', 'thanks', 'thank you', 'see you']):
            return 'farewell'
        
        # Location patterns
        if any(word in question for word in ['location', 'where', 'place', 'city', 'address', 'remote', 'office']):
            return 'location'
        
        # Skills patterns
        if any(word in question for word in ['skill', 'requirement', 'need', 'required', 'programming', 'language']):
            return 'skills'
        
        # Stipend patterns
        if any(word in question for word in ['stipend', 'salary', 'pay', 'money', 'compensation', 'wage']):
            return 'stipend'
        
        # Duration patterns
        if any(word in question for word in ['duration', 'time', 'long', 'months', 'weeks', 'period']):
            return 'duration'
        
        # Company patterns
        if any(word in question for word in ['company', 'about', 'organization', 'firm', 'culture']):
            return 'company'
        
        # Application patterns
        if any(word in question for word in ['apply', 'application', 'how to', 'process', 'submit']):
            return 'application'
        
        # Match patterns
        if any(word in question for word in ['match', 'qualified', 'suitable', 'fit', 'percentage']):
            return 'match'
        
        return 'default'
    
    def _generate_response_for_intent(self, intent: str, question: str, internship_data: Dict[str, Any]) -> str:
        """Generate response based on intent"""
        
        import random
        
        if intent == 'greeting':
            return random.choice(self.responses['greeting'])
        
        elif intent == 'farewell':
            return random.choice(self.responses['farewell'])
        
        elif intent == 'location':
            location = internship_data.get('location', 'Not specified')
            location_details = self._get_location_details(location)
            return random.choice(self.responses['location']).format(
                location=location, 
                location_details=location_details
            )
        
        elif intent == 'skills':
            required_skills = internship_data.get('required_skills', 'Not specified')
            title = internship_data.get('title', 'position')
            return random.choice(self.responses['skills']).format(
                required_skills=required_skills,
                title=title
            )
        
        elif intent == 'stipend':
            stipend = internship_data.get('stipend', 'Not specified')
            return random.choice(self.responses['stipend']).format(stipend=stipend)
        
        elif intent == 'duration':
            duration = internship_data.get('duration', 'Not specified')
            return random.choice(self.responses['duration']).format(duration=duration)
        
        elif intent == 'company':
            company = internship_data.get('company', 'the company')
            return random.choice(self.responses['company']).format(company=company)
        
        elif intent == 'application':
            return random.choice(self.responses['application'])
        
        elif intent == 'match':
            return random.choice(self.responses['match'])
        
        else:
            return random.choice(self.responses['default'])
    
    def _get_location_details(self, location: str) -> str:
        """Get location-specific details"""
        if 'remote' in location.lower():
            return "This is a remote position, so you can work from anywhere!"
        elif 'hybrid' in location.lower():
            return "This is a hybrid position, offering flexibility between remote and office work."
        else:
            return f"You'll be working from the {location} office."
