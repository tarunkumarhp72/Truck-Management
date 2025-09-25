import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  Truck, 
  Location, 
  DeliveryRoute, 
  RouteRequest,
  RouteBid,
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

// Route Request API (Bidding System)
export const routeRequestAPI = {
  getRouteRequests: (): Promise<AxiosResponse<RouteRequest[]>> =>
    api.get('/tracking/route-requests/'),
  
  getRouteRequest: (id: number): Promise<AxiosResponse<RouteRequest>> =>
    api.get(`/tracking/route-requests/${id}/`),
  
  createRouteRequest: (data: Partial<RouteRequest>): Promise<AxiosResponse<RouteRequest>> =>
    api.post('/tracking/route-requests/', data),
  
  updateRouteRequest: (id: number, data: Partial<RouteRequest>): Promise<AxiosResponse<RouteRequest>> =>
    api.put(`/tracking/route-requests/${id}/`, data),
  
  deleteRouteRequest: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/tracking/route-requests/${id}/`),
  
  getAvailableRoutes: (): Promise<AxiosResponse<RouteRequest[]>> =>
    api.get('/tracking/available-routes/'),
    
  getRouteBids: (routeRequestId: number): Promise<AxiosResponse<RouteBid[]>> =>
    api.get(`/tracking/route-requests/${routeRequestId}/bids/`),
};

// Route Bid API
export const routeBidAPI = {
  getBids: (routeRequestId?: number): Promise<AxiosResponse<RouteBid[]>> =>
    api.get('/tracking/bids/', { params: routeRequestId ? { route_request_id: routeRequestId } : {} }),
  
  getBid: (id: number): Promise<AxiosResponse<RouteBid>> =>
    api.get(`/tracking/bids/${id}/`),
  
  createBid: (data: Partial<RouteBid>): Promise<AxiosResponse<RouteBid>> =>
    api.post('/tracking/bids/', data),
  
  updateBid: (id: number, data: Partial<RouteBid>): Promise<AxiosResponse<RouteBid>> =>
    api.put(`/tracking/bids/${id}/`, data),
  
  deleteBid: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/tracking/bids/${id}/`),
  
  acceptBid: (bidId: number): Promise<AxiosResponse<{
    bid: RouteBid;
    route_request: RouteRequest;
    delivery_route: DeliveryRoute;
  }>> =>
    api.post(`/tracking/bids/${bidId}/accept/`),
  
  rejectBid: (bidId: number): Promise<AxiosResponse<RouteBid>> =>
    api.post(`/tracking/bids/${bidId}/reject/`),
  
  withdrawBid: (bidId: number): Promise<AxiosResponse<RouteBid>> =>
    api.post(`/tracking/bids/${bidId}/withdraw/`),
};

export default api;
