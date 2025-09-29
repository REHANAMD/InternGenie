use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::{get, post},
    Router,
};
use std::collections::HashMap;
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{info, error};

mod auth;
mod recommendations;
mod insights;
mod database;
mod python_client;
mod middleware;

use auth::AuthService;
use recommendations::RecommendationService;
use insights::InsightsService;
use database::DatabaseService;
use python_client::PythonClient;
use middleware::request_logging_middleware;

#[derive(Clone)]
pub struct AppState {
    pub auth_service: Arc<AuthService>,
    pub recommendation_service: Arc<RecommendationService>,
    pub insights_service: Arc<InsightsService>,
    pub database_service: Arc<DatabaseService>,
    pub python_client: Arc<PythonClient>,
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("rust_api=debug,tower_http=debug")
        .init();

    info!("🚀 Starting InternGenie Rust API Server...");

    // Initialize services
    let database_service = Arc::new(DatabaseService::new("recommendation_engine.db"));
    let auth_service = Arc::new(AuthService::new(database_service.clone()));
    let recommendation_service = Arc::new(RecommendationService::new(database_service.clone()));
    let insights_service = Arc::new(InsightsService::new(database_service.clone()));
    let python_client = Arc::new(PythonClient::new("http://localhost:8000"));

    let app_state = AppState {
        auth_service,
        recommendation_service,
        insights_service,
        database_service,
        python_client,
    };

    // Build the application
    let app = Router::new()
        // Health check
        .route("/health", get(health_check))
        
        // Authentication endpoints (Rust)
        .route("/auth/login", post(login))
        .route("/auth/refresh", post(refresh_token))
        
        // Recommendation endpoints (Rust)
        .route("/recommendations", get(get_recommendations))
        
        // Insights endpoints (Rust)
        .route("/user-insights", get(get_user_insights))
        .route("/market-insights", get(get_market_insights))
        .route("/collaborative-insights", get(get_collaborative_insights))
        .route("/trending-skills", get(get_trending_skills))
        
        // Fallback proxy for Python APIs
        .route("/proxy/*path", get(proxy_to_python))
        .route("/proxy/*path", post(proxy_to_python))
        .route("/proxy/*path", axum::routing::put(proxy_to_python))
        .route("/proxy/*path", axum::routing::delete(proxy_to_python))
        
        .with_state(app_state)
        .layer(axum::middleware::from_fn(request_logging_middleware))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(
                    CorsLayer::new()
                        .allow_origin(Any)
                        .allow_methods(Any)
                        .allow_headers(Any)
                ),
        );

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    info!("🌐 Rust API Server running on http://0.0.0.0:3001");
    
    axum::serve(listener, app).await.unwrap();
}

// Health check endpoint
async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "rust-api",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

// Authentication endpoints
async fn login(
    State(state): State<AppState>,
    Json(payload): Json<auth::LoginRequest>,
) -> Result<Json<auth::LoginResponse>, StatusCode> {
    info!("Login attempt for email: {}", payload.email);
    
    match state.auth_service.login(&payload.email, &payload.password).await {
        Ok(response) => {
            info!("Login successful for email: {}", payload.email);
            Ok(Json(response))
        },
        Err(e) => {
            error!("Login failed for email: {}, error: {:?}", payload.email, e);
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}

async fn refresh_token(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<auth::RefreshResponse>, StatusCode> {
    let auth_header = headers.get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;
    
    match state.auth_service.refresh_token(auth_header).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::UNAUTHORIZED),
    }
}

// Recommendation endpoints
async fn get_recommendations(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<recommendations::RecommendationResponse>, StatusCode> {
    let user_id = extract_user_id_from_headers(&headers, &state).await?;
    let limit = params.get("limit").and_then(|s| s.parse().ok()).unwrap_or(5);
    let use_cache = params.get("use_cache").and_then(|s| s.parse().ok()).unwrap_or(true);
    
    info!("Getting recommendations for user {} - Limit: {}, Cache: {}", user_id, limit, use_cache);
    
    match state.recommendation_service.get_recommendations(user_id, limit, use_cache).await {
        Ok(response) => {
            info!("Generated {} recommendations for user {}", response.recommendations.len(), user_id);
            Ok(Json(response))
        },
        Err(e) => {
            error!("Recommendations error for user {}: {:?}", user_id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Insights endpoints
async fn get_user_insights(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<insights::UserInsightsResponse>, StatusCode> {
    let user_id = extract_user_id_from_headers(&headers, &state).await?;
    
    match state.insights_service.get_user_insights(user_id).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

async fn get_market_insights(
    State(state): State<AppState>,
) -> Result<Json<insights::MarketInsightsResponse>, StatusCode> {
    match state.insights_service.get_market_insights().await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

async fn get_collaborative_insights(
    State(state): State<AppState>,
) -> Result<Json<insights::CollaborativeInsightsResponse>, StatusCode> {
    match state.insights_service.get_collaborative_insights().await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

async fn get_trending_skills(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<insights::TrendingSkillsResponse>, StatusCode> {
    let limit = params.get("limit").and_then(|s| s.parse().ok()).unwrap_or(10);
    
    match state.insights_service.get_trending_skills(limit).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

// Proxy to Python API for non-migrated endpoints
async fn proxy_to_python(
    State(state): State<AppState>,
    method: axum::http::Method,
    Path(path): Path<String>,
    headers: HeaderMap,
    body: Option<axum::body::Bytes>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let full_path = format!("/{}", path);
    info!("🔄 Proxying {} {} to Python API", method, full_path);
    
    match state.python_client.proxy_request(method, &full_path, headers, body).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::BAD_GATEWAY),
    }
}

// Helper function to extract user ID from JWT token
async fn extract_user_id_from_headers(
    headers: &HeaderMap,
    state: &AppState,
) -> Result<i32, StatusCode> {
    let auth_header = headers.get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;
    
    // Extract token from "Bearer <token>" format
    let token = auth_header.strip_prefix("Bearer ").unwrap_or(auth_header);
    
    state.auth_service.verify_token(token).await
        .map_err(|_| StatusCode::UNAUTHORIZED)
}
