"""
Request Logging Middleware for FastAPI
Automatically logs all HTTP requests with detailed information
"""
import time
import json
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from session_logger import get_session_logger

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.logger = get_session_logger()
    
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
            self.logger.log_request(
                method=method,
                path=path,
                client_ip=client_ip,
                user_agent=user_agent,
                user_id=user_id,
                status_code=response.status_code,
                response_time=response_time,
                request_size=request_size if request_size > 0 else None,
                response_size=response_size if response_size > 0 else None
            )
            
            return response
            
        except Exception as e:
            # Calculate response time for failed requests
            response_time = time.time() - start_time
            
            # Log error
            self.logger.log_error(
                error_type="RequestProcessingError",
                error_message=str(e),
                context={
                    "method": method,
                    "path": path,
                    "client_ip": client_ip,
                    "user_agent": user_agent,
                    "user_id": user_id,
                    "response_time": response_time
                }
            )
            
            # Re-raise the exception
            raise
