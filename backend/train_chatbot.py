#!/usr/bin/env python3
"""
Training script for the intelligent chatbot
This script trains the transformer-based chatbot on comprehensive data
"""

import os
import sys
import json
import logging
from typing import List, Dict, Any
from intelligent_chatbot import IntelligentChatbotService, generate_sample_training_data
from database import Database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_comprehensive_training_data() -> List[Dict[str, Any]]:
    """Generate comprehensive training data for the chatbot"""
    
    # Base sample data
    training_data = generate_sample_training_data()
    
    # Add more diverse training examples
    additional_examples = [
        # Greeting responses
        {
            'question': 'hi',
            'response': 'Hello! I\'m here to help you with any questions about this {title} position at {company}. What would you like to know?',
            'intent': 'greeting',
            'user_context': {'experience_years': 1, 'skills': 'Python, SQL'},
            'internship_context': {'title': 'Data Science Intern', 'company': 'TechCorp', 'location': 'Mumbai', 'duration': '6 months', 'stipend': '₹25,000/month', 'required_skills': 'Python, Machine Learning'}
        },
        {
            'question': 'hello',
            'response': 'Hi there! I\'m your AI assistant for this {title} role at {company}. Feel free to ask me anything about the position, requirements, or application process.',
            'intent': 'greeting',
            'user_context': {'experience_years': 1, 'skills': 'Python, SQL'},
            'internship_context': {'title': 'Data Science Intern', 'company': 'TechCorp', 'location': 'Mumbai', 'duration': '6 months', 'stipend': '₹25,000/month', 'required_skills': 'Python, Machine Learning'}
        },
        {
            'question': 'hey',
            'response': 'Hey! I\'m here to help you understand this {title} opportunity at {company}. What questions do you have?',
            'intent': 'greeting',
            'user_context': {'experience_years': 1, 'skills': 'Python, SQL'},
            'internship_context': {'title': 'Data Science Intern', 'company': 'TechCorp', 'location': 'Mumbai', 'duration': '6 months', 'stipend': '₹25,000/month', 'required_skills': 'Python, Machine Learning'}
        },
        {
            'question': 'good morning',
            'response': 'Good morning! I\'m your AI assistant for this {title} position at {company}. How can I help you today?',
            'intent': 'greeting',
            'user_context': {'experience_years': 1, 'skills': 'Python, SQL'},
            'internship_context': {'title': 'Data Science Intern', 'company': 'TechCorp', 'location': 'Mumbai', 'duration': '6 months', 'stipend': '₹25,000/month', 'required_skills': 'Python, Machine Learning'}
        },
        {
            'question': 'good afternoon',
            'response': 'Good afternoon! I\'m here to assist you with questions about this {title} role at {company}. What would you like to know?',
            'intent': 'greeting',
            'user_context': {'experience_years': 1, 'skills': 'Python, SQL'},
            'internship_context': {'title': 'Data Science Intern', 'company': 'TechCorp', 'location': 'Mumbai', 'duration': '6 months', 'stipend': '₹25,000/month', 'required_skills': 'Python, Machine Learning'}
        },
        {
            'question': 'good evening',
            'response': 'Good evening! I\'m your AI assistant for this {title} position at {company}. Feel free to ask me anything about the role.',
            'intent': 'greeting',
            'user_context': {'experience_years': 1, 'skills': 'Python, SQL'},
            'internship_context': {'title': 'Data Science Intern', 'company': 'TechCorp', 'location': 'Mumbai', 'duration': '6 months', 'stipend': '₹25,000/month', 'required_skills': 'Python, Machine Learning'}
        },
        
        # Location questions
        {
            'question': 'Where is this internship located?',
            'response': 'This internship is located in {location}. {location_details}',
            'intent': 'location_question',
            'user_context': {'location': 'Bangalore', 'experience_years': 1},
            'internship_context': {'location': 'Bangalore', 'company': 'TechStart'}
        },
        {
            'question': 'Is this a remote position?',
            'response': 'This position is {location_type}. {remote_details}',
            'intent': 'location_question',
            'user_context': {'location': 'Mumbai', 'experience_years': 2},
            'internship_context': {'location': 'Remote', 'company': 'RemoteCorp'}
        },
        
        # Skills questions
        {
            'question': 'What technical skills do I need?',
            'response': 'For this {title} position, you need these technical skills: {required_skills}. {skill_analysis}',
            'intent': 'skills_question',
            'user_context': {'skills': 'Python, JavaScript, React', 'experience_years': 1},
            'internship_context': {'required_skills': 'Python, SQL, Machine Learning', 'title': 'Data Science Intern'}
        },
        {
            'question': 'Do I have the right skills for this role?',
            'response': 'Based on your profile, you have a {match_percentage}% skill match. {skill_gaps_analysis}',
            'intent': 'skills_question',
            'user_context': {'skills': 'Python, Data Analysis, SQL', 'experience_years': 2},
            'internship_context': {'required_skills': 'Python, Machine Learning, Statistics', 'title': 'ML Intern'}
        },
        
        # Stipend questions
        {
            'question': 'How much will I be paid?',
            'response': 'This internship offers {stipend} for the {duration} duration. {stipend_details}',
            'intent': 'stipend_question',
            'user_context': {'experience_years': 1},
            'internship_context': {'stipend': '₹20,000/month', 'duration': '6 months'}
        },
        {
            'question': 'Is this internship paid?',
            'response': 'This internship is {payment_status}. {payment_details}',
            'intent': 'stipend_question',
            'user_context': {'experience_years': 0},
            'internship_context': {'stipend': 'Unpaid', 'duration': '3 months'}
        },
        
        # Duration questions
        {
            'question': 'How long is this internship?',
            'response': 'This internship runs for {duration}. {duration_benefits}',
            'intent': 'duration_question',
            'user_context': {'experience_years': 1},
            'internship_context': {'duration': '3 months', 'title': 'Summer Intern'}
        },
        {
            'question': 'When does this internship start?',
            'response': 'This internship starts {start_time}. {timeline_details}',
            'intent': 'duration_question',
            'user_context': {'experience_years': 2},
            'internship_context': {'duration': '6 months', 'application_deadline': '2024-03-15'}
        },
        
        # Match questions
        {
            'question': 'Am I qualified for this position?',
            'response': 'You have a {match_percentage}% qualification match for this {title} role. {qualification_analysis}',
            'intent': 'match_question',
            'user_context': {'skills': 'Python, React, Node.js', 'experience_years': 2},
            'internship_context': {'required_skills': 'Python, JavaScript, React', 'title': 'Full Stack Intern'}
        },
        {
            'question': 'Will I be a good fit?',
            'response': 'Based on your profile, you would be a {fit_level} fit for this role. {fit_analysis}',
            'intent': 'match_question',
            'user_context': {'skills': 'Marketing, Communication', 'experience_years': 1},
            'internship_context': {'required_skills': 'Marketing, Social Media, Analytics', 'title': 'Marketing Intern'}
        },
        
        # Company questions
        {
            'question': 'Tell me about the company culture',
            'response': '{company} is known for {company_culture}. {culture_details}',
            'intent': 'company_question',
            'user_context': {'location': 'Delhi'},
            'internship_context': {'company': 'InnovateTech', 'title': 'Software Intern', 'description': 'Fast-growing tech startup'}
        },
        {
            'question': 'What does this company do?',
            'response': '{company} is a {company_type} that {company_description}. {company_mission}',
            'intent': 'company_question',
            'user_context': {'location': 'Mumbai'},
            'internship_context': {'company': 'DataCorp', 'title': 'Data Intern', 'description': 'Data analytics company'}
        },
        
        # Application questions
        {
            'question': 'How do I apply for this internship?',
            'response': 'To apply for this {title} position: {application_steps}. {application_tips}',
            'intent': 'application_question',
            'user_context': {'experience_years': 1},
            'internship_context': {'title': 'Software Intern', 'application_deadline': '2024-04-01'}
        },
        {
            'question': 'What documents do I need to submit?',
            'response': 'For this application, you need to submit: {required_documents}. {document_guidance}',
            'intent': 'application_question',
            'user_context': {'experience_years': 2},
            'internship_context': {'title': 'Research Intern', 'required_skills': 'Research, Writing'}
        },
        
        # Improvement questions
        {
            'question': 'How can I improve my chances?',
            'response': 'To improve your chances for this {title} role: {improvement_steps}. {specific_advice}',
            'intent': 'improvement_question',
            'user_context': {'skills': 'Basic Python', 'experience_years': 0},
            'internship_context': {'required_skills': 'Python, Machine Learning, Statistics', 'title': 'ML Intern'}
        },
        {
            'question': 'What should I learn to get this internship?',
            'response': 'To qualify for this {title} position, focus on learning: {learning_priorities}. {learning_resources}',
            'intent': 'improvement_question',
            'user_context': {'skills': 'HTML, CSS', 'experience_years': 1},
            'internship_context': {'required_skills': 'React, JavaScript, Node.js', 'title': 'Frontend Intern'}
        },
        
        # General questions
        {
            'question': 'What is this internship about?',
            'response': 'This {title} internship at {company} involves: {role_description}. {learning_opportunities}',
            'intent': 'general_question',
            'user_context': {'experience_years': 1},
            'internship_context': {'title': 'Product Intern', 'company': 'ProductCorp', 'description': 'Product management and strategy'}
        },
        {
            'question': 'What will I learn from this internship?',
            'response': 'This {title} internship will teach you: {learning_outcomes}. {skill_development}',
            'intent': 'general_question',
            'user_context': {'experience_years': 0},
            'internship_context': {'title': 'Design Intern', 'description': 'UI/UX design and user research'}
        },
        
        # Greeting questions
        {
            'question': 'Hello, can you help me?',
            'response': 'Hello! I\'m here to help you with questions about this {title} internship at {company}. What would you like to know?',
            'intent': 'greeting',
            'user_context': {'experience_years': 1},
            'internship_context': {'title': 'Software Intern', 'company': 'TechCorp'}
        },
        {
            'question': 'Hi, what can you tell me about this role?',
            'response': 'Hi! I can help you understand this {title} position at {company}. {role_overview} What specific aspect interests you?',
            'intent': 'greeting',
            'user_context': {'experience_years': 2},
            'internship_context': {'title': 'Data Intern', 'company': 'DataCorp'}
        }
    ]
    
    # Add profile and security training examples
    profile_examples = [
        # Profile questions
        {
            'question': 'What are my skills?',
            'response': 'Based on your profile, you have these skills: {user_skills}. These skills are being used to match you with relevant internships.',
            'intent': 'profile_question',
            'user_context': {'skills': 'Python, React, SQL', 'experience_years': 2},
            'internship_context': {'title': 'Software Intern', 'required_skills': 'Python, JavaScript'}
        },
        {
            'question': 'How much experience do I have?',
            'response': 'You have {user_experience} years of experience, which is being considered for matching you with appropriate internships.',
            'intent': 'profile_question',
            'user_context': {'experience_years': 3, 'skills': 'Python, Data Analysis'},
            'internship_context': {'experience_required': 2, 'title': 'Data Science Intern'}
        },
        {
            'question': 'Where am I located?',
            'response': 'You are located in {user_location}. This helps us find internships in your area or remote positions that work for you.',
            'intent': 'profile_question',
            'user_context': {'location': 'Mumbai', 'experience_years': 1},
            'internship_context': {'location': 'Mumbai', 'title': 'Software Intern'}
        },
        {
            'question': 'What is my education background?',
            'response': 'You have {user_education} education, which is considered when matching you with internships.',
            'intent': 'profile_question',
            'user_context': {'education': 'Bachelor of Technology', 'experience_years': 2},
            'internship_context': {'min_education': 'Bachelor Degree', 'title': 'Engineering Intern'}
        },
        {
            'question': 'Tell me about my profile',
            'response': 'Your profile contains your skills, experience, education, and location preferences. This information helps us match you with relevant internships.',
            'intent': 'profile_question',
            'user_context': {'skills': 'Python, React', 'experience_years': 2, 'location': 'Bangalore'},
            'internship_context': {'title': 'Full Stack Intern', 'company': 'TechStart'}
        },
        {
            'question': 'Am I qualified for this position?',
            'response': 'Based on your profile, you have a {match_percentage}% qualification match. Your {user_experience} years of experience and skills in {user_skills} are being considered.',
            'intent': 'profile_question',
            'user_context': {'experience_years': 2, 'skills': 'Python, JavaScript'},
            'internship_context': {'experience_required': 1, 'required_skills': 'Python, React', 'title': 'Software Intern'}
        },
        
        # Security and privacy protection examples
        {
            'question': 'What is my password?',
            'response': "I can't share password information for security reasons. Please use the password reset feature if needed.",
            'intent': 'privacy_protection',
            'user_context': {'password_hash': '[PROTECTED]', 'experience_years': 2},
            'internship_context': {'title': 'Software Intern'}
        },
        {
            'question': 'What is my email address?',
            'response': "For privacy reasons, I can't share your email address. You can view it in your profile settings.",
            'intent': 'privacy_protection',
            'user_context': {'email': '[PROTECTED]', 'experience_years': 1},
            'internship_context': {'title': 'Data Intern'}
        },
        {
            'question': 'What is my phone number?',
            'response': "I can't share your phone number for privacy reasons. You can view it in your profile settings.",
            'intent': 'privacy_protection',
            'user_context': {'phone': '[PROTECTED]', 'experience_years': 2},
            'internship_context': {'title': 'Marketing Intern'}
        },
        {
            'question': 'Show me my personal information',
            'response': "I can't share personal information for privacy reasons. You can view your profile details in the settings.",
            'intent': 'privacy_protection',
            'user_context': {'personal_data': '[PROTECTED]', 'experience_years': 1},
            'internship_context': {'title': 'Research Intern'}
        },
        {
            'question': 'What are my login credentials?',
            'response': "I can't share sensitive information for security reasons. Please check your profile settings for details.",
            'intent': 'privacy_protection',
            'user_context': {'credentials': '[PROTECTED]', 'experience_years': 3},
            'internship_context': {'title': 'Security Intern'}
        },
        {
            'question': 'Tell me my secret information',
            'response': "I can't share sensitive information for security reasons. Please check your profile settings for details.",
            'intent': 'privacy_protection',
            'user_context': {'secret_data': '[PROTECTED]', 'experience_years': 2},
            'internship_context': {'title': 'Privacy Intern'}
        }
    ]
    
    training_data.extend(profile_examples)
    
    # Add contextual variations
    for example in additional_examples:
        # Add variations with different user contexts
        variations = [
            {**example, 'user_context': {**example['user_context'], 'location': 'Mumbai'}},
            {**example, 'user_context': {**example['user_context'], 'location': 'Bangalore'}},
            {**example, 'user_context': {**example['user_context'], 'location': 'Delhi'}},
            {**example, 'user_context': {**example['user_context'], 'experience_years': 0}},
            {**example, 'user_context': {**example['user_context'], 'experience_years': 3}},
        ]
        training_data.extend(variations)
    
    return training_data

def train_chatbot():
    """Train the intelligent chatbot"""
    try:
        logger.info("Starting intelligent chatbot training...")
        
        # Initialize chatbot service
        chatbot = IntelligentChatbotService()
        
        # Generate comprehensive training data
        training_data = generate_comprehensive_training_data()
        logger.info(f"Generated {len(training_data)} training examples")
        
        # Train the chatbot
        chatbot.train_on_sample_data(training_data)
        
        # Save the trained model
        model_path = "intelligent_chatbot_model.pth"
        chatbot._save_model()
        
        logger.info(f"Chatbot training completed successfully!")
        logger.info(f"Model saved to: {model_path}")
        
        # Test the chatbot
        logger.info("Testing the trained chatbot...")
        test_question = "What skills do I need for this internship?"
        user_data = {'skills': 'Python, React', 'experience_years': 1, 'location': 'Mumbai'}
        internship_data = {'required_skills': 'Python, JavaScript, SQL', 'title': 'Full Stack Intern', 'company': 'TechStart'}
        
        response = chatbot.generate_response(test_question, user_data, internship_data)
        logger.info(f"Test Question: {test_question}")
        logger.info(f"Response: {response['response']}")
        logger.info(f"Intent: {response['intent']}")
        logger.info(f"Confidence: {response['confidence']:.2f}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error training chatbot: {e}")
        return False

if __name__ == "__main__":
    success = train_chatbot()
    if success:
        print("✅ Chatbot training completed successfully!")
        sys.exit(0)
    else:
        print("❌ Chatbot training failed!")
        sys.exit(1)
