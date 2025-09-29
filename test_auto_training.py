#!/usr/bin/env python3
"""
Test script to verify auto-training functionality
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from intelligent_chatbot import IntelligentChatbotService, generate_sample_training_data

def test_auto_training():
    """Test the auto-training functionality"""
    print("🤖 Testing Auto-Training Functionality...")
    
    # Remove existing model if it exists
    model_path = "intelligent_chatbot_model.pth"
    if os.path.exists(model_path):
        os.remove(model_path)
        print(f"🗑️ Removed existing model: {model_path}")
    
    # Initialize chatbot service (should trigger auto-training)
    print("🚀 Initializing chatbot service...")
    chatbot = IntelligentChatbotService()
    
    # Check if model was created
    if os.path.exists(model_path):
        print("✅ Model file created successfully!")
    else:
        print("❌ Model file not found!")
        return False
    
    # Test the chatbot
    print("\n🧪 Testing chatbot responses...")
    test_question = "What are my skills?"
    user_data = {'skills': 'Python, React, SQL', 'experience_years': 2, 'location': 'Mumbai'}
    internship_data = {'title': 'Software Intern', 'required_skills': 'Python, JavaScript'}
    
    try:
        response = chatbot.generate_response(test_question, user_data, internship_data)
        print(f"Question: {test_question}")
        print(f"Response: {response['response']}")
        print(f"Intent: {response['intent']}")
        print(f"Confidence: {response['confidence']:.2f}")
        print(f"AI-Powered: {'Yes' if response.get('isIntelligent', False) else 'No'}")
        
        if response['intent'] == 'profile_question' and response['confidence'] > 0.5:
            print("✅ Auto-trained chatbot working correctly!")
            return True
        else:
            print("❌ Auto-trained chatbot not working as expected!")
            return False
            
    except Exception as e:
        print(f"❌ Error testing chatbot: {e}")
        return False

if __name__ == "__main__":
    success = test_auto_training()
    if success:
        print("\n🎉 Auto-training test completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Auto-training test failed!")
        sys.exit(1)
