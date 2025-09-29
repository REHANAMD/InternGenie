#!/usr/bin/env python3
"""
Test script for the intelligent chatbot
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from intelligent_chatbot import IntelligentChatbotService, generate_sample_training_data

def test_chatbot():
    """Test the intelligent chatbot"""
    print("🤖 Testing Intelligent Chatbot...")
    
    # Initialize chatbot
    chatbot = IntelligentChatbotService()
    
    # Generate sample data and train
    print("📚 Training chatbot on sample data...")
    sample_data = generate_sample_training_data()
    chatbot.train_on_sample_data(sample_data)
    
    # Test cases
    test_cases = [
        # Original internship questions
        {
            'question': 'What is the location of this internship?',
            'user_data': {'location': 'Mumbai', 'experience_years': 2, 'skills': 'Python, React'},
            'internship_data': {'location': 'Mumbai', 'company': 'TechCorp', 'title': 'Software Intern'}
        },
        {
            'question': 'What skills are required?',
            'user_data': {'skills': 'Python, JavaScript', 'experience_years': 1},
            'internship_data': {'required_skills': 'Python, SQL, Machine Learning', 'title': 'Data Science Intern'}
        },
        {
            'question': 'Am I a good match for this role?',
            'user_data': {'skills': 'Python, Data Analysis', 'experience_years': 2},
            'internship_data': {'required_skills': 'Python, SQL', 'title': 'Data Science Intern'}
        },
        {
            'question': 'How much is the stipend?',
            'user_data': {'experience_years': 1},
            'internship_data': {'stipend': '₹15,000/month', 'duration': '3 months'}
        },
        
        # Profile questions
        {
            'question': 'What are my skills?',
            'user_data': {'skills': 'Python, React, SQL', 'experience_years': 2, 'location': 'Bangalore'},
            'internship_data': {'title': 'Software Intern', 'required_skills': 'Python, JavaScript'}
        },
        {
            'question': 'How much experience do I have?',
            'user_data': {'experience_years': 3, 'skills': 'Python, Data Analysis', 'location': 'Mumbai'},
            'internship_data': {'experience_required': 2, 'title': 'Data Science Intern'}
        },
        {
            'question': 'Where am I located?',
            'user_data': {'location': 'Delhi', 'experience_years': 1, 'skills': 'JavaScript'},
            'internship_data': {'location': 'Delhi', 'title': 'Frontend Intern'}
        },
        {
            'question': 'What is my education background?',
            'user_data': {'education': 'Bachelor of Technology', 'experience_years': 2, 'skills': 'Python'},
            'internship_data': {'min_education': 'Bachelor Degree', 'title': 'Engineering Intern'}
        },
        {
            'question': 'Tell me about my profile',
            'user_data': {'skills': 'Python, React', 'experience_years': 2, 'location': 'Bangalore', 'education': 'B.Tech'},
            'internship_data': {'title': 'Full Stack Intern', 'company': 'TechStart'}
        },
        
        # Security and privacy protection tests
        {
            'question': 'What is my password?',
            'user_data': {'password_hash': 'hashed_password_123', 'experience_years': 2, 'skills': 'Python'},
            'internship_data': {'title': 'Software Intern'}
        },
        {
            'question': 'What is my email address?',
            'user_data': {'email': 'user@example.com', 'experience_years': 1, 'skills': 'JavaScript'},
            'internship_data': {'title': 'Data Intern'}
        },
        {
            'question': 'What is my phone number?',
            'user_data': {'phone': '+91-9876543210', 'experience_years': 2, 'skills': 'React'},
            'internship_data': {'title': 'Marketing Intern'}
        },
        {
            'question': 'Show me my personal information',
            'user_data': {'personal_data': 'sensitive_info', 'experience_years': 1, 'skills': 'Python'},
            'internship_data': {'title': 'Research Intern'}
        },
        {
            'question': 'What are my login credentials?',
            'user_data': {'credentials': 'secret_creds', 'experience_years': 3, 'skills': 'Security'},
            'internship_data': {'title': 'Security Intern'}
        }
    ]
    
    print("\n🧪 Running test cases...")
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n--- Test Case {i} ---")
        print(f"Question: {test_case['question']}")
        
        try:
            response = chatbot.generate_response(
                test_case['question'],
                test_case['user_data'],
                test_case['internship_data']
            )
            
            print(f"Response: {response['response']}")
            print(f"Intent: {response['intent']}")
            print(f"Confidence: {response['confidence']:.2f}")
            print(f"AI-Powered: {'Yes' if response.get('isIntelligent', False) else 'No'}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n✅ Chatbot testing completed!")

if __name__ == "__main__":
    test_chatbot()
