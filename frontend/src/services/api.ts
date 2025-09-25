import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  Truck, 
  Location, 
  DeliveryRoute, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse,
  DashboardData 
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh and network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      return Promise.reject({
        ...error,
        message: 'Network Error: Please check if the backend server is running on http://localhost:8000'
      });
    }

    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          
          localStorage.setItem('access_token', response.data.access);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login/', credentials),
  
  register: (data: RegisterData): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register/', data),
  
  getProfile: (): Promise<AxiosResponse<User>> =>
    api.get('/auth/profile/'),
  
  updateProfile: (data: Partial<User>): Promise<AxiosResponse<User>> =>
    api.put('/auth/profile/update/', data),
  
  getDrivers: (): Promise<AxiosResponse<User[]>> =>
    api.get('/auth/drivers/'),
};

// Truck API
export const truckAPI = {
  getTrucks: (): Promise<AxiosResponse<Truck[]>> =>
    api.get('/tracking/trucks/'),
  
  getTruck: (id: number): Promise<AxiosResponse<Truck>> =>
    api.get(`/tracking/trucks/${id}/`),
  
  createTruck: (data: Partial<Truck>): Promise<AxiosResponse<Truck>> =>
    api.post('/tracking/trucks/', data),
  
  updateTruck: (id: number, data: Partial<Truck>): Promise<AxiosResponse<Truck>> =>
    api.put(`/tracking/trucks/${id}/`, data),
  
  deleteTruck: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/tracking/trucks/${id}/`),
  
  assignDriver: (truckId: number, driverId?: number): Promise<AxiosResponse<Truck>> =>
    api.post(`/tracking/trucks/${truckId}/assign-driver/`, { driver_id: driverId }),
};

// Location API
export const locationAPI = {
  getLocations: (truckId?: number): Promise<AxiosResponse<Location[]>> =>
    api.get('/tracking/locations/', { params: truckId ? { truck_id: truckId } : {} }),
  
  createLocation: (data: {
    truck: number;
    latitude: string;
    longitude: string;
    speed?: number;
    heading?: number;
    accuracy?: number;
  }): Promise<AxiosResponse<Location>> =>
    api.post('/tracking/locations/', data),
  
  getTruckLiveLocation: (truckId: number): Promise<AxiosResponse<Location>> =>
    api.get(`/tracking/trucks/${truckId}/live-location/`),
  
  getTruckLocationHistory: (truckId: number, limit?: number): Promise<AxiosResponse<{
    truck_id: number;
    locations: Location[];
  }>> =>
    api.get(`/tracking/trucks/${truckId}/location-history/`, { 
      params: limit ? { limit } : {} 
    }),
};

// Route API
export const routeAPI = {
  getRoutes: (): Promise<AxiosResponse<DeliveryRoute[]>> =>
    api.get('/tracking/routes/'),
  
  getRoute: (id: number): Promise<AxiosResponse<DeliveryRoute>> =>
    api.get(`/tracking/routes/${id}/`),
  
  createRoute: (data: Partial<DeliveryRoute>): Promise<AxiosResponse<DeliveryRoute>> =>
    api.post('/tracking/routes/', data),
  
  updateRoute: (id: number, data: Partial<DeliveryRoute>): Promise<AxiosResponse<DeliveryRoute>> =>
    api.put(`/tracking/routes/${id}/`, data),
  
  deleteRoute: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/tracking/routes/${id}/`),
  
  startRoute: (id: number): Promise<AxiosResponse<DeliveryRoute>> =>
    api.post(`/tracking/routes/${id}/start/`),
  
  completeRoute: (id: number): Promise<AxiosResponse<DeliveryRoute>> =>
    api.post(`/tracking/routes/${id}/complete/`),
};

// Dashboard API
export const dashboardAPI = {
  getDashboardData: (): Promise<AxiosResponse<DashboardData>> =>
    api.get('/tracking/dashboard/'),
};

export default api;
