# 🔌 WebSocket Setup Guide

## 🚨 **Important: WebSocket Requirements**

For **real-time updates** to work properly, you need to run the Django server with **Daphne** instead of the regular `runserver` command.

## 🚀 **Quick Start (With WebSockets)**

### Method 1: Using Daphne (Recommended)
```bash
cd backend
pip install daphne
daphne -b 0.0.0.0 -p 8000 truck_tracking.asgi:application
```

### Method 2: Using the provided script
```bash
# Windows
start_server_websocket.bat

# Or manually:
cd backend
daphne truck_tracking.asgi:application --port 8000 --bind 0.0.0.0
```

## 🔍 **How to Verify WebSocket is Working**

1. **Start Backend with Daphne:**
   ```bash
   cd backend
   daphne -p 8000 truck_tracking.asgi:application
   ```
   ✅ Should see: `Starting server at tcp:port=8000:interface=0.0.0.0`

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Test WebSocket Connection:**
   - Login as admin or driver
   - Open browser console (F12)
   - Look for: `"WebSocket connected for real-time updates"`
   - **No 404 errors** should appear for WebSocket connections

## 🛠️ **Troubleshooting WebSocket Issues**

### ❌ **Error: WebSocket 404**
**Problem:** Using `python manage.py runserver` instead of Daphne
**Solution:** Use Daphne:
```bash
daphne -p 8000 truck_tracking.asgi:application
```

### ❌ **Error: Connection Refused**
**Problem:** Backend server not running
**Solution:** Start backend with Daphne

### ❌ **Error: Redis Connection**
**Problem:** Redis not installed/running
**Solution:** App now uses in-memory channels (no Redis required)

## 📊 **WebSocket vs REST API Mode**

### With WebSockets (Real-time) ✅
- **Admin Dashboard:** Live truck updates
- **Driver App:** Real-time location broadcasting
- **Updates:** Instant (< 1 second)

### Without WebSockets (Polling) ⚠️
- **Admin Dashboard:** Updates every 10 seconds
- **Driver App:** Location sent every 5 seconds via REST
- **Updates:** Delayed but functional

## 🔗 **WebSocket Endpoints**

### Driver Location Tracking:
```
ws://localhost:8000/ws/tracking/{truck_id}/?token={jwt_token}
```

### Admin Dashboard Updates:
```
ws://localhost:8000/ws/admin/dashboard/?token={jwt_token}
```

## 🧪 **Testing WebSocket Connection**

### Using Browser Console:
```javascript
// Test WebSocket connection
const token = localStorage.getItem('access_token');
const ws = new WebSocket(`ws://localhost:8000/ws/admin/dashboard/?token=${token}`);
ws.onopen = () => console.log('✅ WebSocket connected!');
ws.onerror = (error) => console.log('❌ WebSocket error:', error);
```

### Expected Behavior:
- **Success:** Console shows "✅ WebSocket connected!"
- **Failure:** Console shows 404 or connection errors

## 📝 **Configuration Notes**

### Backend Settings:
- **ASGI Application:** `truck_tracking.asgi:application`
- **Channel Layers:** In-memory (no Redis required)
- **Authentication:** JWT tokens in query string

### Frontend Configuration:
- **WebSocket URLs:** `ws://localhost:8000/ws/`
- **Fallback:** REST API polling every 10 seconds
- **Token:** Automatically included from localStorage

## 🔄 **Running Both Modes**

### Development with WebSockets:
```bash
# Terminal 1: Backend with WebSocket support
cd backend
daphne -p 8000 truck_tracking.asgi:application

# Terminal 2: Frontend
cd frontend
npm start
```

### Development without WebSockets:
```bash
# Terminal 1: Backend (basic)
cd backend
python manage.py runserver

# Terminal 2: Frontend (will use REST API polling)
cd frontend
npm start
```

## ✅ **Application Works in Both Modes**

The application is designed to work seamlessly whether WebSockets are available or not:

- **With WebSocket:** Real-time updates
- **Without WebSocket:** Automatic polling fallback

Choose the mode that best fits your deployment environment!

---

**Note:** For production deployment, always use Daphne or another ASGI server for full WebSocket support. 🚀
