# 🚀 InternGenie Hybrid API Setup Guide

## Prerequisites

### 1. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustup update
```

### 2. Install Nginx
```bash
# macOS
brew install nginx

# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 3. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

## 🏗️ Architecture Overview

```
Frontend (Next.js) → Nginx Gateway (Port 80) → {
    Rust API (Port 3001) - High Performance Endpoints
    Python API (Port 8000) - Standard Endpoints
}
```

## 🎯 High-Performance Endpoints (Rust)
- `POST /auth/login` - Concurrent login handling
- `POST /auth/refresh` - Token refresh
- `GET /recommendations` - ML-powered recommendations
- `GET /user-insights` - User analytics
- `GET /market-insights` - Market analytics
- `GET /collaborative-insights` - Collaborative filtering
- `GET /trending-skills` - Real-time skill trends

## 📋 Standard Endpoints (Python)
- All other endpoints automatically routed to Python
- Authentication, profile management, file uploads, etc.

## 🚀 Quick Start

### 1. Start the Hybrid System
```bash
./start_hybrid.sh
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Access the Application
- Frontend: http://localhost:3000
- API Gateway: http://localhost
- Python API: http://localhost:8000
- Rust API: http://localhost:3001

## 🛑 Stop the System
```bash
./stop_hybrid.sh
```

## 🔧 Manual Testing

### Test Rust API Directly
```bash
# Health check
curl http://localhost:3001/health

# Login (will fallback to Python for now)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

### Test Python API Directly
```bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

### Test Gateway Routing
```bash
# Should route to Rust
curl http://localhost/recommendations

# Should route to Python
curl http://localhost/internships
```

## 🐛 Troubleshooting

### Check Service Status
```bash
# Check if services are running
lsof -i :80   # Nginx
lsof -i :3001 # Rust
lsof -i :8000 # Python
```

### View Logs
```bash
# Rust API logs
cd rust-api && cargo run

# Python API logs
cd backend && python3 api.py

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Common Issues
1. **Port conflicts**: Make sure ports 80, 3001, 8000 are free
2. **Permission issues**: Run `sudo nginx` if needed
3. **Rust compilation**: Run `cargo clean && cargo build`
4. **Python dependencies**: Run `pip install -r requirements.txt`

## 📊 Performance Benefits

### Rust API Advantages
- **10-100x faster** than Python for CPU-intensive tasks
- **Zero-copy** data processing
- **Memory safe** concurrent operations
- **Sub-millisecond** response times for recommendations

### Hybrid Benefits
- **Best of both worlds**: Rust performance + Python flexibility
- **Automatic failover**: If Rust fails, routes to Python
- **Gradual migration**: Move endpoints one by one
- **Zero downtime**: Seamless user experience

## 🔄 Migration Strategy

1. **Phase 1**: Migrate `/recommendations` (highest impact)
2. **Phase 2**: Migrate analytics endpoints
3. **Phase 3**: Migrate high-traffic read endpoints
4. **Phase 4**: Optimize and fine-tune

## 🎯 Next Steps

1. Install Rust and Nginx
2. Run `./start_hybrid.sh`
3. Test the system
4. Monitor performance
5. Gradually migrate more endpoints
