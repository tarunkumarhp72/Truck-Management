# 🚀 Deployment Guide

This guide covers deploying the Live Truck Tracking System to production environments.

## 📋 Production Checklist

### Backend (Django)

1. **Environment Variables**
   ```bash
   # Copy and configure environment file
   cp env.example .env
   ```
   
   Configure these variables:
   ```
   DEBUG=False
   SECRET_KEY=your-super-secret-production-key
   ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   DATABASE_URL=postgresql://user:password@localhost/truck_tracking
   REDIS_URL=redis://localhost:6379
   ```

2. **Database Setup**
   ```bash
   # For PostgreSQL
   pip install psycopg2-binary
   
   # Run migrations
   python manage.py migrate
   
   # Create superuser
   python manage.py createsuperuser
   
   # Collect static files
   python manage.py collectstatic
   ```

3. **Production Server**
   ```bash
   # Install production dependencies
   pip install gunicorn daphne
   
   # Run with Gunicorn (HTTP)
   gunicorn truck_tracking.wsgi:application --bind 0.0.0.0:8000
   
   # Run with Daphne (WebSocket support)
   daphne -b 0.0.0.0 -p 8001 truck_tracking.asgi:application
   ```

### Frontend (React)

1. **Environment Configuration**
   ```bash
   # Copy and configure environment file
   cp env.example .env
   ```
   
   Configure:
   ```
   REACT_APP_API_URL=https://yourdomain.com/api
   REACT_APP_WS_URL=wss://yourdomain.com/ws
   ```

2. **Build for Production**
   ```bash
   npm run build
   ```

3. **Serve Static Files**
   - Deploy the `build` folder to your web server
   - Configure your web server to serve React routes

## 🐳 Docker Deployment

### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: truck_tracking
      POSTGRES_USER: truck_user
      POSTGRES_PASSWORD: truck_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
      - "8001:8001"
    environment:
      DEBUG: "False"
      DATABASE_URL: "postgresql://truck_user:truck_password@db:5432/truck_tracking"
      REDIS_URL: "redis://redis:6379"
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      REACT_APP_API_URL: "http://localhost:8000/api"
      REACT_APP_WS_URL: "ws://localhost:8001/ws"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Dockerfiles

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000 8001

CMD ["sh", "-c", "python manage.py migrate && gunicorn truck_tracking.wsgi:application --bind 0.0.0.0:8000 & daphne -b 0.0.0.0 -p 8001 truck_tracking.asgi:application"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:16-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## ☁️ Cloud Deployment Options

### AWS Deployment

1. **Using AWS Elastic Beanstalk**
   - Deploy Django app to Elastic Beanstalk
   - Use RDS for PostgreSQL
   - Use ElastiCache for Redis
   - Deploy React to S3 + CloudFront

2. **Using AWS ECS/Fargate**
   - Containerize both applications
   - Use Application Load Balancer
   - Auto-scaling configurations

### Google Cloud Platform

1. **App Engine**
   - Deploy Django to App Engine
   - Use Cloud SQL for database
   - Use Cloud Storage for static files

### Heroku Deployment

1. **Backend (Django)**
   ```bash
   # Install Heroku CLI
   # Create Procfile
   echo "web: gunicorn truck_tracking.wsgi" > Procfile
   echo "worker: daphne truck_tracking.asgi:application --port \$PORT --bind 0.0.0.0" >> Procfile
   
   # Deploy
   heroku create your-app-backend
   heroku addons:create heroku-postgresql:hobby-dev
   heroku addons:create heroku-redis:hobby-dev
   git push heroku main
   ```

2. **Frontend (React)**
   ```bash
   # Create build pack
   heroku create your-app-frontend --buildpack mars/create-react-app
   git push heroku main
   ```

## 🔒 Security Considerations

### Backend Security

1. **HTTPS Only**
   ```python
   # In settings.py
   SECURE_SSL_REDIRECT = True
   SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
   ```

2. **CORS Configuration**
   ```python
   CORS_ALLOWED_ORIGINS = [
       "https://yourdomain.com",
   ]
   CORS_ALLOW_ALL_ORIGINS = False  # Never True in production
   ```

3. **Database Security**
   - Use environment variables for credentials
   - Enable database SSL
   - Regular backups

### Frontend Security

1. **Content Security Policy**
2. **Environment Variables**
   - Never expose API keys in frontend
   - Use proxy for sensitive endpoints

## 📊 Monitoring & Logging

### Backend Monitoring

1. **Django Logging**
   ```python
   LOGGING = {
       'version': 1,
       'disable_existing_loggers': False,
       'handlers': {
           'file': {
               'level': 'INFO',
               'class': 'logging.FileHandler',
               'filename': 'django.log',
           },
       },
       'loggers': {
           'django': {
               'handlers': ['file'],
               'level': 'INFO',
               'propagate': True,
           },
       },
   }
   ```

2. **Performance Monitoring**
   - Use tools like Sentry for error tracking
   - Monitor database performance
   - Track WebSocket connections

### Health Checks

Create health check endpoints:
```python
# In views.py
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'healthy'})
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.11
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd backend
        python manage.py test
    
    - name: Build frontend
      run: |
        cd frontend
        npm install
        npm run build
    
    - name: Deploy to production
      # Add your deployment scripts here
```

## 📝 Maintenance

### Regular Tasks

1. **Database Backups**
   ```bash
   # PostgreSQL backup
   pg_dump truck_tracking > backup_$(date +%Y%m%d).sql
   ```

2. **Log Rotation**
   - Configure logrotate for Django logs
   - Monitor disk usage

3. **Security Updates**
   - Regular dependency updates
   - Security patches

### Scaling Considerations

1. **Horizontal Scaling**
   - Load balancer configuration
   - Multiple application instances
   - Database read replicas

2. **WebSocket Scaling**
   - Redis cluster for channel layers
   - Multiple Daphne instances

---

Remember to test your deployment in a staging environment before going to production! 🚀
