# 🚀 Deployment Guide - Vercel + Render

## 📁 **Repository Structure Options**

### **Option 1: Single Repository (Recommended for this project)**
```
truck-tracking-system/
├── frontend/          # React app
├── backend/           # Django app
├── README.md
├── .gitignore
└── deployment/        # Deployment configs
```

**✅ Advantages:**
- Easier to manage both codebases
- Single issue tracking
- Coordinated releases
- Better for small teams

### **Option 2: Separate Repositories**
```
truck-tracking-frontend/   # Separate repo
truck-tracking-backend/    # Separate repo
```

**✅ Advantages:**
- Independent deployments
- Different access controls
- Separate CI/CD pipelines

## 🎯 **Recommended: Single Repository**

For your truck tracking system, I recommend **one repository** with both frontend and backend because:
- It's a cohesive application
- Easier to maintain API contracts
- Simpler deployment coordination

---

## 🌐 **Deployment Setup**

### **1. Repository Preparation**

#### **Create .gitignore in root:**
```gitignore
# Dependencies
node_modules/
backend/venv/
backend/__pycache__/
frontend/build/

# Environment files
.env
.env.local
.env.production

# Database
*.sqlite3
*.db

# Logs
*.log

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Build outputs
frontend/build/
backend/staticfiles/
```

#### **Create main README.md:**
```markdown
# 🚛 Truck Tracking System

Live GPS tracking system for fleet management.

## 🚀 Quick Start

### Frontend (React)
```bash
cd frontend
npm install
npm start
```

### Backend (Django)
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## 🌐 Live Demo
- Frontend: https://your-app.vercel.app
- Backend API: https://your-api.onrender.com
```

---

## 🎨 **Frontend Deployment (Vercel)**

### **Step 1: Prepare Frontend for Production**

#### **Update frontend/package.json:**
```json
{
  "name": "truck-tracking-frontend",
  "version": "1.0.0",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "axios": "^1.3.0",
    "leaflet": "^1.9.3",
    "@types/leaflet": "^1.9.0"
  }
}
```

#### **Create vercel.json in frontend/:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "dest": "/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

#### **Update frontend/.env.production:**
```env
REACT_APP_API_BASE_URL=https://your-backend.onrender.com
REACT_APP_WS_BASE_URL=wss://your-backend.onrender.com
```

### **Step 2: Deploy to Vercel**

1. **Push to GitHub:**
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. **Vercel Setup:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - **Root Directory:** `frontend`
   - **Framework Preset:** React
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

3. **Environment Variables in Vercel:**
   - Add `REACT_APP_API_BASE_URL`
   - Add `REACT_APP_WS_BASE_URL`

---

## 🖥️ **Backend Deployment (Render)**

### **Step 1: Prepare Backend for Production**

#### **Update backend/requirements.txt:**
```txt
Django==4.2.7
djangorestframework==3.14.0
django-cors-headers==4.3.1
djangorestframework-simplejwt==5.3.0
channels==4.0.0
channels-redis==4.1.0
django-environ==0.11.2
Pillow==10.1.0
daphne==4.0.0
psycopg2-binary==2.9.7
whitenoise==6.6.0
gunicorn==21.2.0
```

#### **Create backend/render.yaml:**
```yaml
services:
  - type: web
    name: truck-tracking-api
    env: python
    buildCommand: pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
    startCommand: daphne -b 0.0.0.0 -p $PORT truck_tracking.asgi:application
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: truck-tracking-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: False

databases:
  - name: truck-tracking-db
    databaseName: truck_tracking
    user: truck_tracking_user
```

#### **Update backend/truck_tracking/settings.py:**
```python
import os
import dj_database_url
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Production settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'your-backend.onrender.com',  # Replace with your Render URL
]

# Database
if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# CORS settings for production
CORS_ALLOWED_ORIGINS = [
    "https://your-app.vercel.app",  # Replace with your Vercel URL
    "http://localhost:3000",  # For development
]

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# WhiteNoise middleware
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
```

### **Step 2: Deploy to Render**

1. **Push to GitHub:**
```bash
git add .
git commit -m "Configure for Render deployment"
git push origin main
```

2. **Render Setup:**
   - Go to [render.com](https://render.com)
   - Create new **Web Service**
   - Connect your GitHub repository
   - **Root Directory:** `backend`
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command:** `daphne -b 0.0.0.0 -p $PORT truck_tracking.asgi:application`

3. **Environment Variables in Render:**
   ```
   SECRET_KEY=your-secret-key-here
   DEBUG=False
   DATABASE_URL=(auto-generated by Render)
   ```

4. **Create PostgreSQL Database:**
   - In Render dashboard, create **PostgreSQL** database
   - Link it to your web service

---

## 🔧 **Production Configuration**

### **Environment Variables Summary:**

#### **Vercel (Frontend):**
```
REACT_APP_API_BASE_URL=https://your-backend.onrender.com
REACT_APP_WS_BASE_URL=wss://your-backend.onrender.com
```

#### **Render (Backend):**
```
SECRET_KEY=your-django-secret-key
DEBUG=False
DATABASE_URL=(auto-provided)
```

---

## 🧪 **Deployment Checklist**

### **Pre-deployment:**
- [ ] Update CORS settings with production URLs
- [ ] Set proper environment variables
- [ ] Test build commands locally
- [ ] Update README with live URLs

### **Post-deployment:**
- [ ] Test user registration/login
- [ ] Verify GPS tracking works
- [ ] Test WebSocket connections
- [ ] Check map rendering
- [ ] Verify admin dashboard

---

## 🔍 **Monitoring & Debugging**

### **Vercel Logs:**
- Go to Vercel dashboard → Functions tab
- Check build and runtime logs

### **Render Logs:**
- Go to Render dashboard → Logs tab
- Monitor Django application logs

### **Common Issues:**
1. **CORS errors:** Update CORS_ALLOWED_ORIGINS
2. **WebSocket failures:** Check WSS URL configuration
3. **Database migrations:** Run migrations on Render
4. **Static files:** Ensure WhiteNoise is configured

---

## 🎯 **Final URLs Structure**

After deployment, you'll have:
- **Frontend:** `https://truck-tracking.vercel.app`
- **Backend API:** `https://truck-tracking-api.onrender.com`
- **Admin Panel:** `https://truck-tracking-api.onrender.com/admin/`

**Your production truck tracking system will be live! 🚛✨**
