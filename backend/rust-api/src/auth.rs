use crate::database::DatabaseService;
use anyhow::Result;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub user_id: i32,
    pub email: String,
    pub exp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub token: String,
    pub user: UserInfo,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshResponse {
    pub success: bool,
    pub token: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: i32,
    pub email: String,
    pub name: String,
    pub education: Option<String>,
    pub skills: Option<String>,
    pub location: Option<String>,
    pub experience_years: i32,
    pub phone: Option<String>,
    pub linkedin: Option<String>,
    pub github: Option<String>,
}

pub struct AuthService {
    db: Arc<DatabaseService>,
    jwt_secret: String,
}

impl AuthService {
    pub fn new(db: Arc<DatabaseService>) -> Self {
        Self {
            db,
            jwt_secret: std::env::var("JWT_SECRET_KEY").unwrap_or_else(|_| "your-secret-key-change-in-production-2024".to_string()),
        }
    }

    pub async fn login(&self, email: &str, password: &str) -> Result<LoginResponse> {
        // Get user from database
        let user = self.db.get_user_by_email(email).await?;
        
        // Verify password (in production, use proper password hashing)
        if !self.verify_password(password, &user.password_hash)? {
            return Err(anyhow::anyhow!("Invalid credentials"));
        }

        // Generate JWT token
        let token = self.generate_token(user.id, &user.email)?;

        // Return response
        Ok(LoginResponse {
            success: true,
            token,
            user: UserInfo {
                id: user.id,
                email: user.email,
                name: user.name,
                education: user.education,
                skills: user.skills,
                location: user.location,
                experience_years: user.experience_years,
                phone: user.phone,
                linkedin: user.linkedin,
                github: user.github,
            },
            message: "Login successful".to_string(),
        })
    }

    pub async fn refresh_token(&self, auth_header: &str) -> Result<RefreshResponse> {
        let token = auth_header.strip_prefix("Bearer ").unwrap_or(auth_header);
        let user_id = self.verify_token(token).await?;

        // Get user data to generate new token
        let user = self.db.get_user_by_id(user_id).await?;
        let new_token = self.generate_token(user_id, &user.email)?;

        Ok(RefreshResponse {
            success: true,
            token: new_token,
            message: "Token refreshed successfully".to_string(),
        })
    }

    pub async fn verify_token(&self, token: &str) -> Result<i32> {
        println!("🔍 Verifying token: {}", token);
        let claims = self.decode_token(token)?;
        println!("✅ Token verified for user_id: {}", claims.user_id);
        Ok(claims.user_id)
    }

    fn generate_token(&self, user_id: i32, email: &str) -> Result<String> {
        let expiration = Utc::now() + Duration::hours(24);
        let claims = Claims {
            user_id,
            email: email.to_string(),
            exp: expiration.timestamp(),
        };

        let header = Header::new(Algorithm::HS256);
        let token = encode(&header, &claims, &EncodingKey::from_secret(self.jwt_secret.as_ref()))?;
        Ok(token)
    }

    fn decode_token(&self, token: &str) -> Result<Claims> {
        let validation = Validation::new(Algorithm::HS256);
        let token_data = decode::<Claims>(token, &DecodingKey::from_secret(self.jwt_secret.as_ref()), &validation)?;
        Ok(token_data.claims)
    }

    fn verify_password(&self, password: &str, hash: &str) -> Result<bool> {
        // Use bcrypt for password verification
        match bcrypt::verify(password, hash) {
            Ok(is_valid) => Ok(is_valid),
            Err(_) => Ok(false), // If verification fails, password is invalid
        }
    }
}
