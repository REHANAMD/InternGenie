use anyhow::Result;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub email: String,
    pub password_hash: String,
    pub name: String,
    pub education: Option<String>,
    pub skills: Option<String>,
    pub location: Option<String>,
    pub experience_years: i32,
    pub phone: Option<String>,
    pub linkedin: Option<String>,
    pub github: Option<String>,
    pub data_consent: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Internship {
    pub id: i32,
    pub title: String,
    pub company: String,
    pub location: Option<String>,
    pub description: Option<String>,
    pub required_skills: Option<String>,
    pub preferred_skills: Option<String>,
    pub duration: Option<String>,
    pub stipend: Option<String>,
    pub application_deadline: Option<String>,
    pub posted_date: Option<String>,
    pub is_active: bool,
    pub min_education: Option<String>,
    pub experience_required: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Recommendation {
    pub internship_id: i32,
    pub score: f64,
    pub explanation: String,
}

pub struct DatabaseService {
    conn: Arc<Mutex<Connection>>,
}

impl DatabaseService {
    pub fn new(db_path: &str) -> Self {
        let conn = Connection::open(db_path).expect("Failed to open database");
        Self {
            conn: Arc::new(Mutex::new(conn)),
        }
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<User> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, email, password_hash, name, education, skills, location, 
             experience_years, phone, linkedin, github, data_consent 
             FROM candidates WHERE email = ?"
        )?;

        let user = stmt.query_row([email], |row| {
            Ok(User {
                id: row.get(0)?,
                email: row.get(1)?,
                password_hash: row.get(2)?,
                name: row.get(3)?,
                education: row.get(4)?,
                skills: row.get(5)?,
                location: row.get(6)?,
                experience_years: row.get(7)?,
                phone: row.get(8)?,
                linkedin: row.get(9)?,
                github: row.get(10)?,
                data_consent: row.get(11)?,
            })
        })?;

        Ok(user)
    }

    pub async fn get_user_by_id(&self, user_id: i32) -> Result<User> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, email, password_hash, name, education, skills, location, 
             experience_years, phone, linkedin, github, data_consent 
             FROM candidates WHERE id = ?"
        )?;

        let user = stmt.query_row([user_id], |row| {
            Ok(User {
                id: row.get(0)?,
                email: row.get(1)?,
                password_hash: row.get(2)?,
                name: row.get(3)?,
                education: row.get(4)?,
                skills: row.get(5)?,
                location: row.get(6)?,
                experience_years: row.get(7)?,
                phone: row.get(8)?,
                linkedin: row.get(9)?,
                github: row.get(10)?,
                data_consent: row.get(11)?,
            })
        })?;

        Ok(user)
    }

    pub async fn get_all_internships(&self) -> Result<Vec<Internship>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, title, company, location, description, required_skills, 
             preferred_skills, duration, stipend, application_deadline, posted_date, 
             is_active, min_education, experience_required 
             FROM internships WHERE is_active = 1"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(Internship {
                id: row.get(0)?,
                title: row.get(1)?,
                company: row.get(2)?,
                location: row.get(3)?,
                description: row.get(4)?,
                required_skills: row.get(5)?,
                preferred_skills: row.get(6)?,
                duration: row.get(7)?,
                stipend: row.get(8)?,
                application_deadline: row.get(9)?,
                posted_date: row.get(10)?,
                is_active: row.get(11)?,
                min_education: row.get(12)?,
                experience_required: row.get(13)?,
            })
        })?;

        let mut internships = Vec::new();
        for row in rows {
            internships.push(row?);
        }

        Ok(internships)
    }

    pub async fn get_user_behaviors(&self, user_id: i32) -> Result<Vec<serde_json::Value>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare(
            "SELECT behavior_data FROM user_behaviors WHERE user_id = ?"
        )?;

        let rows = stmt.query_map([user_id], |row| {
            let data: String = row.get(0)?;
            Ok(serde_json::from_str::<serde_json::Value>(&data).unwrap_or(serde_json::Value::Null))
        })?;

        let mut behaviors = Vec::new();
        for row in rows {
            behaviors.push(row?);
        }

        Ok(behaviors)
    }

    pub async fn get_historical_applications(&self) -> Result<Vec<serde_json::Value>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, candidate_id, internship_id, applied_at, status FROM applications"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i32>(0)?,
                "candidate_id": row.get::<_, i32>(1)?,
                "internship_id": row.get::<_, i32>(2)?,
                "applied_at": row.get::<_, String>(3)?,
                "status": row.get::<_, String>(4)?
            }))
        })?;

        let mut applications = Vec::new();
        for row in rows {
            applications.push(row?);
        }

        Ok(applications)
    }
}
