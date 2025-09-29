use crate::database::{DatabaseService, User, Internship};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
pub struct RecommendationResponse {
    pub success: bool,
    pub recommendations: Vec<RecommendationWithDetails>,
    pub total: usize,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecommendationWithDetails {
    pub internship: Internship,
    pub score: f64,
    pub explanation: String,
}

pub struct RecommendationService {
    db: Arc<DatabaseService>,
}

impl RecommendationService {
    pub fn new(db: Arc<DatabaseService>) -> Self {
        Self { db }
    }

    pub async fn get_recommendations(
        &self,
        user_id: i32,
        limit: usize,
        _use_cache: bool,
    ) -> Result<RecommendationResponse> {
        // Get user data
        let user = self.db.get_user_by_id(user_id).await?;
        
        // Get all internships
        let internships = self.db.get_all_internships().await?;
        
        // Calculate recommendations using Rust-optimized algorithm
        let recommendations = self.calculate_recommendations(&user, &internships, limit).await?;
        
        let total = recommendations.len();
        Ok(RecommendationResponse {
            success: true,
            recommendations,
            total,
            message: "Recommendations generated successfully".to_string(),
        })
    }

    async fn calculate_recommendations(
        &self,
        user: &User,
        internships: &[Internship],
        limit: usize,
    ) -> Result<Vec<RecommendationWithDetails>> {
        let mut scored_internships = Vec::new();

        for internship in internships {
            let score = self.calculate_score(user, internship).await?;
            let explanation = self.generate_explanation(user, internship, score).await?;
            
            scored_internships.push(RecommendationWithDetails {
                internship: internship.clone(),
                score,
                explanation,
            });
        }

        // Sort by score (highest first) and take top N
        scored_internships.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        scored_internships.truncate(limit);

        Ok(scored_internships)
    }

    async fn calculate_score(&self, user: &User, internship: &Internship) -> Result<f64> {
        let mut score = 0.0;
        
        // Location matching (40% weight)
        if let (Some(user_location), Some(internship_location)) = (&user.location, &internship.location) {
            if user_location.to_lowercase().contains(&internship_location.to_lowercase()) ||
               internship_location.to_lowercase().contains(&user_location.to_lowercase()) {
                score += 0.4;
            }
        }
        
        // Skills matching (35% weight)
        if let (Some(user_skills), Some(required_skills)) = (&user.skills, &internship.required_skills) {
            let user_skills_list: Vec<&str> = user_skills.split(',').map(|s| s.trim()).collect();
            let required_skills_list: Vec<&str> = required_skills.split(',').map(|s| s.trim()).collect();
            
            let matching_skills = user_skills_list.iter()
                .filter(|skill| required_skills_list.iter().any(|req| 
                    req.to_lowercase().contains(&skill.to_lowercase())
                ))
                .count();
            
            if !required_skills_list.is_empty() {
                score += 0.35 * (matching_skills as f64 / required_skills_list.len() as f64);
            }
        }
        
        // Experience matching (15% weight)
        let experience_match = if user.experience_years >= internship.experience_required {
            1.0
        } else {
            user.experience_years as f64 / internship.experience_required as f64
        };
        score += 0.15 * experience_match;
        
        // Education matching (10% weight)
        if let (Some(user_education), Some(min_education)) = (&user.education, &internship.min_education) {
            if user_education.to_lowercase().contains(&min_education.to_lowercase()) {
                score += 0.1;
            }
        }
        
        // Ensure score is between 0 and 1
        Ok(score.min(1.0).max(0.0))
    }

    async fn generate_explanation(
        &self,
        user: &User,
        internship: &Internship,
        score: f64,
    ) -> Result<String> {
        let mut reasons = Vec::new();
        
        // Location match
        if let (Some(user_location), Some(internship_location)) = (&user.location, &internship.location) {
            if user_location.to_lowercase().contains(&internship_location.to_lowercase()) {
                reasons.push(format!("Location match: {} and {}", user_location, internship_location));
            }
        }
        
        // Skills match
        if let (Some(user_skills), Some(required_skills)) = (&user.skills, &internship.required_skills) {
            let user_skills_list: Vec<&str> = user_skills.split(',').map(|s| s.trim()).collect();
            let required_skills_list: Vec<&str> = required_skills.split(',').map(|s| s.trim()).collect();
            
            let matching_skills: Vec<&str> = user_skills_list.iter()
                .filter(|skill| required_skills_list.iter().any(|req| 
                    req.to_lowercase().contains(&skill.to_lowercase())
                ))
                .cloned()
                .collect();
            
            if !matching_skills.is_empty() {
                reasons.push(format!("Skills match: {}", matching_skills.join(", ")));
            }
        }
        
        // Experience match
        if user.experience_years >= internship.experience_required {
            reasons.push(format!("Experience requirement met: {} years", user.experience_years));
        }
        
        if reasons.is_empty() {
            reasons.push("Based on your profile and preferences".to_string());
        }
        
        Ok(format!("Score: {:.1}% - {}", score * 100.0, reasons.join(", ")))
    }
}

// Implement Clone for Internship
impl Clone for Internship {
    fn clone(&self) -> Self {
        Self {
            id: self.id,
            title: self.title.clone(),
            company: self.company.clone(),
            location: self.location.clone(),
            description: self.description.clone(),
            required_skills: self.required_skills.clone(),
            preferred_skills: self.preferred_skills.clone(),
            duration: self.duration.clone(),
            stipend: self.stipend.clone(),
            application_deadline: self.application_deadline.clone(),
            posted_date: self.posted_date.clone(),
            is_active: self.is_active,
            min_education: self.min_education.clone(),
            experience_required: self.experience_required,
        }
    }
}
