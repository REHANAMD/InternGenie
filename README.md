# InternGenie - AI-Powered Internship Recommendation Platform

A comprehensive internship recommendation platform built with Next.js, FastAPI, and Rust, featuring intelligent matching algorithms, real-time insights, and a hybrid backend architecture for optimal performance.

## 🚀 Features

- **AI-Powered Recommendations**: Advanced ML algorithms for personalized internship matching
- **Hybrid Backend Architecture**: Python FastAPI + Rust for high-performance concurrent processing
- **Real-time Insights**: Comprehensive analytics and performance metrics
- **Intelligent Chatbot**: AI-powered doubt resolution and career guidance
- **Privacy Controls**: Granular data sharing preferences and privacy settings
- **Responsive Design**: Modern, mobile-first UI with dark/light theme support
- **Secure Authentication**: JWT-based auth with password reset functionality

## 🏗️ Architecture

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Context + Local Storage
- **UI Components**: Custom component library with animations

### Backend (Hybrid Architecture)
- **Python API**: FastAPI for general endpoints and ML processing
- **Rust API**: High-performance endpoints for concurrent operations
- **Database**: SQLite with intelligent caching
- **Authentication**: JWT tokens with bcrypt password hashing

### Key Endpoints by Technology

#### Rust API (High-Performance)
- `POST /api/auth/login` - User authentication
- `GET /api/recommendations` - ML-powered recommendations
- `GET /api/insights` - Performance analytics

#### Python API (General Purpose)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/forgot-password` - Password reset
- `GET /api/internships` - Internship listings
- `POST /api/applications` - Application management
- `GET /api/profile` - User profile management

## 🛠️ Prerequisites

- **Node.js**: 18.x or higher
- **Python**: 3.8 or higher
- **Rust**: 1.70 or higher
- **Git**: For version control

## 📦 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/InternGenie.git
cd InternGenie
```

### 2. Environment Setup

Create a `.env` file in the root directory (copy from `env.example`):
```bash
# Copy the example file
cp env.example .env

# Edit the .env file with your actual values
nano .env
```

#### Required Environment Variables

**Create your `.env` file with the following configuration:**

```bash
# JWT Secret (change in production)
JWT_SECRET_KEY=your-secret-key-change-in-production-2025

# SendGrid API Key (for email functionality)
SENDGRID_API_KEY=SG.your-actual-sendgrid-api-key-here

# Database
DATABASE_URL=sqlite:///./backend/recommendation_engine.db
```

#### 📧 SendGrid Email Configuration (IMPORTANT)

For the forgot password and OTP functionality to work properly, you need to:

1. **Sign up for SendGrid**:
   - Go to [SendGrid](https://sendgrid.com/)
   - Create a free account
   - Verify your account

2. **Generate API Key**:
   - Go to Settings → API Keys
   - Create a new API key with "Full Access" permissions
   - Copy the API key (starts with `SG.`)

3. **Verify Sender Email**:
   - Go to Settings → Sender Authentication
   - Add and verify your sender email address (e.g., `noreply@yourdomain.com`)
   - **Important**: The email must be verified in SendGrid

4. **Update Code** (if using different email):
   - The system is configured to send emails from `noreply@rehan.co.in`
   - If you want to use a different email, update it in `backend/auth.py` line 317:
     ```python
     verified_sender = "your-verified-email@yourdomain.com"
     ```

5. **Test Email Functionality**:
   ```bash
   # Test SendGrid integration
   python3 test_sendgrid.py
   ```

**Quick Setup**: Use the provided script to load environment variables:
```bash
source load_env.sh
```

### 3. Backend Setup

#### Python Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install Python dependencies
cd backend
pip install -r requirements.txt
```

#### Rust Environment
```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Build Rust API
cd backend/rust-api
cargo build --release
```

### 4. Frontend Setup
```bash
# Install Node.js dependencies
cd frontend
npm install
```

## 🚀 Running the Application

### Development Mode

#### Option 1: Manual Start (Recommended for Development)
```bash
# Terminal 1: Start Python API
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python api.py

# Terminal 2: Start Rust API
cd backend/rust-api
cargo run

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

#### Option 2: Automated Scripts (Production-like)
```bash
# Start all services
./start.sh

# Check status
./status.sh

# Stop all services
./stop.sh
```

### Access Points
- **Frontend**: http://localhost:3000
- **Python API**: http://localhost:8000
- **Rust API**: http://localhost:8001
- **API Documentation**: http://localhost:8000/docs

## 🔧 Configuration

### Database Setup
The application uses SQLite by default. The database will be created automatically on first run.

### ML Models
Pre-trained models are included in the repository. For retraining:
```bash
cd backend
python train_ml_models.py
```

### Email Configuration
For password reset and OTP functionality, configure SendGrid:

#### Step-by-Step Setup:

1. **Create SendGrid Account**:
   - Visit [SendGrid](https://sendgrid.com/)
   - Sign up for a free account
   - Complete email verification

2. **Generate API Key**:
   - Navigate to Settings → API Keys
   - Click "Create API Key"
   - Choose "Full Access" permissions
   - Copy the generated key (format: `SG.xxxxxxxxxxxxxxxxx`)

3. **Verify Sender Email**:
   - Go to Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Add your email address (e.g., `noreply@yourdomain.com`)
   - Check your email and click the verification link
   - **Critical**: This step is required for emails to be sent

4. **Configure Environment**:
   - Add your API key to `.env` file:
     ```bash
     SENDGRID_API_KEY=SG.your-actual-api-key-here
     ```

5. **Update Sender Email** (if needed):
   - The system uses `noreply@rehan.co.in` by default
   - To change it, edit `backend/auth.py` line 317:
     ```python
     verified_sender = "your-verified-email@yourdomain.com"
     ```

6. **Test Configuration**:
   ```bash
   # Test SendGrid integration
   python3 test_sendgrid.py
   
   # Test OTP functionality
   # (Use the forgot password feature in the app)
   ```

#### Troubleshooting Email Issues:
- **403 Forbidden Error**: Sender email not verified in SendGrid
- **401 Unauthorized**: Invalid API key
- **Emails not received**: Check spam folder, verify sender email

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login (Rust)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### Recommendation Endpoints
- `GET /api/recommendations` - Get personalized recommendations (Rust)
- `GET /api/internships` - Browse all internships
- `POST /api/applications` - Submit application

### Analytics Endpoints
- `GET /api/insights` - Get performance insights (Rust)
- `GET /api/profile` - User profile data

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest test_*.py
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Build Rust API
cd backend/rust-api
cargo build --release

# Run production servers
cd backend
python api.py
cd rust-api
./target/release/intern-genie-rust-api
```

### Environment Variables for Production
```bash
JWT_SECRET_KEY=your-production-secret-key
SENDGRID_API_KEY=your-production-sendgrid-key
DATABASE_URL=sqlite:///./backend/recommendation_engine.db
```

## 📁 Project Structure

```
InternGenie/
├── frontend/                 # Next.js frontend
│   ├── app/                 # App Router pages
│   ├── components/          # React components
│   └── lib/                 # Utilities and API clients
├── backend/                 # Backend services
│   ├── api.py              # Python FastAPI server
│   ├── rust-api/           # Rust Axum server
│   ├── data/               # Sample data and datasets
│   └── models/             # ML models and training scripts
├── docs/                   # Documentation
└── scripts/                # Deployment and utility scripts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/docs` endpoint

## 🔄 Version History

- **v1.0.0** - Initial release with hybrid backend architecture
- **v0.9.0** - Added Rust API for high-performance endpoints
- **v0.8.0** - Implemented ML recommendation engine
- **v0.7.0** - Added privacy controls and insights
- **v0.6.0** - Integrated intelligent chatbot
- **v0.5.0** - Basic authentication and user management

---

**Built with ❤️ for the next generation of interns**