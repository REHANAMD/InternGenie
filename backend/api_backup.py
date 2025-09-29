"""
FastAPI Backend - RESTful API for the recommendation engine
"""
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
import os
import shutil
import sqlite3
import json
from datetime import datetime
import logging
import atexit
import sys

from database import Database
from resume_parser import ResumeParser
from recommender import RecommendationEngine
from enhanced_recommender import EnhancedRecommendationEngine
from auth import AuthManager
from utils import Utils
from intelligent_chatbot import IntelligentChatbotService, generate_sample_training_data
# Session logger disabled - using centralized logging instead
# from session_logger import initialize_session_logger, get_session_logger
from request_logging_middleware import RequestLoggingMiddleware

# Session logger disabled - using centralized logging instead
# session_logger = initialize_session_logger()

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PM Internship Recommendation Engine API",
    description="API for matching candidates with PM internship opportunities",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Server lifecycle event handlers - using uvicorn's built-in shutdown handling
def cleanup_on_exit():
    """Cleanup function called on exit"""
    logger.info("SERVER STOPPED LISTENING")

# Register cleanup function
atexit.register(cleanup_on_exit)

# Initialize components
# Initialize database with absolute path to ensure consistency
import os
db_path = os.path.join(os.path.dirname(__file__), "recommendation_engine.db")
db = Database(db_path)
parser = ResumeParser()
recommender = RecommendationEngine(db)
enhanced_engine = EnhancedRecommendationEngine(db)
auth_manager = AuthManager(db=db)  # Pass database instance directly

# Initialize simple chatbot
from simple_chatbot import SimpleChatbot
chatbot_service = SimpleChatbot()

# Simple chatbot initialized
logger.info("Simple chatbot initialized successfully")

# Log component initialization
logger.info("Components Initialized - Database, Parser, Recommender, Auth Manager, Chatbot loaded")

# Pydantic models for request/response
class UserRegistration(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2, max_length=100)
    education: Optional[str] = None
    skills: Optional[str] = None
    location: Optional[str] = None
    experience_years: Optional[int] = Field(default=0, ge=0, le=50)
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CandidateProfile(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    education: Optional[str] = None
    skills: Optional[str] = None
    location: Optional[str] = None
    experience_years: Optional[int] = Field(default=0, ge=0, le=50)
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None

class CandidateProfileUpdate(CandidateProfile):
    current_password: Optional[str] = None

class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=6)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class ResetPasswordWithOTP(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

class PrivacyPreferencesRequest(BaseModel):
    data_consent: bool

# Dependency to get current user from token
async def get_current_user(authorization: str = Header(None)):
    """Extract and verify user from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        # Extract token from "Bearer <token>" format
        token = authorization.split(" ")[1] if " " in authorization else authorization
        user = auth_manager.get_user_from_token(token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        return user
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "PM Internship Recommendation Engine API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/auth/*",
            "candidates": "/candidates/*",
            "internships": "/internships/*",
            "recommendations": "/recommendations/*"
        }
    }

# Authentication endpoints
@app.post("/auth/register")
async def register(user_data: UserRegistration):
    """Register a new user"""
    try:
        logger.info(f"Registration attempt for email: {user_data.email}")
        success, message, user_id = auth_manager.register_user(user_data.dict())
        
        if success:
            # Auto-login after registration
            _, _, token, user_info = auth_manager.login_user(
                user_data.email, 
                user_data.password
            )
            logger.info(f"Registration successful for email: {user_data.email}, user_id: {user_id}")
            return {
                "success": True,
                "message": message,
                "user_id": user_id,
                "token": token,
                "user": user_info
            }
        else:
            logger.warning(f"Registration failed for email: {user_data.email}, reason: {message}")
            raise HTTPException(status_code=400, detail=message)
    except HTTPException as exc:
        # Preserve intended HTTP errors (e.g., 400 Already exists)
        raise exc
    except Exception as e:
        logger.error(f"Registration error for email {user_data.email}: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/auth/login")
async def login(credentials: UserLogin):
    """Login user and return JWT token"""
    try:
        logger.info(f"Login attempt for email: {credentials.email}")
        success, message, token, user_data = auth_manager.login_user(
            credentials.email,
            credentials.password
        )
        
        if success:
            logger.info(f"Login successful for email: {credentials.email}, user_id: {user_data.get('id')}")
            return {
                "success": True,
                "message": message,
                "token": token,
                "user": user_data
            }
        else:
            logger.warning(f"Login failed for email: {credentials.email}, reason: {message}")
            raise HTTPException(status_code=401, detail=message)
    
    except Exception as e:
        logger.error(f"Login error for email {credentials.email}: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.post("/auth/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refresh JWT token"""
    try:
        # Get current token from header
        authorization = Header()
        token = authorization.split(" ")[1] if " " in authorization else authorization
        
        new_token = auth_manager.refresh_token(token)
        
        if new_token:
            return {
                "success": True,
                "token": new_token
            }
        else:
            raise HTTPException(status_code=401, detail="Failed to refresh token")
    
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=500, detail="Token refresh failed")

@app.post("/auth/password/update")
async def update_password(
    password_data: PasswordUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user password"""
    try:
        success, message = auth_manager.update_password(
            current_user['id'],
            password_data.old_password,
            password_data.new_password
        )
        
        if success:
            return {"success": True, "message": message}
        else:
            raise HTTPException(status_code=400, detail=message)
    
    except Exception as e:
        logger.error(f"Password update error: {e}")
        raise HTTPException(status_code=500, detail="Password update failed")

@app.post("/auth/password/reset")
async def request_password_reset(reset_data: PasswordReset):
    """Request password reset token"""
    try:
        success, message, reset_token = auth_manager.reset_password_request(
            reset_data.email
        )
        
        if success:
            # In production, send this token via email
            return {
                "success": True,
                "message": message,
                "reset_token": reset_token  # Remove in production
            }
        else:
            raise HTTPException(status_code=404, detail=message)
    
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        raise HTTPException(status_code=500, detail="Password reset request failed")

@app.post("/auth/password/reset/confirm")
async def confirm_password_reset(reset_confirm: PasswordResetConfirm):
    """Confirm password reset with token"""
    try:
        success, message = auth_manager.reset_password_confirm(
            reset_confirm.reset_token,
            reset_confirm.new_password
        )
        
        if success:
            return {"success": True, "message": message}
        else:
            raise HTTPException(status_code=400, detail=message)
    
    except Exception as e:
        logger.error(f"Password reset confirm error: {e}")
        raise HTTPException(status_code=500, detail="Password reset failed")

@app.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset with OTP"""
    try:
        success, message = auth_manager.request_password_reset_otp(request.email)
        
        if success:
            return {"success": True, "message": message}
        else:
            raise HTTPException(status_code=400, detail=message)
    
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process forgot password request")

@app.post("/auth/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP for password reset"""
    try:
        # Check if user exists
        user = auth_manager.db.get_candidate(email=request.email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify OTP
        is_valid = auth_manager.db.verify_otp(request.email, request.otp)
        
        if is_valid:
            return {"success": True, "message": "OTP verified successfully"}
        else:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify OTP")

@app.post("/auth/reset-password-otp")
async def reset_password_otp(request: ResetPasswordWithOTP):
    """Reset password using OTP"""
    try:
        # Validate password confirmation
        if request.new_password != request.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")
        
        success, message = auth_manager.reset_password_with_otp(
            request.email,
            request.otp,
            request.new_password
        )
        
        if success:
            return {"success": True, "message": message}
        else:
            raise HTTPException(status_code=400, detail=message)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password OTP error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password")

@app.post("/auth/privacy-preferences")
async def update_privacy_preferences(request: PrivacyPreferencesRequest, current_user: dict = Depends(get_current_user)):
    """Update user's privacy preferences"""
    try:
        logger.info(f"Updating privacy preferences for user ID: {current_user['id']} to {request.data_consent}")
        success = auth_manager.db.update_candidate(
            current_user["id"],
            {"data_consent": request.data_consent}
        )
        
        if success:
            logger.info(f"Successfully updated privacy preferences for user {current_user['id']}")
            return {"success": True, "message": "Privacy preferences updated successfully"}
        else:
            logger.error(f"Failed to update privacy preferences for user {current_user['id']}")
            raise HTTPException(status_code=400, detail="Failed to update privacy preferences")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_privacy_preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/auth/privacy-preferences")
async def get_privacy_preferences(current_user: dict = Depends(get_current_user)):
    """Get user's privacy preferences"""
    try:
        logger.info(f"Getting privacy preferences for user ID: {current_user['id']}")
        candidate = auth_manager.db.get_candidate(candidate_id=current_user["id"])
        if not candidate:
            logger.error(f"User not found: {current_user['id']}")
            raise HTTPException(status_code=404, detail="User not found")
        
        data_consent = candidate.get("data_consent")
        logger.info(f"User {current_user['id']} data_consent: {data_consent}")
        
        return {
            "success": True, 
            "data_consent": bool(data_consent) if data_consent is not None else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_privacy_preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Candidate endpoints
@app.get("/candidates/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    return {
        "success": True,
        "profile": current_user
    }

@app.put("/candidates/profile")
async def update_profile(
    profile_data: CandidateProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile"""
    try:
        update_data = profile_data.dict(exclude_unset=True)
        # Enforce password verification for profile updates
        if not update_data.get('current_password'):
            raise HTTPException(status_code=400, detail="Current password is required to update profile")
        # Verify password
        user_record = db.get_candidate(candidate_id=current_user['id'])
        if not user_record:
            raise HTTPException(status_code=404, detail="User not found")
        if not auth_manager.verify_password_bcrypt(update_data['current_password'], user_record['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid current password")
        # Remove auth-only field
        update_data.pop('current_password', None)
        logger.info(f"Updating candidate {current_user['id']} with data: {update_data}")
        success = db.update_candidate(current_user['id'], update_data)
        
        if success:
            # Clear cached recommendations for this candidate since profile changed
            db.clear_recommendations_for_candidate(current_user['id'])
            logger.info(f"Cleared recommendations for candidate {current_user['id']} after profile update")
            
            # Get updated profile
            updated_user = db.get_candidate(candidate_id=current_user['id'])
            return {
                "success": True,
                "message": "Profile updated successfully. Recommendations will be recalculated.",
                "profile": {
                    k: v for k, v in updated_user.items() 
                    if k != 'password_hash'
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to update profile")
    
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail="Profile update failed")

@app.delete("/candidates/profile")
async def delete_profile(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete user profile and all related data"""
    try:
        body = await request.json()
        password = body.get('password')
        email_verification = body.get('email_verification')  # Last 5 characters before @
        
        if not password or not email_verification:
            raise HTTPException(status_code=400, detail="Password and email verification are required")
        
        # Get user's current email
        user_data = db.get_candidate(candidate_id=current_user['id'])
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify password
        if not auth_manager.verify_password_bcrypt(password, user_data['password_hash']):
            raise HTTPException(status_code=401, detail="Incorrect password")
        
        # Verify email verification (last 5 characters before @)
        user_email = user_data['email']
        email_prefix = user_email.split('@')[0]
        expected_verification = email_prefix[-5:] if len(email_prefix) >= 5 else email_prefix
        
        if email_verification.lower() != expected_verification.lower():
            raise HTTPException(status_code=400, detail="Email verification does not match")
        
        # Delete all user data
        success = db.delete_candidate_and_data(current_user['id'])
        
        if success:
            return {
                "success": True,
                "message": "Profile and all data deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete profile")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile deletion error: {e}")
        raise HTTPException(status_code=500, detail="Profile deletion failed")

@app.post("/candidates/upload_resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload and parse resume"""
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.docx', '.doc']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Save uploaded file temporarily
        temp_path = f"temp_{current_user['id']}_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Parse resume
        parsed_data = parser.parse_resume(temp_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        if not parsed_data:
            raise HTTPException(status_code=400, detail="Failed to parse resume")
        
        # Don't override email from resume
        if 'email' in parsed_data:
            del parsed_data['email']
        
        return {
            "success": True,
            "message": "Resume parsed successfully",
            "parsed_data": parsed_data
        }
    
    except Exception as e:
        logger.error(f"Resume upload error: {e}")
        # Clean up temp file if it exists
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail="Resume processing failed")

# Public resume parse for signup auto-fill (no auth required)
@app.post("/parse_resume")
async def parse_resume_public(file: UploadFile = File(...)):
    """Parse resume without authentication for signup auto-fill"""
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.docx', '.doc']
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )

        temp_path = f"temp_signup_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        parsed_data = parser.parse_resume(temp_path)

        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if not parsed_data:
            raise HTTPException(status_code=400, detail="Failed to parse resume")

        return {
            "success": True,
            "message": "Resume parsed successfully",
            "parsed_data": parsed_data
        }
    except Exception as e:
        logger.error(f"Public resume parse error: {e}")
        # Cleanup just in case
        try:
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Resume processing failed")

# Internship endpoints
@app.get("/internships")
async def get_internships(
    limit: int = 20,
    offset: int = 0
):
    """Get list of all internships"""
    try:
        internships = db.get_all_internships(active_only=True)
        
        # Apply pagination
        paginated = internships[offset:offset + limit]
        
        return {
            "success": True,
            "total": len(internships),
            "limit": limit,
            "offset": offset,
            "internships": paginated
        }
    
    except Exception as e:
        logger.error(f"Get internships error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch internships")

@app.get("/internships/{internship_id}")
async def get_internship(internship_id: int):
    """Get specific internship details"""
    try:
        internship = db.get_internship(internship_id)
        
        if internship:
            return {
                "success": True,
                "internship": internship
            }
        else:
            raise HTTPException(status_code=404, detail="Internship not found")
    
    except Exception as e:
        logger.error(f"Get internship error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch internship")

# Recommendation endpoints
@app.get("/recommendations")
async def get_recommendations(
    current_user: dict = Depends(get_current_user),
    limit: int = 5,
    use_cache: bool = True
):
    """Get personalized internship recommendations"""
    try:
        # ALWAYS clear cache to ensure fresh recommendations
        logger.info(f"Getting recommendations for user {current_user['id']} - clearing cache to ensure fresh data")
        logger.info(f"Getting recommendations for user {current_user['id']} - Limit: {limit}, Cache: {use_cache}")
        
        db.clear_duplicate_applications(current_user['id'])
        db.clear_recommendations_for_candidate(current_user['id'])
        
        recommendations = enhanced_engine.get_recommendations(
            current_user['id'],
            top_n=limit,
            use_cache=False  # Force fresh recommendations
        )
        
        # Format recommendations for response
        formatted_recommendations = [
            Utils.format_recommendation_card(rec) 
            for rec in recommendations
        ]
        
        # Check which ones are saved
        for rec in formatted_recommendations:
            rec['is_saved'] = db.is_internship_saved(
                current_user['id'], 
                rec.get('internship_id', 0)
            )
        
        logger.info(f"Returning {len(formatted_recommendations)} fresh recommendations for user {current_user['id']}")
        logger.info(f"Generated {len(formatted_recommendations)} recommendations for user {current_user['id']}")
        
        return {
            "success": True,
            "count": len(formatted_recommendations),
            "recommendations": formatted_recommendations
        }
    
    except Exception as e:
        logger.error(f"Recommendations error for user {current_user['id']}: {e}")
        logger.error(f"Get recommendations error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")

@app.get("/ml-status")
async def get_ml_status():
    """Get current ML system status and data availability"""
    try:
        status = enhanced_engine.get_ml_status()
        
        # Check if we have sample candidates (indicates sample data mode)
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM candidates WHERE email LIKE '%@example.com'")
        sample_candidates_count = cursor.fetchone()[0]
        conn.close()
        
        status['sample_data_mode'] = sample_candidates_count > 0
        status['sample_candidates_count'] = sample_candidates_count
        
        return {
            "success": True,
            "ml_status": status
        }
    except Exception as e:
        logger.error(f"ML status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get ML status")

@app.get("/collaborative-insights")
async def get_collaborative_insights():
    """Get collaborative filtering insights for demonstration"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Check if table exists first
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='collaborative_insights'
        """)
        table_exists = cursor.fetchone()
        
        if not table_exists:
            conn.close()
            return {
                "success": True,
                "insights": {},
                "total_insights": 0,
                "message": "No collaborative insights available yet. Generate sample data first."
            }
        
        # Get all collaborative insights
        cursor.execute("""
            SELECT insight_type, title, description, data, created_at
            FROM collaborative_insights
            ORDER BY insight_type, created_at DESC
        """)
        
        insights = []
        for row in cursor.fetchall():
            insight_type, title, description, data, created_at = row
            try:
                data_json = json.loads(data)
            except:
                data_json = {}
            
            insights.append({
                'type': insight_type,
                'title': title,
                'description': description,
                'data': data_json,
                'created_at': created_at
            })
        
        conn.close()
        
        # Group insights by type
        grouped_insights = {}
        for insight in insights:
            insight_type = insight['type']
            if insight_type not in grouped_insights:
                grouped_insights[insight_type] = []
            grouped_insights[insight_type].append(insight)
        
        return {
            "success": True,
            "insights": grouped_insights,
            "total_insights": len(insights)
        }
        
    except Exception as e:
        logger.error(f"Get collaborative insights error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get collaborative insights")

@app.get("/collaborative-insights/{internship_id}")
async def get_collaborative_insights_for_internship(internship_id: int):
    """Get collaborative insights for a specific internship based on real data"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get internship details
        cursor.execute('''
            SELECT title, company, required_skills, location
            FROM internships WHERE id = ?
        ''', (internship_id,))
        
        internship = cursor.fetchone()
        if not internship:
            conn.close()
            return {
                "success": False,
                "message": "Internship not found"
            }
        
        title, company, required_skills, location = internship
        
        # Get real collaborative insights based on trained models
        insights = []
        
        logger.info(f"Analyzing collaborative insights for internship {internship_id}: {title} at {company}")
        
        # Try to load trained models for better insights
        try:
            import joblib
            import os
            
            models_dir = "models"
            if os.path.exists(f"{models_dir}/trending_skills.joblib"):
                trending_skills = joblib.load(f"{models_dir}/trending_skills.joblib")
                company_popularity = joblib.load(f"{models_dir}/company_popularity.joblib")
                location_popularity = joblib.load(f"{models_dir}/location_popularity.joblib")
                user_similarity = joblib.load(f"{models_dir}/user_similarity.joblib")
                item_similarity = joblib.load(f"{models_dir}/item_similarity.joblib")
                
                logger.info("Loaded trained CF models for insights")
                use_trained_models = True
            else:
                logger.info("No trained models found, using basic analysis")
                use_trained_models = False
        except Exception as e:
            logger.warning(f"Could not load trained models: {e}")
            use_trained_models = False
        
        # 1. Check if skills are trending using trained models
        if required_skills:
            skills_list = [s.strip().lower() for s in required_skills.split(',')]
            logger.info(f"Required skills: {skills_list}")
            
            if use_trained_models:
                # Use trained trending skills model
                skill_trending_score = 0
                for skill in skills_list:
                    if skill in trending_skills:
                        skill_trending_score += trending_skills[skill]
                
                logger.info(f"Skill trending score from trained model: {skill_trending_score}")
                
                if skill_trending_score > 0:
                    insights.append({
                        "type": "trending_skills",
                        "title": "Skills in this card are high-in-demand",
                        "description": f"These skills are trending with score {skill_trending_score:.1f}",
                        "icon": "trending_up"
                    })
            else:
                # Fallback to basic analysis
                cursor.execute('''
                    SELECT COUNT(DISTINCT a.candidate_id) as application_count
                    FROM applications a
                    JOIN internships i ON a.internship_id = i.id
                    WHERE a.applied_at >= datetime('now', '-30 days')
                    AND (i.required_skills LIKE ? OR i.required_skills LIKE ? OR i.required_skills LIKE ?)
                ''', (f'%{skills_list[0]}%', f'%{skills_list[1] if len(skills_list) > 1 else skills_list[0]}%', f'%{skills_list[2] if len(skills_list) > 2 else skills_list[0]}%'))
                
                result = cursor.fetchone()
                trending_count = result[0] if result else 0
                
                if trending_count > 0:
                    insights.append({
                        "type": "trending_skills",
                        "title": "Skills in this card are high-in-demand",
                        "description": f"These skills are trending with {trending_count}+ recent applications",
                        "icon": "trending_up"
                    })
        
        # 2. Check if similar users have applied (based on user behavior patterns)
        cursor.execute('''
            SELECT COUNT(DISTINCT ub.candidate_id) as similar_users
            FROM user_behaviors ub
            JOIN internships i ON ub.internship_id = i.id
            WHERE ub.action IN ('apply', 'save', 'view')
            AND ub.candidate_id != ?
            AND (i.required_skills LIKE ? OR i.company = ?)
            AND ub.created_at >= datetime('now', '-30 days')
        ''', (1, f'%{required_skills.split(",")[0].strip()}%' if required_skills else '', company))
        
        result = cursor.fetchone()
        similar_users = result[0] if result else 0
        logger.info(f"Similar users count: {similar_users}")
        
        if similar_users > 0:  # Very low threshold
            insights.append({
                "type": "similar_users",
                "title": "People with similar profiles have liked this",
                "description": f"{similar_users} users with matching profiles have shown interest",
                "icon": "users"
            })
        
        # 3. Check if company is popular using trained models
        if use_trained_models:
            company_score = company_popularity.get(company, 0)
            logger.info(f"Company popularity score from trained model: {company_score}")
            
            if company_score > 0:
                insights.append({
                    "type": "popular_company",
                    "title": "This role is popular among your peers",
                    "description": f"{company} is a highly sought-after company with popularity score {company_score:.1f}",
                    "icon": "star"
                })
        else:
            # Fallback to basic analysis
            cursor.execute('''
                SELECT COUNT(*) as company_applications
                FROM applications a
                JOIN internships i ON a.internship_id = i.id
                WHERE i.company = ?
                AND a.applied_at >= datetime('now', '-30 days')
            ''', (company,))
            
            result = cursor.fetchone()
            company_applications = result[0] if result else 0
            logger.info(f"Company applications count: {company_applications}")
            
            if company_applications > 0:
                insights.append({
                    "type": "popular_company",
                    "title": "This role is popular among your peers",
                    "description": f"{company} is a highly sought-after company with {company_applications}+ recent applications",
                    "icon": "star"
                })
        
        # 4. Check location popularity using trained models
        if use_trained_models:
            location_score = location_popularity.get(location, 0)
            logger.info(f"Location popularity score from trained model: {location_score}")
            
            if location_score > 0:
                insights.append({
                    "type": "popular_location",
                    "title": "High match potential for your profile",
                    "description": f"{location} is a trending location with popularity score {location_score:.1f}",
                    "icon": "zap"
                })
        else:
            # Fallback to basic analysis
            cursor.execute('''
                SELECT COUNT(*) as location_applications
                FROM applications a
                JOIN internships i ON a.internship_id = i.id
                WHERE i.location = ?
                AND a.applied_at >= datetime('now', '-30 days')
            ''', (location,))
            
            result = cursor.fetchone()
            location_applications = result[0] if result else 0
            logger.info(f"Location applications count: {location_applications}")
            
            if location_applications > 0:
                insights.append({
                    "type": "popular_location",
                    "title": "High match potential for your profile",
                    "description": f"{location} is a trending location with {location_applications}+ recent applications",
                    "icon": "zap"
                })
        
        conn.close()
        
        logger.info(f"Generated {len(insights)} insights for internship {internship_id}: {insights}")
        
        # Return the first relevant insight (or a default one)
        if insights:
            logger.info(f"Returning insight: {insights[0]}")
            return {
                "success": True,
                "insight": insights[0]  # Return the most relevant insight
            }
        else:
            # Generate meaningful variety even when no real data is available
            logger.info(f"No insights found, generating meaningful variety for internship {internship_id}")
            
            # Create meaningful insight types based on internship characteristics
            insight_types = []
            
            # 1. Skill-based insights (more specific)
            if required_skills:
                skills = [s.strip().lower() for s in required_skills.split(',')]
                
                # Tech skills trending
                if any(skill in ['python', 'javascript', 'react', 'node.js', 'aws', 'docker'] for skill in skills):
                    insight_types.append({
                        "type": "trending_skills",
                        "title": "🔥 Hot Tech Skills in Demand",
                        "description": f"Skills like {', '.join([s for s in skills if s in ['python', 'javascript', 'react', 'node.js', 'aws', 'docker']][:2])} are highly sought after",
                        "icon": "trending_up"
                    })
                
                # Data skills trending
                elif any(skill in ['sql', 'python', 'analytics', 'machine learning', 'statistics'] for skill in skills):
                    insight_types.append({
                        "type": "trending_skills",
                        "title": "📊 Data Skills on the Rise",
                        "description": f"Data skills like {', '.join([s for s in skills if s in ['sql', 'python', 'analytics', 'machine learning', 'statistics']][:2])} are in high demand",
                        "icon": "trending_up"
                    })
                
                # Design skills trending
                elif any(skill in ['figma', 'sketch', 'adobe', 'ui', 'ux', 'design'] for skill in skills):
                    insight_types.append({
                        "type": "trending_skills",
                        "title": "🎨 Creative Skills Trending",
                        "description": f"Design skills like {', '.join([s for s in skills if s in ['figma', 'sketch', 'adobe', 'ui', 'ux', 'design']][:2])} are highly valued",
                        "icon": "trending_up"
                    })
            
            # 2. Company-based insights (more specific)
            if 'tech' in company.lower() or 'ai' in company.lower() or 'data' in company.lower():
                insight_types.append({
                    "type": "popular_company",
                    "title": "🚀 Tech Company Alert",
                    "description": f"{company} is a growing tech company with great opportunities",
                    "icon": "star"
                })
            elif 'startup' in company.lower() or 'hub' in company.lower():
                insight_types.append({
                    "type": "popular_company",
                    "title": "💡 Startup Environment",
                    "description": f"{company} offers fast-paced startup experience and growth",
                    "icon": "star"
                })
            elif 'corp' in company.lower() or 'solutions' in company.lower():
                insight_types.append({
                    "type": "popular_company",
                    "title": "🏢 Established Company",
                    "description": f"{company} provides stable corporate experience and mentorship",
                    "icon": "star"
                })
            
            # 3. Location-based insights (more specific)
            if location.lower() in ['bangalore', 'mumbai', 'delhi', 'hyderabad']:
                insight_types.append({
                    "type": "popular_location",
                    "title": "📍 Major Tech Hub",
                    "description": f"{location} is a major tech hub with excellent networking opportunities",
                    "icon": "zap"
                })
            elif 'remote' in location.lower() or 'work from home' in location.lower():
                insight_types.append({
                    "type": "popular_location",
                    "title": "🏠 Remote Work Opportunity",
                    "description": f"Remote work offers flexibility and work-life balance",
                    "icon": "zap"
                })
            
            # 4. Role-specific insights (more meaningful)
            if 'product' in title.lower() or 'manager' in title.lower():
                insight_types.append({
                    "type": "role_specific",
                    "title": "📈 Product Management Path",
                    "description": "Product roles offer strategic thinking and leadership experience",
                    "icon": "trending_up"
                })
            elif 'data' in title.lower() or 'analyst' in title.lower():
                insight_types.append({
                    "type": "role_specific",
                    "title": "📊 Data-Driven Role",
                    "description": "Data roles are essential in today's data-driven world",
                    "icon": "trending_up"
                })
            elif 'design' in title.lower() or 'ui' in title.lower() or 'ux' in title.lower():
                insight_types.append({
                    "type": "role_specific",
                    "title": "🎨 Creative Design Role",
                    "description": "Design roles combine creativity with technical skills",
                    "icon": "trending_up"
                })
            elif 'marketing' in title.lower() or 'growth' in title.lower():
                insight_types.append({
                    "type": "role_specific",
                    "title": "📢 Marketing & Growth",
                    "description": "Marketing roles offer diverse skills and creative opportunities",
                    "icon": "trending_up"
                })
            elif 'devops' in title.lower() or 'cloud' in title.lower():
                insight_types.append({
                    "type": "role_specific",
                    "title": "☁️ Cloud & DevOps",
                    "description": "DevOps roles are crucial for modern software development",
                    "icon": "trending_up"
                })
            
            # 5. Experience level insights
            if 'senior' in title.lower() or 'lead' in title.lower():
                insight_types.append({
                    "type": "experience_level",
                    "title": "👑 Senior Level Role",
                    "description": "Senior roles offer leadership opportunities and higher impact",
                    "icon": "star"
                })
            elif 'junior' in title.lower() or 'entry' in title.lower():
                insight_types.append({
                    "type": "experience_level",
                    "title": "🌱 Entry Level Opportunity",
                    "description": "Perfect for building foundational skills and experience",
                    "icon": "zap"
                })
            
            # 6. Industry insights
            if 'fintech' in company.lower() or 'finance' in company.lower():
                insight_types.append({
                    "type": "industry",
                    "title": "💰 FinTech Industry",
                    "description": "FinTech is one of the fastest-growing sectors with high demand",
                    "icon": "trending_up"
                })
            elif 'healthcare' in company.lower() or 'medical' in company.lower():
                insight_types.append({
                    "type": "industry",
                    "title": "🏥 Healthcare Tech",
                    "description": "Healthcare tech is growing rapidly with meaningful impact",
                    "icon": "trending_up"
                })
            
            # Use internship ID to consistently show the same insight for the same internship
            if insight_types:
                index = internship_id % len(insight_types)
                selected_insight = insight_types[index]
            else:
                # Final fallback - at least make it specific to the role
                selected_insight = {
                    "type": "default",
                    "title": "🎯 Great Learning Opportunity",
                    "description": f"This {title} role at {company} offers valuable experience",
                    "icon": "check"
                }
            
            logger.info(f"Returning meaningful variety insight: {selected_insight}")
            return {
                "success": True,
                "insight": selected_insight
            }
        
    except Exception as e:
        logger.error(f"Get collaborative insights for internship error: {e}")
        return {
            "success": False,
            "message": "Failed to fetch collaborative insights"
        }

@app.post("/internships/{internship_id}/save")
async def save_internship(
    internship_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Save an internship to user's list"""
    try:
        success = db.save_internship(current_user['id'], internship_id)
        
        if success:
            return {
                "success": True,
                "message": "Internship saved successfully"
            }
        else:
            return {
                "success": False,
                "message": "Internship already saved"
            }
    
    except Exception as e:
        logger.error(f"Save internship error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save internship")

@app.delete("/internships/{internship_id}/save")
async def unsave_internship(
    internship_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Remove internship from user's saved list"""
    try:
        success = db.unsave_internship(current_user['id'], internship_id)
        
        if success:
            return {
                "success": True,
                "message": "Internship removed from saved list"
            }
        else:
            return {
                "success": False,
                "message": "Internship not in saved list"
            }
    
    except Exception as e:
        logger.error(f"Unsave internship error: {e}")
        raise HTTPException(status_code=500, detail="Failed to unsave internship")

@app.get("/saved-internships")
async def get_saved_internships(
    current_user: dict = Depends(get_current_user)
):
    """Get all saved internships for current user"""
    try:
        saved = db.get_saved_internships(current_user['id'])
        
        return {
            "success": True,
            "count": len(saved),
            "internships": saved
        }
    
    except Exception as e:
        logger.error(f"Get saved internships error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch saved internships")

@app.get("/recommendations/{candidate_id}")
async def get_recommendations_for_candidate(
    candidate_id: int,
    limit: int = 5,
    current_user: dict = Depends(get_current_user)
):
    """Get recommendations for specific candidate (admin feature)"""
    try:
        # In production, check if current user has admin privileges
        recommendations = recommender.get_recommendations(
            candidate_id,
            top_n=limit,
            use_cache=False
        )
        
        return {
            "success": True,
            "candidate_id": candidate_id,
            "count": len(recommendations),
            "recommendations": recommendations
        }
    
    except Exception as e:
        logger.error(f"Get candidate recommendations error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")

# Utility endpoints
@app.post("/seed_data")
async def seed_data():
    """Seed database with sample data (development only)"""
    try:
        # Create sample data files
        Utils.create_sample_files()
        
        # Seed internships
        success = db.seed_internships("data/internships.json")
        
        if success:
            return {
                "success": True,
                "message": "Database seeded successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to seed database")
    
    except Exception as e:
        logger.error(f"Seed data error: {e}")
        raise HTTPException(status_code=500, detail="Database seeding failed")

# Application endpoints
@app.post("/applications/{internship_id}/apply")
async def apply_for_internship(
    internship_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Apply for an internship"""
    try:
        success = db.apply_for_internship(current_user['id'], internship_id)
        
        if success:
            return {
                "success": True,
                "message": "Application submitted successfully!"
            }
        else:
            return {
                "success": False,
                "message": "You have already applied for this internship"
            }
    
    except Exception as e:
        logger.error(f"Apply for internship error: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit application")

@app.get("/applications")
async def get_applications(
    current_user: dict = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Get applications for the current user with pagination and filtering"""
    try:
        # Validate status filter
        valid_statuses = ['pending', 'accepted', 'withdrawn', 'rejected']
        if status and status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status filter. Must be one of: {valid_statuses}"
            )
        
        # Get applications with filters
        applications = db.get_applications(
            current_user['id'],
            limit=limit,
            offset=offset,
            status=status,
            search=search
        )
        
        # Get total count for pagination
        total_count = db.get_applications_count(
            current_user['id'],
            status=status,
            search=search
        )
        
        return {
            "success": True,
            "count": len(applications),
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count,
            "applications": applications
        }
    
    except Exception as e:
        logger.error(f"Get applications error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch applications")

@app.put("/applications/{application_id}/status")
async def update_application_status(
    application_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update application status (accepted, withdrawn, etc.)"""
    try:
        body = await request.json()
        status = body.get('status')
        
        # Validate status
        valid_statuses = ['accepted', 'withdrawn', 'pending', 'rejected']
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        
        success = db.update_application_status(application_id, status)
        
        if success:
            return {
                "success": True,
                "message": f"Application status updated to {status}"
            }
        else:
            return {
                "success": False,
                "message": "Application not found"
            }
    
    except Exception as e:
        logger.error(f"Update application status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update application status")

@app.get("/internships/{internship_id}/applied")
async def check_application_status(
    internship_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Check if user has applied for a specific internship"""
    try:
        is_applied = db.is_internship_applied(current_user['id'], internship_id)
        
        return {
            "success": True,
            "applied": is_applied
        }
    
    except Exception as e:
        logger.error(f"Check application status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check application status")

@app.get("/internships/{internship_id}/application-status")
async def get_application_status_by_internship(
    internship_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get application status for a specific internship"""
    try:
        application = db.get_application_by_internship(current_user['id'], internship_id)
        
        if not application:
            return {
                "success": True,
                "status": "not_applied",
                "application_id": None
            }
        
        return {
            "success": True,
            "status": application['status'],
            "application_id": application['id']
        }
    
    except Exception as e:
        logger.error(f"Get application status by internship error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get application status")

@app.delete("/applications/{application_id}/withdraw")
async def withdraw_application(
    application_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Withdraw an application and return it to recommendations"""
    try:
        # Get application details first
        application = db.get_application_details(application_id)
        if not application:
            return {
                "success": False,
                "message": "Application not found"
            }
        
        # Check if user owns this application
        if application['candidate_id'] != current_user['id']:
            return {
                "success": False,
                "message": "Unauthorized access to application"
            }
        
        # Update status to withdrawn instead of deleting
        success = db.update_application_status(application_id, 'withdrawn')
        
        if success:
            return {
                "success": True,
                "message": "Application withdrawn successfully. It will appear in recommendations again.",
                "internship_id": application['internship_id']
            }
        else:
            return {
                "success": False,
                "message": "Failed to withdraw application"
            }
    
    except Exception as e:
        logger.error(f"Withdraw application error: {e}")
        raise HTTPException(status_code=500, detail="Failed to withdraw application")

@app.get("/applications/{application_id}/details")
async def get_application_details(
    application_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed application information including timestamps"""
    try:
        application = db.get_application_details(application_id)
        
        if not application:
            return {
                "success": False,
                "message": "Application not found"
            }
        
        # Check if user owns this application
        if application['candidate_id'] != current_user['id']:
            return {
                "success": False,
                "message": "Unauthorized access to application"
            }
        
        return {
            "success": True,
            "application": application
        }
    
    except Exception as e:
        logger.error(f"Get application details error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch application details")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

# ML and Analytics endpoints
@app.post("/track-behavior")
async def track_behavior(
    behavior_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Track user behavior for ML learning"""
    try:
        action = behavior_data.get('action')
        internship_id = behavior_data.get('internship_id')
        metadata = behavior_data.get('metadata', {})
        
        if not action or not internship_id:
            raise HTTPException(status_code=400, detail="Action and internship_id are required")
        
        enhanced_engine.track_user_behavior(
            current_user['id'],
            action,
            internship_id,
            metadata
        )
        
        return {"message": "Behavior tracked successfully"}
    except Exception as e:
        logger.error(f"Track behavior error: {e}")
        raise HTTPException(status_code=500, detail="Failed to track behavior")

@app.get("/recommendations/{candidate_id}/explanation")
async def get_recommendation_explanation(
    candidate_id: int,
    internship_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed explanation for a specific recommendation"""
    try:
        if current_user['id'] != candidate_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        explanation = enhanced_engine.get_recommendation_explanation(
            candidate_id, internship_id
        )
        
        return explanation
    except Exception as e:
        logger.error(f"Get explanation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get explanation")

@app.get("/user-insights")
async def get_user_insights(
    current_user: dict = Depends(get_current_user)
):
    """Get user insights based on behavior analysis"""
    try:
        insights = enhanced_engine.get_user_insights(current_user['id'])
        return insights
    except Exception as e:
        logger.error(f"Get user insights error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user insights")

@app.get("/market-insights")
async def get_market_insights():
    """Get market insights based on application data"""
    try:
        insights = enhanced_engine.get_market_insights()
        return insights
    except Exception as e:
        logger.error(f"Get market insights error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get market insights")

@app.get("/trending-skills")
async def get_trending_skills(limit: int = 10):
    """Get trending skills based on recent applications"""
    try:
        trending = enhanced_engine.get_trending_skills()
        return {"trending_skills": trending[:limit]}
    except Exception as e:
        logger.error(f"Get trending skills error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get trending skills")

@app.post("/retrain-models")
async def retrain_models(
    current_user: dict = Depends(get_current_user)
):
    """Retrain ML models with latest data (admin only)"""
    try:
        # In production, add admin check here
        enhanced_engine.retrain_models()
        return {"message": "Models retrained successfully"}
    except Exception as e:
        logger.error(f"Retrain models error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrain models")

@app.post("/generate-sample-data")
async def generate_sample_data(current_user: dict = Depends(get_current_user)):
    """Generate sample behavior and application data for testing (development only)"""
    try:
        from train_ml_models import generate_sample_behavior_data, generate_sample_application_data
        
        # IMPORTANT: Only seed candidates during sample data generation, not on startup
        logger.info("Seeding diverse candidates for collaborative filtering...")
        db.seed_candidates("data/candidates.json")
        
        # Generate behavior data
        generate_sample_behavior_data(db, num_users=10, num_interactions=100)
        
        # Generate application data
        generate_sample_application_data(db, num_applications=30)
        
        # IMPORTANT: Create some applications for the current user to demonstrate filtering
        logger.info(f"Creating sample applications for current user {current_user['id']}...")
        internships = db.get_all_internships(active_only=True)
        if internships:
            # Apply to 2-3 random internships for the current user
            import random
            selected_internships = random.sample(internships, min(3, len(internships)))
            
            # Create applications directly in database to avoid conflicts
            conn = db.get_connection()
            cursor = conn.cursor()
            
            for internship in selected_internships:
                try:
                    # Check if application already exists
                    cursor.execute('''
                        SELECT id FROM applications 
                        WHERE candidate_id = ? AND internship_id = ?
                    ''', (current_user['id'], internship['id']))
                    
                    if not cursor.fetchone():
                        # Insert new application
                        cursor.execute('''
                            INSERT INTO applications (candidate_id, internship_id, status, applied_at)
                            VALUES (?, ?, 'pending', CURRENT_TIMESTAMP)
                        ''', (current_user['id'], internship['id']))
                        logger.info(f"Created sample application for user {current_user['id']} to internship {internship['id']}")
                    else:
                        logger.info(f"Application already exists for user {current_user['id']} to internship {internship['id']}")
                        
                except Exception as e:
                    logger.warning(f"Could not create application for user {current_user['id']} to internship {internship['id']}: {e}")
            
            conn.commit()
            conn.close()
            
            # CRITICAL: Clear all recommendation caches to ensure fresh recommendations
            # that respect the new application data
            logger.info("Clearing all recommendation caches to ensure fresh recommendations...")
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM recommendations")
            conn.commit()
            conn.close()
            
            # Also clear cache for all candidates to ensure fresh recommendations
            all_candidates = db.get_all_candidates()
            for candidate in all_candidates:
                db.clear_recommendations_for_candidate(candidate['id'])
                logger.info(f"Cleared recommendations cache for candidate {candidate['id']}")
        
        # Generate collaborative filtering insights for demonstration
        logger.info("Generating collaborative filtering insights for demonstration...")
        import time
        time.sleep(0.5)  # Small delay to prevent database locking
        _generate_collaborative_insights(db)
        
        # Generate additional diverse behavior data for better insights
        logger.info("Generating additional diverse behavior data for better insights...")
        _generate_diverse_behavior_data(db)
        
        # Generate more comprehensive training data for collaborative filtering
        logger.info("Generating comprehensive training data for collaborative filtering...")
        _generate_comprehensive_training_data(db)
        
        # Train collaborative filtering model on the generated data
        logger.info("Training collaborative filtering model on sample data...")
        _train_collaborative_filtering_model(db)
        
        # Clear all recommendation caches to ensure fresh recommendations
        # that respect the new application data
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM recommendations")
        conn.commit()
        conn.close()
        
        # Also clear cache for all candidates to ensure fresh recommendations
        all_candidates = db.get_all_candidates()
        for candidate in all_candidates:
            db.clear_recommendations_for_candidate(candidate['id'])
        
        # Get counts
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM user_behaviors")
        behavior_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM applications")
        application_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "success": True,
            "message": "Sample data generated successfully",
            "data": {
                "behavior_records": behavior_count,
                "applications": application_count
            }
        }
    except Exception as e:
        logger.error(f"Generate sample data error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate sample data")

@app.post("/reset-insights-data")
async def reset_insights_data():
    """Reset all behavior and application data for fresh demonstration (development only)"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get counts before deletion
        cursor.execute("SELECT COUNT(*) FROM user_behaviors")
        behavior_count_before = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM applications")
        application_count_before = cursor.fetchone()[0]
        
        # Delete all behavior data
        cursor.execute("DELETE FROM user_behaviors")
        behaviors_deleted = cursor.rowcount
        
        # Delete all application data
        cursor.execute("DELETE FROM applications")
        applications_deleted = cursor.rowcount
        
        # Clear recommendations cache
        cursor.execute("DELETE FROM recommendations")
        recommendations_deleted = cursor.rowcount
        
        # Clear saved internships
        cursor.execute("DELETE FROM saved_internships")
        saved_deleted = cursor.rowcount
        
        # Clear collaborative insights (if table exists)
        try:
            cursor.execute("DELETE FROM collaborative_insights")
            insights_deleted = cursor.rowcount
        except sqlite3.OperationalError:
            # Table doesn't exist yet, which is fine
            insights_deleted = 0
        
        # IMPORTANT: Also remove sample candidates (keep only real users)
        # Get list of sample candidate emails to remove
        sample_emails = [
            'john.doe@example.com', 'jane.smith@example.com', 'alex.chen@example.com',
            'sarah.wilson@example.com', 'mike.johnson@example.com', 'emma.davis@example.com',
            'david.brown@example.com', 'lisa.garcia@example.com', 'ryan.taylor@example.com',
            'sophie.martin@example.com'
        ]
        
        # Delete sample candidates
        sample_candidates_deleted = 0
        for email in sample_emails:
            cursor.execute("DELETE FROM candidates WHERE email = ?", (email,))
            sample_candidates_deleted += cursor.rowcount
        
        conn.commit()
        conn.close()
        
        logger.info(f"Reset insights data: {behaviors_deleted} behaviors, {applications_deleted} applications, {recommendations_deleted} recommendations, {saved_deleted} saved internships, {insights_deleted} collaborative insights, {sample_candidates_deleted} sample candidates")
        
        return {
            "success": True,
            "message": "All insights data reset successfully",
            "data": {
                "behaviors_deleted": behaviors_deleted,
                "applications_deleted": applications_deleted,
                "recommendations_deleted": recommendations_deleted,
                "saved_deleted": saved_deleted,
                "insights_deleted": insights_deleted,
                "sample_candidates_deleted": sample_candidates_deleted
            }
        }
    except Exception as e:
        logger.error(f"Reset insights data error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset insights data")

def _generate_collaborative_insights(db: Database):
    """Generate collaborative filtering insights for demonstration"""
    conn = None
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Create insights table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS collaborative_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                insight_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Clear existing insights
        cursor.execute("DELETE FROM collaborative_insights")
        
        # Get all behaviors for analysis
        cursor.execute("""
            SELECT ub.candidate_id, ub.internship_id, ub.action, 
                   c.name, c.skills, c.location,
                   i.title, i.company, i.required_skills
            FROM user_behaviors ub
            JOIN candidates c ON ub.candidate_id = c.id
            JOIN internships i ON ub.internship_id = i.id
            WHERE ub.action IN ('save', 'apply', 'accept')
        """)
        behaviors = cursor.fetchall()
        
        if not behaviors:
            return
        
        # 1. User Clustering Insights
        _generate_user_clustering_insights(cursor, behaviors)
        
        # 2. Cross-Domain Discovery Insights  
        _generate_cross_domain_insights(cursor, behaviors)
        
        # 3. Location-Based Patterns
        _generate_location_patterns_insights(cursor, behaviors)
        
        # 4. Skill-Based Clustering
        _generate_skill_clustering_insights(cursor, behaviors)
        
        # 5. Company Preference Patterns
        _generate_company_patterns_insights(cursor, behaviors)
        
        # 6. Behavioral Pattern Insights
        _generate_behavioral_patterns_insights(cursor, behaviors)
        
        conn.commit()
        
        logger.info("Collaborative filtering insights generated successfully")
        
    except Exception as e:
        logger.error(f"Error generating collaborative insights: {e}")
    finally:
        if conn:
            conn.close()

def _generate_user_clustering_insights(cursor, behaviors):
    """Generate user clustering insights"""
    from collections import defaultdict
    
    # Group users by their preferences
    user_preferences = defaultdict(list)
    for behavior in behaviors:
        candidate_id, _, action, name, skills, location, title, company, required_skills = behavior
        if action in ['save', 'apply', 'accept']:
            user_preferences[candidate_id].append({
                'name': name,
                'skills': skills,
                'location': location,
                'title': title,
                'company': company,
                'required_skills': required_skills
            })
    
    # Find user clusters
    clusters = defaultdict(list)
    for candidate_id, preferences in user_preferences.items():
        if len(preferences) >= 2:  # Users with multiple preferences
            # Determine cluster based on skills and preferences
            skills = preferences[0]['skills'].lower()
            if 'machine learning' in skills or 'data science' in skills or 'ai' in skills:
                clusters['ML/AI Cluster'].append(preferences[0]['name'])
            elif 'product' in skills or 'management' in skills:
                clusters['Product Management Cluster'].append(preferences[0]['name'])
            elif 'frontend' in skills or 'react' in skills or 'ui' in skills:
                clusters['Frontend Development Cluster'].append(preferences[0]['name'])
            elif 'backend' in skills or 'node' in skills or 'python' in skills:
                clusters['Backend Development Cluster'].append(preferences[0]['name'])
            elif 'devops' in skills or 'aws' in skills or 'docker' in skills:
                clusters['DevOps Cluster'].append(preferences[0]['name'])
    
            # Create insights for each cluster
            for cluster_name, users in clusters.items():
                if len(users) >= 2:
                    cursor.execute('''
                        INSERT INTO collaborative_insights 
                        (insight_type, title, description, data)
                        VALUES (?, ?, ?, ?)
                    ''', (
                        'user_clustering',
                        f'{cluster_name}',
                        f'People with similar skills and interests have applied to internships in this domain',
                        json.dumps({
                            'cluster_name': cluster_name,
                            'count': len(users),
                            'description': f'{len(users)} people with similar profiles'
                        })
                    ))

def _generate_cross_domain_insights(cursor, behaviors):
    """Generate cross-domain discovery insights"""
    from collections import defaultdict
    
    # Track what users who liked X also liked Y
    user_likes = defaultdict(set)
    for behavior in behaviors:
        candidate_id, internship_id, action, name, skills, location, title, company, required_skills = behavior
        if action in ['save', 'apply', 'accept']:
            user_likes[candidate_id].add((title, company, required_skills))
    
    # Find cross-domain patterns
    cross_domain_patterns = defaultdict(int)
    for candidate_id, likes in user_likes.items():
        if len(likes) >= 2:
            likes_list = list(likes)
            for i in range(len(likes_list)):
                for j in range(i+1, len(likes_list)):
                    title1, company1, skills1 = likes_list[i]
                    title2, company2, skills2 = likes_list[j]
                    
                    # Create pattern key
                    pattern = f"{title1} → {title2}"
                    cross_domain_patterns[pattern] += 1
    
    # Create insights for strong patterns
    for pattern, count in cross_domain_patterns.items():
        if count >= 2:
            cursor.execute('''
                INSERT INTO collaborative_insights 
                (insight_type, title, description, data)
                VALUES (?, ?, ?, ?)
            ''', (
                'cross_domain',
                f'People who liked {pattern.split(" → ")[0]} also liked {pattern.split(" → ")[1]}',
                f'This pattern was observed {count} times among people',
                json.dumps({
                    'pattern': pattern,
                    'count': count,
                    'strength': 'strong' if count >= 3 else 'moderate',
                    'description': f'{count} people show this preference pattern'
                })
            ))

def _generate_location_patterns_insights(cursor, behaviors):
    """Generate location-based pattern insights"""
    from collections import defaultdict
    
    # Group by location
    location_preferences = defaultdict(list)
    for behavior in behaviors:
        candidate_id, _, action, name, skills, location, title, company, required_skills = behavior
        if action in ['save', 'apply', 'accept']:
            location_preferences[location].append({
                'name': name,
                'title': title,
                'company': company
            })
    
    # Find location-based patterns
    for location, preferences in location_preferences.items():
        if len(preferences) >= 2:
            companies = [p['company'] for p in preferences]
            company_counts = defaultdict(int)
            for company in companies:
                company_counts[company] += 1
            
            # Find popular companies in this location
            popular_companies = [company for company, count in company_counts.items() if count >= 2]
            
            if popular_companies:
                cursor.execute('''
                    INSERT INTO collaborative_insights 
                    (insight_type, title, description, data)
                    VALUES (?, ?, ?, ?)
                ''', (
                    'location_patterns',
                    f'Popular companies in {location}',
                    f'People in {location} prefer these companies',
                    json.dumps({
                        'location': location,
                        'popular_companies': popular_companies,
                        'user_count': len(preferences),
                        'description': f'{len(preferences)} people in {location} show these preferences'
                    })
                ))

def _generate_skill_clustering_insights(cursor, behaviors):
    """Generate skill-based clustering insights"""
    from collections import defaultdict
    
    # Group by skill preferences
    skill_preferences = defaultdict(list)
    for behavior in behaviors:
        candidate_id, _, action, name, skills, location, title, company, required_skills = behavior
        if action in ['save', 'apply', 'accept']:
            # Extract key skills from required_skills
            if required_skills:
                for skill in required_skills.split(','):
                    skill = skill.strip().lower()
                    if skill:
                        skill_preferences[skill].append({
                            'name': name,
                            'title': title,
                            'company': company
                        })
    
    # Find skill clusters
    for skill, preferences in skill_preferences.items():
        if len(preferences) >= 2:
            companies = [p['company'] for p in preferences]
            company_counts = defaultdict(int)
            for company in companies:
                company_counts[company] += 1
            
            popular_companies = [company for company, count in company_counts.items() if count >= 2]
            
            if popular_companies:
                cursor.execute('''
                    INSERT INTO collaborative_insights 
                    (insight_type, title, description, data)
                    VALUES (?, ?, ?, ?)
                ''', (
                    'skill_clustering',
                    f'Users interested in {skill.title()} prefer these companies',
                    f'Companies popular among {skill} enthusiasts: {", ".join(popular_companies)}',
                    json.dumps({
                        'skill': skill,
                        'popular_companies': popular_companies,
                        'user_count': len(preferences)
                    })
                ))

def _generate_company_patterns_insights(cursor, behaviors):
    """Generate company preference pattern insights"""
    from collections import defaultdict
    
    # Track company preferences
    company_preferences = defaultdict(list)
    for behavior in behaviors:
        candidate_id, _, action, name, skills, location, title, company, required_skills = behavior
        if action in ['save', 'apply', 'accept']:
            company_preferences[company].append({
                'name': name,
                'skills': skills,
                'title': title
            })
    
    # Find company patterns
    for company, preferences in company_preferences.items():
        if len(preferences) >= 2:
            # Find common skills among users who like this company
            all_skills = []
            for pref in preferences:
                if pref['skills']:
                    all_skills.extend([skill.strip().lower() for skill in pref['skills'].split(',')])
            
            skill_counts = defaultdict(int)
            for skill in all_skills:
                if skill:
                    skill_counts[skill] += 1
            
            common_skills = [skill for skill, count in skill_counts.items() if count >= 2]
            
            if common_skills:
                cursor.execute('''
                    INSERT INTO collaborative_insights 
                    (insight_type, title, description, data)
                    VALUES (?, ?, ?, ?)
                ''', (
                    'company_patterns',
                    f'Users who like {company} typically have these skills',
                    f'Common skills among {company} enthusiasts: {", ".join(common_skills[:5])}',
                    json.dumps({
                        'company': company,
                        'common_skills': common_skills,
                        'user_count': len(preferences)
                    })
                ))

def _generate_behavioral_patterns_insights(cursor, behaviors):
    """Generate behavioral pattern insights"""
    from collections import defaultdict
    
    # Track user behavior patterns
    user_actions = defaultdict(list)
    for behavior in behaviors:
        candidate_id, _, action, name, skills, location, title, company, required_skills = behavior
        user_actions[candidate_id].append({
            'name': name,
            'action': action,
            'title': title,
            'company': company
        })
    
    # Find behavioral patterns
    for candidate_id, actions in user_actions.items():
        if len(actions) >= 3:
            action_counts = defaultdict(int)
            for action in actions:
                action_counts[action['action']] += 1
            
            # Determine behavior type
            if action_counts['apply'] >= 2:
                behavior_type = "Decisive - Applies quickly to multiple opportunities"
            elif action_counts['save'] >= 2:
                behavior_type = "Cautious - Saves many but applies to few"
            else:
                behavior_type = "Explorer - Tries diverse opportunities"
            
            cursor.execute('''
                INSERT INTO collaborative_insights 
                (insight_type, title, description, data)
                VALUES (?, ?, ?, ?)
            ''', (
                'behavioral_patterns',
                f'User Behavior Pattern: {actions[0]["name"]}',
                behavior_type,
                json.dumps({
                    'user_name': actions[0]['name'],
                    'behavior_type': behavior_type,
                    'action_counts': dict(action_counts),
                    'total_actions': len(actions)
                })
            ))

# Run the application
if __name__ == "__main__":
    import uvicorn
    
    # Log server startup
    logger.info("SERVER STARTED - Host: 0.0.0.0, Port: 8000")
    
    # Initialize database and ensure data integrity
    logger.info("Database Initialization Started")
    db.init_db()
    Utils.create_sample_files()
    
    try:
        # Only seed if database is empty
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM internships')
        count = cursor.fetchone()[0]
        conn.close()
        
        if count == 0:
            db.seed_internships("data/internships.json")
            logger.info("Database Seeded - Internships data loaded successfully")
        else:
            logger.info(f"Database already has {count} internships, skipping seeding")
    except Exception as e:
        logger.error(f"Database Seeding Error: {e}")
        logger.error(f"Failed to seed internships: {e}")
        # Don't fail startup, but log the error
    
    # Log server ready
    logger.info("Server Ready - All components initialized, server starting...")
    
    # Run server
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

def _generate_diverse_behavior_data(db):
    """Generate diverse behavior data for better collaborative insights"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get all candidates and internships
        cursor.execute('SELECT id FROM candidates')
        candidates = [row[0] for row in cursor.fetchall()]
        
        cursor.execute('SELECT id, title, company, required_skills, location FROM internships')
        internships = cursor.fetchall()
        
        if not candidates or not internships:
            logger.warning("No candidates or internships found for diverse behavior generation")
            conn.close()
            return
        
        # Generate diverse behavior patterns
        import random
        from datetime import datetime, timedelta
        
        # Create behavior patterns for different types of users
        behavior_patterns = [
            {'actions': ['view', 'save', 'apply'], 'weight': 0.3},  # Engaged users
            {'actions': ['view'], 'weight': 0.4},  # Browsers
            {'actions': ['view', 'save'], 'weight': 0.2},  # Savers
            {'actions': ['view', 'apply'], 'weight': 0.1},  # Quick appliers
        ]
        
        # Generate behaviors for each candidate
        for candidate_id in candidates:
            # Select a behavior pattern
            pattern = random.choices(behavior_patterns, weights=[p['weight'] for p in behavior_patterns])[0]
            
            # Select random internships for this candidate
            num_internships = random.randint(3, 8)
            selected_internships = random.sample(internships, min(num_internships, len(internships)))
            
            for internship in selected_internships:
                internship_id = internship[0]
                
                # Generate behaviors based on pattern
                for action in pattern['actions']:
                    # Random timestamp within last 30 days
                    days_ago = random.randint(0, 30)
                    timestamp = datetime.now() - timedelta(days=days_ago)
                    
                    # Insert behavior
                    cursor.execute('''
                        INSERT INTO user_behaviors (candidate_id, internship_id, action, created_at)
                        VALUES (?, ?, ?, ?)
                    ''', (candidate_id, internship_id, action, timestamp))
        
        conn.commit()
        conn.close()
        
        logger.info("Generated diverse behavior data successfully")
        
    except Exception as e:
        logger.error(f"Error generating diverse behavior data: {e}")
        if 'conn' in locals():
            conn.close()

def _generate_comprehensive_training_data(db):
    """Generate comprehensive training data for collaborative filtering"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get all candidates and internships
        cursor.execute('SELECT id FROM candidates')
        candidates = [row[0] for row in cursor.fetchall()]
        
        cursor.execute('SELECT id, title, company, required_skills, location FROM internships')
        internships = cursor.fetchall()
        
        if not candidates or not internships:
            logger.warning("No candidates or internships found for comprehensive training data")
            conn.close()
            return
        
        # Generate comprehensive behavior patterns
        import random
        from datetime import datetime, timedelta
        
        # Create diverse user personas for better collaborative filtering
        user_personas = [
            {
                'name': 'tech_enthusiast',
                'preferred_skills': ['python', 'javascript', 'react', 'node.js', 'aws'],
                'preferred_companies': ['tech', 'ai', 'data', 'cloud'],
                'preferred_locations': ['bangalore', 'mumbai', 'delhi'],
                'behavior_pattern': ['view', 'save', 'apply'],
                'weight': 0.25
            },
            {
                'name': 'product_focused',
                'preferred_skills': ['product', 'analytics', 'strategy', 'management'],
                'preferred_companies': ['product', 'startup', 'growth'],
                'preferred_locations': ['bangalore', 'hyderabad'],
                'behavior_pattern': ['view', 'save'],
                'weight': 0.20
            },
            {
                'name': 'design_creative',
                'preferred_skills': ['design', 'ui', 'ux', 'figma', 'sketch'],
                'preferred_companies': ['design', 'creative', 'studio'],
                'preferred_locations': ['mumbai', 'delhi', 'bangalore'],
                'behavior_pattern': ['view', 'save', 'apply'],
                'weight': 0.15
            },
            {
                'name': 'data_analyst',
                'preferred_skills': ['python', 'sql', 'analytics', 'statistics', 'machine learning'],
                'preferred_companies': ['data', 'analytics', 'ai', 'research'],
                'preferred_locations': ['bangalore', 'hyderabad', 'mumbai'],
                'behavior_pattern': ['view', 'apply'],
                'weight': 0.20
            },
            {
                'name': 'business_oriented',
                'preferred_skills': ['business', 'marketing', 'sales', 'strategy'],
                'preferred_companies': ['business', 'marketing', 'growth'],
                'preferred_locations': ['mumbai', 'delhi', 'bangalore'],
                'behavior_pattern': ['view', 'save'],
                'weight': 0.20
            }
        ]
        
        # Generate behaviors for each candidate based on personas
        for candidate_id in candidates:
            # Select a persona for this candidate
            persona = random.choices(user_personas, weights=[p['weight'] for p in user_personas])[0]
            
            # Filter internships based on persona preferences
            matching_internships = []
            for internship in internships:
                internship_id, title, company, required_skills, location = internship
                
                # Check if internship matches persona preferences
                matches = False
                
                # Check skills match
                if required_skills:
                    skills = [s.strip().lower() for s in required_skills.split(',')]
                    if any(skill in persona['preferred_skills'] for skill in skills):
                        matches = True
                
                # Check company match
                if any(pref in company.lower() for pref in persona['preferred_companies']):
                    matches = True
                
                # Check location match
                if location.lower() in persona['preferred_locations']:
                    matches = True
                
                # Check title match
                if any(pref in title.lower() for pref in persona['preferred_skills']):
                    matches = True
                
                if matches:
                    matching_internships.append(internship)
            
            # If no matches, use random internships
            if not matching_internships:
                matching_internships = random.sample(internships, min(5, len(internships)))
            else:
                # Add some random internships for variety
                random_internships = random.sample(internships, min(3, len(internships)))
                matching_internships.extend(random_internships)
            
            # Generate behaviors based on persona pattern
            for internship in matching_internships:
                internship_id = internship[0]
                
                # Generate behaviors based on persona pattern
                for action in persona['behavior_pattern']:
                    # Random timestamp within last 30 days
                    days_ago = random.randint(0, 30)
                    timestamp = datetime.now() - timedelta(days=days_ago)
                    
                    # Insert behavior
                    cursor.execute('''
                        INSERT INTO user_behaviors (candidate_id, internship_id, action, created_at)
                        VALUES (?, ?, ?, ?)
                    ''', (candidate_id, internship_id, action, timestamp))
        
        # Generate cross-user interactions for better collaborative filtering
        logger.info("Generating cross-user interactions for collaborative filtering...")
        
        # Create user clusters based on similar preferences
        user_clusters = {}
        for candidate_id in candidates:
            # Get user's behavior patterns
            cursor.execute('''
                SELECT i.required_skills, i.company, i.location, i.title
                FROM user_behaviors ub
                JOIN internships i ON ub.internship_id = i.id
                WHERE ub.candidate_id = ? AND ub.action IN ('save', 'apply')
            ''', (candidate_id,))
            
            user_preferences = cursor.fetchall()
            if user_preferences:
                # Create a preference signature
                skills = set()
                companies = set()
                locations = set()
                
                for pref in user_preferences:
                    if pref[0]:  # required_skills
                        skills.update([s.strip().lower() for s in pref[0].split(',')])
                    if pref[1]:  # company
                        companies.add(pref[1].lower())
                    if pref[2]:  # location
                        locations.add(pref[2].lower())
                
                # Find similar users
                cluster_key = f"{sorted(skills)[:3]}_{sorted(companies)[:2]}_{sorted(locations)[:2]}"
                if cluster_key not in user_clusters:
                    user_clusters[cluster_key] = []
                user_clusters[cluster_key].append(candidate_id)
        
        # Generate cross-user recommendations based on clusters
        for cluster_key, cluster_users in user_clusters.items():
            if len(cluster_users) > 1:
                # Users in the same cluster should have similar behaviors
                for user_id in cluster_users:
                    # Get behaviors from other users in the cluster
                    other_users = [u for u in cluster_users if u != user_id]
                    if other_users:
                        # Get internships that other users in cluster liked
                        cursor.execute('''
                            SELECT DISTINCT ub.internship_id
                            FROM user_behaviors ub
                            WHERE ub.candidate_id IN ({}) 
                            AND ub.action IN ('save', 'apply')
                            AND ub.internship_id NOT IN (
                                SELECT internship_id FROM user_behaviors 
                                WHERE candidate_id = ? AND action IN ('save', 'apply')
                            )
                        '''.format(','.join(map(str, other_users))), (user_id,))
                        
                        recommended_internships = [row[0] for row in cursor.fetchall()]
                        
                        # Add some of these recommendations as behaviors
                        for internship_id in recommended_internships[:3]:  # Limit to 3
                            days_ago = random.randint(0, 30)
                            timestamp = datetime.now() - timedelta(days=days_ago)
                            
                            cursor.execute('''
                                INSERT INTO user_behaviors (candidate_id, internship_id, action, created_at)
                                VALUES (?, ?, ?, ?)
                            ''', (user_id, internship_id, 'view', timestamp))
        
        conn.commit()
        conn.close()
        
        logger.info("Generated comprehensive training data successfully")
        
    except Exception as e:
        logger.error(f"Error generating comprehensive training data: {e}")
        if 'conn' in locals():
            conn.close()

def _train_collaborative_filtering_model(db):
    """Train collaborative filtering model on sample data"""
    try:
        logger.info("Starting collaborative filtering model training...")
        
        # Get all behavior data for training
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get comprehensive behavior data
        cursor.execute('''
            SELECT ub.candidate_id, ub.internship_id, ub.action, ub.created_at,
                   c.name, c.skills, c.location as user_location,
                   i.title, i.company, i.location, i.required_skills, i.preferred_skills
            FROM user_behaviors ub
            JOIN candidates c ON ub.candidate_id = c.id
            JOIN internships i ON ub.internship_id = i.id
            ORDER BY ub.created_at DESC
        ''')
        
        behaviors = cursor.fetchall()
        logger.info(f"Training CF model on {len(behaviors)} behavior records")
        
        if not behaviors:
            logger.warning("No behavior data found for CF model training")
            conn.close()
            return
        
        # Create user-item interaction matrix
        import pandas as pd
        import numpy as np
        from sklearn.decomposition import NMF, TruncatedSVD
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import joblib
        import os
        
        # Prepare data for CF model
        cf_data = []
        for behavior in behaviors:
            candidate_id, internship_id, action, created_at, name, skills, user_location, title, company, location, required_skills, preferred_skills = behavior
            
            # Weight different actions
            action_weights = {
                'view': 1.0,
                'save': 3.0,
                'apply': 5.0,
                'accept': 7.0,
                'dismiss': -1.0,
                'unsave': -2.0
            }
            
            weight = action_weights.get(action, 1.0)
            
            cf_data.append({
                'user_id': candidate_id,
                'item_id': internship_id,
                'rating': weight,
                'action': action,
                'timestamp': created_at,
                'user_skills': skills,
                'user_location': user_location,
                'item_title': title,
                'item_company': company,
                'item_location': location,
                'item_required_skills': required_skills,
                'item_preferred_skills': preferred_skills
            })
        
        # Convert to DataFrame
        df = pd.DataFrame(cf_data)
        
        # Create user-item matrix
        user_item_matrix = df.pivot_table(
            index='user_id', 
            columns='item_id', 
            values='rating', 
            fill_value=0
        )
        
        logger.info(f"Created user-item matrix: {user_item_matrix.shape}")
        
        # Train NMF model
        nmf_model = NMF(n_components=min(10, user_item_matrix.shape[0], user_item_matrix.shape[1]), 
                       random_state=42, max_iter=200)
        user_factors = nmf_model.fit_transform(user_item_matrix)
        item_factors = nmf_model.components_
        
        # Train SVD model
        svd_model = TruncatedSVD(n_components=min(10, user_item_matrix.shape[0], user_item_matrix.shape[1]), 
                                random_state=42)
        svd_factors = svd_model.fit_transform(user_item_matrix)
        
        # Create skill-based features
        all_skills = set()
        for skills_str in df['item_required_skills'].dropna():
            if skills_str:
                all_skills.update([s.strip().lower() for s in skills_str.split(',')])
        
        # Create skill vectors for internships
        skill_features = []
        for _, row in df.groupby('item_id').first().iterrows():
            skills_str = row['item_required_skills'] or ''
            skills = [s.strip().lower() for s in skills_str.split(',') if s.strip()]
            skill_vector = [1 if skill in skills else 0 for skill in sorted(all_skills)]
            skill_features.append(skill_vector)
        
        skill_features = np.array(skill_features)
        
        # Train skill-based similarity model
        skill_similarity = cosine_similarity(skill_features)
        
        # Save models
        models_dir = "models"
        os.makedirs(models_dir, exist_ok=True)
        
        joblib.dump(nmf_model, f"{models_dir}/collaborative_filtering_nmf.joblib")
        joblib.dump(svd_model, f"{models_dir}/collaborative_filtering_svd.joblib")
        joblib.dump(skill_similarity, f"{models_dir}/skill_similarity.joblib")
        joblib.dump(user_item_matrix, f"{models_dir}/user_item_matrix.joblib")
        
        # Create trending skills analysis
        trending_skills = {}
        for skill in all_skills:
            skill_count = df[df['item_required_skills'].str.contains(skill, case=False, na=False)]['rating'].sum()
            trending_skills[skill] = skill_count
        
        # Save trending skills
        joblib.dump(trending_skills, f"{models_dir}/trending_skills.joblib")
        
        # Create company popularity analysis
        company_popularity = df.groupby('item_company')['rating'].sum().to_dict()
        joblib.dump(company_popularity, f"{models_dir}/company_popularity.joblib")
        
        # Create location popularity analysis
        location_popularity = df.groupby('item_location')['rating'].sum().to_dict()
        joblib.dump(location_popularity, f"{models_dir}/location_popularity.joblib")
        
        # Create user similarity matrix
        user_similarity = cosine_similarity(user_factors)
        joblib.dump(user_similarity, f"{models_dir}/user_similarity.joblib")
        
        # Create item similarity matrix
        item_similarity = cosine_similarity(item_factors.T)
        joblib.dump(item_similarity, f"{models_dir}/item_similarity.joblib")
        
        conn.close()
        
        logger.info("Collaborative filtering model training completed successfully")
        logger.info(f"Models saved: NMF, SVD, skill similarity, user similarity, item similarity")
        logger.info(f"Trending skills: {len(trending_skills)} skills analyzed")
        logger.info(f"Company popularity: {len(company_popularity)} companies analyzed")
        logger.info(f"Location popularity: {len(location_popularity)} locations analyzed")
        
    except Exception as e:
        logger.error(f"Error training collaborative filtering model: {e}")
        if 'conn' in locals():
            conn.close()

# Intelligent Chatbot Endpoints
class ChatbotRequest(BaseModel):
    question: str
    internship_id: int

class ChatbotResponse(BaseModel):
    response: str
    intent: str
    confidence: float
    attention_weights: Optional[List[List[float]]] = None

@app.post("/chatbot/test", response_model=ChatbotResponse)
async def test_chatbot(
    request: ChatbotRequest
):
    """Test chatbot without authentication - used as fallback"""
    try:
        # Use test data
        user_data = {
            'skills': 'Python, React, JavaScript',
            'experience_years': 2,
            'location': 'Mumbai',
            'education': 'Computer Science'
        }
        
        # Get internship data
        internship_data = db.get_internship(request.internship_id)
        if not internship_data:
            raise HTTPException(status_code=404, detail="Internship not found")
        
        # Generate response using intelligent chatbot
        response = chatbot_service.generate_response(
            question=request.question,
            user_data=user_data,
            internship_data=internship_data
        )
        
        return ChatbotResponse(
            response=response['response'],
            intent=response['intent'],
            confidence=response['confidence'],
            attention_weights=response['attention_weights']
        )
        
    except Exception as e:
        logger.error(f"Error in test chatbot: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate chatbot response")

@app.post("/chatbot/chat", response_model=ChatbotResponse)
async def chat_with_bot(
    request: ChatbotRequest,
    current_user: dict = Depends(get_current_user)
):
    """Chat with the intelligent chatbot about a specific internship"""
    try:
        # Get user data
        user_data = db.get_candidate(current_user['id'])
        logger.info(f"User data for ID {current_user['id']}: {user_data}")
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get internship data
        internship_data = db.get_internship(request.internship_id)
        logger.info(f"Internship data for ID {request.internship_id}: {internship_data}")
        if not internship_data:
            raise HTTPException(status_code=404, detail="Internship not found")
        
        # Generate response using intelligent chatbot
        logger.info(f"Generating response for question: {request.question}")
        response = chatbot_service.generate_response(
            question=request.question,
            user_data=user_data,
            internship_data=internship_data
        )
        logger.info(f"Generated response: {response}")
        
        return ChatbotResponse(
            response=response['response'],
            intent=response['intent'],
            confidence=response['confidence'],
            attention_weights=response['attention_weights']
        )
        
    except Exception as e:
        logger.error(f"Error in chatbot chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate chatbot response")

@app.post("/chatbot/train")
async def train_chatbot():
    """Train the intelligent chatbot on sample data"""
    try:
        # Generate sample training data
        sample_data = generate_sample_training_data()
        
        # Train the chatbot
        chatbot_service.train_on_sample_data(sample_data)
        
        # Save the trained model
        model_path = "intelligent_chatbot_model.pth"
        chatbot_service.save_model(model_path)
        
        return {"message": "Chatbot training completed successfully", "model_path": model_path}
        
    except Exception as e:
        logger.error(f"Error training chatbot: {e}")
        raise HTTPException(status_code=500, detail="Failed to train chatbot")

@app.get("/chatbot/status")
async def get_chatbot_status():
    """Get the status of the intelligent chatbot"""
    try:
        model_exists = os.path.exists("intelligent_chatbot_model.pth")
        return {
            "status": "active" if chatbot_service.model else "inactive",
            "vocab_size": chatbot_service.vocab_size,
            "model_loaded": chatbot_service.model is not None,
            "model_file_exists": model_exists,
            "intent_labels": chatbot_service.intent_labels,
            "auto_training": "enabled" if not model_exists else "disabled (model exists)"
        }
    except Exception as e:
        logger.error(f"Error getting chatbot status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chatbot status")

@app.post("/chatbot/retrain")
async def retrain_chatbot():
    """Force retrain the intelligent chatbot (overwrites existing model)"""
    try:
        logger.info("Starting forced retraining of chatbot...")
        
        # Generate sample training data
        from intelligent_chatbot import generate_sample_training_data
        sample_data = generate_sample_training_data()
        
        # Train the chatbot
        chatbot_service.train_on_sample_data(sample_data)
        
        # Save the trained model
        model_path = "intelligent_chatbot_model.pth"
        chatbot_service.save_model(model_path)
        
        logger.info("Chatbot retraining completed successfully")
        return {
            "message": "Chatbot retraining completed successfully", 
            "model_path": model_path,
            "training_examples": len(sample_data)
        }
        
    except Exception as e:
        logger.error(f"Error retraining chatbot: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrain chatbot")

class FeedbackRequest(BaseModel):
    session_id: str
    internship_id: int
    question: str
    response: str
    feedback: str  # 'thumbs_up' or 'thumbs_down'

class SessionRatingRequest(BaseModel):
    session_id: str
    internship_id: int
    final_rating: int  # 1-5 stars

@app.post("/chatbot/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    current_user: dict = Depends(get_current_user)
):
    """Submit feedback for a chatbot response"""
    try:
        # Get user data
        user_data = db.get_candidate(current_user['id'])
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get internship data
        internship_data = db.get_internship(request.internship_id)
        if not internship_data:
            raise HTTPException(status_code=404, detail="Internship not found")
        
        # Record feedback
        chatbot_service.record_feedback(
            session_id=request.session_id,
            internship_id=request.internship_id,
            question=request.question,
            response=request.response,
            feedback=request.feedback,
            user_data=user_data,
            internship_data=internship_data
        )
        
        # If thumbs up, trigger quick retrain
        if request.feedback == 'thumbs_up':
            retrain_success = chatbot_service.retrain_from_session_feedback(
                request.session_id, 
                request.internship_id
            )
            return {
                "message": "Feedback recorded successfully",
                "retrained": retrain_success
            }
        
        return {"message": "Feedback recorded successfully", "retrained": False}
        
    except Exception as e:
        logger.error(f"Error recording feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to record feedback")

@app.post("/chatbot/regenerate")
async def regenerate_response(
    request: ChatbotRequest,
    current_user: dict = Depends(get_current_user)
):
    """Regenerate chatbot response"""
    try:
        # Get user data
        user_data = db.get_candidate(current_user['id'])
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get internship data
        internship_data = db.get_internship(request.internship_id)
        if not internship_data:
            raise HTTPException(status_code=404, detail="Internship not found")
        
        # Generate new response
        response = chatbot_service.generate_response(
            question=request.question,
            user_data=user_data,
            internship_data=internship_data
        )
        
        return ChatbotResponse(
            response=response['response'],
            intent=response['intent'],
            confidence=response['confidence'],
            attention_weights=response['attention_weights']
        )
        
    except Exception as e:
        logger.error(f"Error regenerating response: {e}")
        raise HTTPException(status_code=500, detail="Failed to regenerate response")

@app.post("/chatbot/session-rating")
async def submit_session_rating(
    request: SessionRatingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Submit final session rating and trigger retraining if high rating"""
    try:
        # Get session rating summary
        rating_summary = chatbot_service.get_session_rating(
            request.session_id, 
            request.internship_id
        )
        
        # If high rating (4+ stars), retrain with all session data
        if request.final_rating >= 4:
            retrain_success = chatbot_service.retrain_from_session_feedback(
                request.session_id, 
                request.internship_id
            )
            
            return {
                "message": "Session rating recorded successfully",
                "rating_summary": rating_summary,
                "retrained": retrain_success
            }
        
        return {
            "message": "Session rating recorded successfully",
            "rating_summary": rating_summary,
            "retrained": False
        }
        
    except Exception as e:
        logger.error(f"Error recording session rating: {e}")
        raise HTTPException(status_code=500, detail="Failed to record session rating")

@app.get("/chatbot/session-rating/{session_id}/{internship_id}")
async def get_session_rating(
    session_id: str,
    internship_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get session rating summary"""
    try:
        rating_summary = chatbot_service.get_session_rating(session_id, internship_id)
        return rating_summary
        
    except Exception as e:
        logger.error(f"Error getting session rating: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session rating")

# This block is removed to prevent duplicate startup
    