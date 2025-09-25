# 🚛 Truck Tracking System

A modern, real-time GPS tracking system for fleet management with live location tracking, route management, and professional dashboard interfaces.

## ✨ Features

- **🔐 JWT Authentication** - Secure login for admin and drivers
- **📍 Live GPS Tracking** - Real-time location sharing from drivers
- **🗺️ Interactive Maps** - Leaflet.js with OpenStreetMap integration
- **⚡ Real-time Updates** - WebSocket connections with REST API fallback
- **👨‍💼 Admin Dashboard** - Fleet management and monitoring
- **🚛 Driver Portal** - Professional interface for drivers
- **📱 Responsive Design** - Works on desktop and mobile devices

## 🎯 Live Demo

- **Frontend:** [https://your-app.vercel.app](https://your-app.vercel.app)
- **API:** [https://your-api.onrender.com](https://your-api.onrender.com)

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py populate_sample_data
python manage.py runserver 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🔑 Default Login Credentials

- **Admin:** `admin` / `admin123`
- **Driver:** `driver1` / `driver123`

## 🏗️ Project Structure

```
truck_tracking_system/
├── frontend/              # React TypeScript app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Dashboard pages
│   │   ├── services/      # API and WebSocket services
│   │   └── types/         # TypeScript definitions
│   └── public/
├── backend/               # Django REST API
│   ├── truck_tracking/    # Main project settings
│   ├── authentication/   # User management
│   ├── tracking/         # Location and route tracking
│   └── requirements.txt
└── docs/                 # Documentation
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Leaflet.js** for maps
- **Axios** for HTTP requests
- **WebSocket** for real-time updates

### Backend
- **Django 4.2** with REST Framework
- **Django Channels** for WebSocket support
- **JWT Authentication**
- **SQLite/PostgreSQL** database
- **CORS** enabled for frontend integration

## 🌐 Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Connect repository to Vercel
3. Set root directory to `frontend`
4. Configure environment variables
5. Deploy

### Backend (Render)
1. Push to GitHub
2. Create new Web Service on Render
3. Set root directory to `backend`
4. Add PostgreSQL database
5. Configure environment variables
6. Deploy

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📱 Screenshots

### Driver Dashboard
- Live GPS tracking with professional UI
- Real-time location sharing controls
- Interactive map with route visualization
- GPS coordinate history

### Admin Dashboard
- Fleet management overview
- Real-time truck monitoring
- Driver assignment and management
- Live tracking map for all vehicles

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_WS_BASE_URL=ws://localhost:8000
```

#### Backend (.env)
```
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
```

## 🎯 Key Features

### For Drivers
- **Start/Stop Location Tracking** - One-click GPS sharing
- **Route Management** - View assigned routes and complete deliveries
- **Live Map** - See current position and route path
- **Connection Status** - Know if you're connected via WebSocket or REST

### For Administrators
- **Fleet Overview** - Monitor all trucks and drivers
- **Real-time Tracking** - See live positions on map
- **Driver Management** - Assign drivers to trucks
- **Route Planning** - Create and manage delivery routes

## 🔒 Security Features

- **JWT Token Authentication** - Secure API access
- **Role-based Access** - Admin and driver permissions
- **CORS Protection** - Secure cross-origin requests
- **Environment Variables** - Secure configuration management

## 🚀 Performance

- **Real-time Updates** - WebSocket for instant location updates
- **Fallback Support** - REST API when WebSocket unavailable
- **Optimized Maps** - Efficient marker rendering and route display
- **Professional UI** - Fast, responsive interface

## 📚 API Documentation

The backend provides RESTful APIs for:
- User authentication and management
- Truck and driver operations
- Location tracking and history
- Route creation and management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for modern fleet management**