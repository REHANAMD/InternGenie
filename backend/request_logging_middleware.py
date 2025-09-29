"""
Request Logging Middleware for FastAPI
Automatically logs all HTTP requests with detailed information
"""
import time
import json
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger(__name__)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Record start time
        start_time = time.time()
        
        # Extract request information
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        
        # Get request size
        request_size = 0
        if hasattr(request, "_body"):
            request_size = len(request._body) if request._body else 0
        
        # Extract user information if available
        user_id = None
        if hasattr(request.state, "user") and request.state.user:
            user_id = request.state.user.get("id")
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Get response size
            response_size = 0
            if hasattr(response, "body"):
                response_size = len(response.body) if response.body else 0
            
            # Log successful request
            log_entry = f"[REQUEST] {method} {path} | IP: {client_ip} | Status: {response.status_code} | Response Time: {response_time:.3f}s"
            if user_id:
                log_entry += f" | User: {user_id}"
            if request_size > 0:
                log_entry += f" | Request Size: {request_size} bytes"
            if response_size > 0:
                log_entry += f" | Response Size: {response_size} bytes"
            if user_agent:
                log_entry += f" | User-Agent: {user_agent[:100]}..."
            
            self.logger.info(log_entry)
            
            return response
            
        except Exception as e:
            # Calculate response time for failed requests
            response_time = time.time() - start_time
            
            # Log error
            error_context = {
                "method": method,
                "path": path,
                "client_ip": client_ip,
                "user_agent": user_agent,
                "user_id": user_id,
                "response_time": response_time
            }
            self.logger.error(f"[ERROR] RequestProcessingError | Message: {str(e)} | Context: {json.dumps(error_context, indent=2)}")
            
            # Re-raise the exception
            raise
