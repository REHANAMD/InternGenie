use axum::{
    extract::Request,
    http::{HeaderMap, Method, StatusCode},
    middleware::Next,
    response::Response,
};
use std::time::Instant;
use tracing::{info, error};

pub async fn request_logging_middleware(
    request: Request,
    next: Next,
) -> Response {
    let start_time = Instant::now();
    let method = request.method().clone();
    let path = request.uri().path().to_string();
    let client_ip = request
        .headers()
        .get("x-forwarded-for")
        .or_else(|| request.headers().get("x-real-ip"))
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown")
        .to_string();
    
    let user_agent = request
        .headers()
        .get("user-agent")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    // Process the request
    let response = next.run(request).await;
    
    // Calculate response time
    let response_time = start_time.elapsed();
    let status_code = response.status();
    
    // Log the request with status code
    let log_entry = format!(
        "[REQUEST] {} {} | IP: {} | Status: {} | Response Time: {:.3}s | User-Agent: {}",
        method,
        path,
        client_ip,
        status_code.as_u16(),
        response_time.as_secs_f64(),
        user_agent.chars().take(100).collect::<String>()
    );
    
    // Log based on status code
    if status_code.is_success() {
        info!("{}", log_entry);
    } else if status_code.is_client_error() {
        error!("{}", log_entry);
    } else if status_code.is_server_error() {
        error!("{}", log_entry);
    } else {
        info!("{}", log_entry);
    }
    
    response
}
