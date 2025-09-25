"""
Session-based Logging System for Backend API
Creates numbered session log files with detailed activity tracking
"""
import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import threading
import time

class SessionLogger:
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Session management
        self.session_number = self._get_next_session_number()
        self.session_id = f"session-{self.session_number}"
        self.log_file = self.log_dir / f"{self.session_id}.txt"
        
        # Thread safety
        self._lock = threading.Lock()
        
        # Initialize session log
        self._initialize_session_log()
        
        # Setup detailed logging
        self._setup_logging()
    
    def _get_next_session_number(self) -> int:
        """Get the next session number by checking existing log files"""
        if not self.log_dir.exists():
            return 0
        
        existing_sessions = []
        for file in self.log_dir.glob("session-*.txt"):
            try:
                session_num = int(file.stem.split("-")[1])
                existing_sessions.append(session_num)
            except (ValueError, IndexError):
                continue
        
        return max(existing_sessions, default=-1) + 1
    
    def _initialize_session_log(self):
        """Initialize the session log file with header information"""
        with open(self.log_file, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write(f"BACKEND API SESSION LOG - {self.session_id.upper()}\n")
            f.write("=" * 80 + "\n")
            f.write(f"Session Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}\n")
            f.write(f"Log File: {self.log_file}\n")
            f.write(f"Process ID: {os.getpid()}\n")
            f.write("=" * 80 + "\n\n")
    
    def _setup_logging(self):
        """Setup detailed logging configuration"""
        # Create a custom logger for this session
        self.logger = logging.getLogger(f"session_{self.session_number}")
        self.logger.setLevel(logging.DEBUG)
        
        # Clear any existing handlers
        self.logger.handlers.clear()
        
        # Create file handler for this session
        file_handler = logging.FileHandler(self.log_file, mode='a', encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        
        # Create console handler for real-time monitoring
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        # Add handlers
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
        
        # Prevent propagation to root logger
        self.logger.propagate = False
    
    def log_server_start(self, host: str = "0.0.0.0", port: int = 8000):
        """Log server startup"""
        with self._lock:
            self.logger.info(f"SERVER STARTED - Host: {host}, Port: {port}")
            self.logger.info(f"Session ID: {self.session_id}")
            self.logger.info(f"Server Process: PID {os.getpid()}")
            self.logger.info("=" * 60)
    
    def log_server_stop(self):
        """Log server shutdown"""
        with self._lock:
            self.logger.info("=" * 60)
            self.logger.info("SERVER STOPPED LISTENING")
            self.logger.info(f"Session ID: {self.session_id}")
            self.logger.info(f"Session Ended: {datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}")
            self.logger.info("=" * 60)
    
    def log_request(self, method: str, path: str, client_ip: str, user_agent: str = None, 
                   user_id: str = None, status_code: int = None, response_time: float = None,
                   request_size: int = None, response_size: int = None):
        """Log HTTP request details"""
        with self._lock:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
            
            # Basic request info
            log_entry = f"[REQUEST] {method} {path} | IP: {client_ip}"
            
            if user_id:
                log_entry += f" | User: {user_id}"
            
            if status_code:
                log_entry += f" | Status: {status_code}"
            
            if response_time:
                log_entry += f" | Response Time: {response_time:.3f}s"
            
            if request_size:
                log_entry += f" | Request Size: {request_size} bytes"
            
            if response_size:
                log_entry += f" | Response Size: {response_size} bytes"
            
            if user_agent:
                log_entry += f" | User-Agent: {user_agent[:100]}..."
            
            self.logger.info(log_entry)
    
    def log_database_operation(self, operation: str, table: str, details: str = None, 
                             success: bool = True, execution_time: float = None):
        """Log database operations"""
        with self._lock:
            status = "SUCCESS" if success else "FAILED"
            log_entry = f"[DATABASE] {operation} on {table} | Status: {status}"
            
            if execution_time:
                log_entry += f" | Execution Time: {execution_time:.3f}s"
            
            if details:
                log_entry += f" | Details: {details}"
            
            if success:
                self.logger.info(log_entry)
            else:
                self.logger.error(log_entry)
    
    def log_ml_operation(self, operation: str, model_name: str = None, 
                        success: bool = True, details: str = None):
        """Log ML operations"""
        with self._lock:
            status = "SUCCESS" if success else "FAILED"
            log_entry = f"[ML] {operation}"
            
            if model_name:
                log_entry += f" | Model: {model_name}"
            
            log_entry += f" | Status: {status}"
            
            if details:
                log_entry += f" | Details: {details}"
            
            if success:
                self.logger.info(log_entry)
            else:
                self.logger.error(log_entry)
    
    def log_authentication(self, action: str, email: str = None, user_id: str = None, 
                          success: bool = True, details: str = None):
        """Log authentication events"""
        with self._lock:
            status = "SUCCESS" if success else "FAILED"
            log_entry = f"[AUTH] {action} | Status: {status}"
            
            if email:
                log_entry += f" | Email: {email}"
            
            if user_id:
                log_entry += f" | User ID: {user_id}"
            
            if details:
                log_entry += f" | Details: {details}"
            
            if success:
                self.logger.info(log_entry)
            else:
                self.logger.warning(log_entry)
    
    def log_error(self, error_type: str, error_message: str, stack_trace: str = None, 
                 context: Dict[str, Any] = None):
        """Log errors with detailed context"""
        with self._lock:
            log_entry = f"[ERROR] {error_type} | Message: {error_message}"
            
            if context:
                context_str = json.dumps(context, indent=2)
                log_entry += f" | Context: {context_str}"
            
            self.logger.error(log_entry)
            
            if stack_trace:
                self.logger.error(f"[STACK_TRACE] {stack_trace}")
    
    def log_system_event(self, event: str, details: str = None, level: str = "INFO"):
        """Log system events"""
        with self._lock:
            log_entry = f"[SYSTEM] {event}"
            
            if details:
                log_entry += f" | Details: {details}"
            
            if level.upper() == "ERROR":
                self.logger.error(log_entry)
            elif level.upper() == "WARNING":
                self.logger.warning(log_entry)
            else:
                self.logger.info(log_entry)
    
    def log_recommendation_activity(self, user_id: str, action: str, internship_id: str = None,
                                  recommendation_count: int = None, details: str = None):
        """Log recommendation system activity"""
        with self._lock:
            log_entry = f"[RECOMMENDATION] User: {user_id} | Action: {action}"
            
            if internship_id:
                log_entry += f" | Internship ID: {internship_id}"
            
            if recommendation_count:
                log_entry += f" | Count: {recommendation_count}"
            
            if details:
                log_entry += f" | Details: {details}"
            
            self.logger.info(log_entry)
    
    def log_file_operation(self, operation: str, file_path: str, file_size: int = None,
                          success: bool = True, details: str = None):
        """Log file operations"""
        with self._lock:
            status = "SUCCESS" if success else "FAILED"
            log_entry = f"[FILE] {operation} | File: {file_path} | Status: {status}"
            
            if file_size:
                log_entry += f" | Size: {file_size} bytes"
            
            if details:
                log_entry += f" | Details: {details}"
            
            if success:
                self.logger.info(log_entry)
            else:
                self.logger.error(log_entry)
    
    def get_session_info(self) -> Dict[str, Any]:
        """Get current session information"""
        return {
            "session_id": self.session_id,
            "session_number": self.session_number,
            "log_file": str(self.log_file),
            "log_file_exists": self.log_file.exists(),
            "log_file_size": self.log_file.stat().st_size if self.log_file.exists() else 0
        }

# Global session logger instance
session_logger: Optional[SessionLogger] = None

def get_session_logger() -> SessionLogger:
    """Get the global session logger instance"""
    global session_logger
    if session_logger is None:
        session_logger = SessionLogger()
    return session_logger

def initialize_session_logger() -> SessionLogger:
    """Initialize and return a new session logger"""
    global session_logger
    session_logger = SessionLogger()
    return session_logger
