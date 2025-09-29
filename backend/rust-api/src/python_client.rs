use anyhow::Result;
use axum::http::{HeaderMap, Method};
use reqwest::{Client, Method as ReqwestMethod};
use serde_json::Value;

pub struct PythonClient {
    client: Client,
    base_url: String,
}

impl PythonClient {
    pub fn new(base_url: &str) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.to_string(),
        }
    }

    pub async fn proxy_request(
        &self,
        method: Method,
        path: &str,
        headers: HeaderMap,
        body: Option<axum::body::Bytes>,
    ) -> Result<Value> {
        let url = format!("{}{}", self.base_url, path);
        
        let reqwest_method = match method {
            Method::GET => ReqwestMethod::GET,
            Method::POST => ReqwestMethod::POST,
            Method::PUT => ReqwestMethod::PUT,
            Method::DELETE => ReqwestMethod::DELETE,
            _ => ReqwestMethod::GET,
        };
        let mut request = self.client.request(reqwest_method, &url);
        
        // Forward headers (excluding host and content-length)
        for (key, value) in headers.iter() {
            if key != "host" && key != "content-length" {
                if let Ok(value_str) = value.to_str() {
                    if let Ok(header_name) = key.to_string().parse::<reqwest::header::HeaderName>() {
                        request = request.header(header_name, value_str);
                    }
                }
            }
        }
        
        // Add body if present
        if let Some(body_bytes) = body {
            request = request.body(body_bytes.to_vec());
        }
        
        let response = request.send().await?;
        let status = response.status();
        
        if status.is_success() {
            let json: Value = response.json().await?;
            Ok(json)
        } else {
            Err(anyhow::anyhow!("Python API returned error: {}", status))
        }
    }
}
