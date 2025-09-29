use crate::database::DatabaseService;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInsightsResponse {
    pub success: bool,
    pub insights: UserInsights,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInsights {
    pub total_interactions: i32,
    pub action_breakdown: HashMap<String, i32>,
    pub preferred_skills: HashMap<String, i32>,
    pub preferred_companies: HashMap<String, i32>,
    pub preferred_locations: HashMap<String, i32>,
    pub application_success_rate: f64,
    pub learning_recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MarketInsightsResponse {
    pub success: bool,
    pub insights: MarketInsights,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MarketInsights {
    pub total_applications: i32,
    pub success_rate: f64,
    pub popular_companies: HashMap<String, i32>,
    pub trending_skills: Vec<String>,
    pub location_distribution: HashMap<String, i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CollaborativeInsightsResponse {
    pub success: bool,
    pub insights: CollaborativeInsights,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CollaborativeInsights {
    pub similar_users: Vec<SimilarUser>,
    pub popular_internships: Vec<PopularInternship>,
    pub skill_correlations: HashMap<String, Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SimilarUser {
    pub user_id: i32,
    pub similarity_score: f64,
    pub common_skills: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PopularInternship {
    pub internship_id: i32,
    pub title: String,
    pub company: String,
    pub application_count: i32,
    pub success_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrendingSkillsResponse {
    pub success: bool,
    pub skills: Vec<TrendingSkill>,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrendingSkill {
    pub skill: String,
    pub frequency: i32,
    pub growth_rate: f64,
}

pub struct InsightsService {
    db: Arc<DatabaseService>,
}

impl InsightsService {
    pub fn new(db: Arc<DatabaseService>) -> Self {
        Self { db }
    }

    pub async fn get_user_insights(&self, user_id: i32) -> Result<UserInsightsResponse> {
        // Get user behaviors
        let behaviors = self.db.get_user_behaviors(user_id).await?;
        
        // Process behaviors to generate insights
        let total_interactions = behaviors.len() as i32;
        let mut action_breakdown = HashMap::new();
        let mut preferred_skills = HashMap::new();
        let mut preferred_companies = HashMap::new();
        let mut preferred_locations = HashMap::new();
        
        for behavior in behaviors {
            if let Some(action) = behavior.get("action").and_then(|v| v.as_str()) {
                *action_breakdown.entry(action.to_string()).or_insert(0) += 1;
            }
            
            if let Some(skills) = behavior.get("skills").and_then(|v| v.as_array()) {
                for skill in skills {
                    if let Some(skill_str) = skill.as_str() {
                        *preferred_skills.entry(skill_str.to_string()).or_insert(0) += 1;
                    }
                }
            }
            
            if let Some(company) = behavior.get("company").and_then(|v| v.as_str()) {
                *preferred_companies.entry(company.to_string()).or_insert(0) += 1;
            }
            
            if let Some(location) = behavior.get("location").and_then(|v| v.as_str()) {
                *preferred_locations.entry(location.to_string()).or_insert(0) += 1;
            }
        }
        
        // Calculate success rate (mock data for now)
        let application_success_rate = 0.75;
        
        // Generate learning recommendations
        let learning_recommendations = vec![
            "Focus on Python and Machine Learning skills".to_string(),
            "Consider gaining experience with cloud platforms".to_string(),
            "Develop your leadership and communication skills".to_string(),
        ];
        
        let insights = UserInsights {
            total_interactions,
            action_breakdown,
            preferred_skills,
            preferred_companies,
            preferred_locations,
            application_success_rate,
            learning_recommendations,
        };
        
        Ok(UserInsightsResponse {
            success: true,
            insights,
            message: "User insights generated successfully".to_string(),
        })
    }

    pub async fn get_market_insights(&self) -> Result<MarketInsightsResponse> {
        // Get historical applications
        let applications = self.db.get_historical_applications().await?;
        
        let total_applications = applications.len() as i32;
        let successful_applications = applications.iter()
            .filter(|app| app.get("status").and_then(|v| v.as_str()) == Some("accepted"))
            .count() as i32;
        
        let success_rate = if total_applications > 0 {
            successful_applications as f64 / total_applications as f64
        } else {
            0.0
        };
        
        // Mock data for demonstration
        let mut popular_companies = HashMap::new();
        popular_companies.insert("Google".to_string(), 45);
        popular_companies.insert("Microsoft".to_string(), 38);
        popular_companies.insert("Amazon".to_string(), 32);
        
        let trending_skills = vec![
            "Python".to_string(),
            "Machine Learning".to_string(),
            "React".to_string(),
            "AWS".to_string(),
            "Docker".to_string(),
        ];
        
        let mut location_distribution = HashMap::new();
        location_distribution.insert("San Francisco".to_string(), 120);
        location_distribution.insert("New York".to_string(), 95);
        location_distribution.insert("Seattle".to_string(), 78);
        
        let insights = MarketInsights {
            total_applications,
            success_rate,
            popular_companies,
            trending_skills,
            location_distribution,
        };
        
        Ok(MarketInsightsResponse {
            success: true,
            insights,
            message: "Market insights generated successfully".to_string(),
        })
    }

    pub async fn get_collaborative_insights(&self) -> Result<CollaborativeInsightsResponse> {
        // Mock collaborative insights for demonstration
        let similar_users = vec![
            SimilarUser {
                user_id: 123,
                similarity_score: 0.85,
                common_skills: vec!["Python".to_string(), "Machine Learning".to_string()],
            },
            SimilarUser {
                user_id: 456,
                similarity_score: 0.78,
                common_skills: vec!["React".to_string(), "JavaScript".to_string()],
            },
        ];
        
        let popular_internships = vec![
            PopularInternship {
                internship_id: 1,
                title: "Software Engineering Intern".to_string(),
                company: "Google".to_string(),
                application_count: 150,
                success_rate: 0.12,
            },
            PopularInternship {
                internship_id: 2,
                title: "Data Science Intern".to_string(),
                company: "Microsoft".to_string(),
                application_count: 120,
                success_rate: 0.15,
            },
        ];
        
        let mut skill_correlations = HashMap::new();
        skill_correlations.insert("Python".to_string(), vec!["Machine Learning".to_string(), "Data Science".to_string()]);
        skill_correlations.insert("React".to_string(), vec!["JavaScript".to_string(), "Node.js".to_string()]);
        
        let insights = CollaborativeInsights {
            similar_users,
            popular_internships,
            skill_correlations,
        };
        
        Ok(CollaborativeInsightsResponse {
            success: true,
            insights,
            message: "Collaborative insights generated successfully".to_string(),
        })
    }

    pub async fn get_trending_skills(&self, limit: usize) -> Result<TrendingSkillsResponse> {
        // Mock trending skills data
        let skills = vec![
            TrendingSkill {
                skill: "Python".to_string(),
                frequency: 450,
                growth_rate: 0.25,
            },
            TrendingSkill {
                skill: "Machine Learning".to_string(),
                frequency: 320,
                growth_rate: 0.35,
            },
            TrendingSkill {
                skill: "React".to_string(),
                frequency: 280,
                growth_rate: 0.18,
            },
            TrendingSkill {
                skill: "AWS".to_string(),
                frequency: 250,
                growth_rate: 0.42,
            },
            TrendingSkill {
                skill: "Docker".to_string(),
                frequency: 200,
                growth_rate: 0.30,
            },
        ];
        
        let limited_skills = skills.into_iter().take(limit).collect();
        
        Ok(TrendingSkillsResponse {
            success: true,
            skills: limited_skills,
            message: "Trending skills retrieved successfully".to_string(),
        })
    }
}
