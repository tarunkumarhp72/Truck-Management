# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### 🚨 **Backend Connection Errors**

**Error:** `ERR_INSUFFICIENT_RESOURCES` or `ERR_NETWORK`
**Solution:**
1. **Start the Django Server:**
   ```bash
   cd backend
   python manage.py runserver
   ```
   Should show: `Starting development server at http://127.0.0.1:8000/`

2. **Check Server Status:**
   - Open `http://localhost:8000/admin/` in browser
   - Should show Django admin login page

3. **Verify Database:**
   ```bash
   python manage.py migrate
   python manage.py populate_sample_data
   ```

### 🔌 **WebSocket Connection Issues**

**Error:** `WebSocket handshake: Unexpected response code: 404`
**Solutions:**
1. **Install Redis** (required for WebSockets):
   ```bash
   # Windows: Download from https://github.com/microsoftarchive/redis/releases
   # Linux: sudo apt-get install redis-server
   # Mac: brew install redis
   ```

2. **Start Redis Server:**
   ```bash
   redis-server
   ```

3. **Check WebSocket URL:** Should be `ws://localhost:8000/ws/tracking/{id}/`

### ⏳ **Infinite Loading Issues**

**Symptoms:** Page shows "Loading..." indefinitely
**Solutions:**
1. **Check Browser Console** for specific errors
2. **Verify Backend is Running** on port 8000
3. **Clear Browser Cache** and localStorage:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### 🗺️ **Map Not Loading**

**Solutions:**
1. **Check Internet Connection** (maps require external tiles)
2. **Verify Leaflet CSS** is loaded in `public/index.html`
3. **Check Console** for JavaScript errors

### 🔐 **Authentication Issues**

**Error:** "Invalid credentials" or token errors
**Solutions:**
1. **Use Demo Accounts:**
   - Admin: `admin` / `admin123`
   - Driver: `driver1` / `driver123`

2. **Reset Database:**
   ```bash
   cd backend
   rm db.sqlite3
   python manage.py migrate
   python manage.py populate_sample_data
   ```

### 📍 **Location Tracking Not Working**

**Solutions:**
1. **Enable Location Permissions** in browser
2. **Use HTTPS** in production (location API requires secure context)
3. **Check Console** for geolocation errors

## 🚀 **Quick Start Checklist**

### Prerequisites
- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed
- [ ] Redis server installed and running

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py populate_sample_data
python manage.py runserver
```
✅ Should see: "Starting development server at http://127.0.0.1:8000/"

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
✅ Should see: "webpack compiled successfully"

### Verification
1. **Backend:** `http://localhost:8000/admin/` shows login page
2. **Frontend:** `http://localhost:3000` shows login page
3. **Redis:** `redis-cli ping` returns "PONG"

## 🔍 **Debug Mode**

### Enable Detailed Logging
1. **Backend Logs:**
   ```python
   # In settings.py, set DEBUG = True
   DEBUG = True
   ```

2. **Frontend Logs:**
   ```javascript
   // Open browser console (F12)
   // Check Network tab for failed requests
   ```

### Test API Endpoints
```bash
# Test login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Test trucks endpoint
curl http://localhost:8000/api/tracking/trucks/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📞 **Still Having Issues?**

1. **Check Error Console:** Browser F12 → Console tab
2. **Check Network Tab:** Browser F12 → Network tab
3. **Verify Ports:**
   - Backend: `http://localhost:8000`
   - Frontend: `http://localhost:3000`
   - Redis: `localhost:6379`

### Common Error Patterns
- **CORS Errors:** Backend not allowing frontend origin
- **404 Errors:** URL endpoints don't match backend routes
- **500 Errors:** Backend server errors (check Django console)
- **Network Errors:** Backend server not running

---

**Remember:** Start backend first, then frontend! 🚛💨
