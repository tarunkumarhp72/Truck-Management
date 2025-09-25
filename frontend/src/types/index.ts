export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'driver';
  phone_number?: string;
  is_active_duty: boolean;
  created_at: string;
}

export interface Truck {
  id: number;
  truck_number: string;
  license_plate: string;
  model: string;
  driver?: number;
  driver_details?: User;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  truck: number;
  truck_details?: Truck;
  driver: number;
  driver_details?: User;
  latitude: string;
  longitude: string;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: string;
}

export interface DeliveryRoute {
  id: number;
  truck: number;
  truck_details?: Truck;
  driver: number;
  driver_details?: User;
  start_location: string;
  end_location: string;
  start_latitude: string;
  start_longitude: string;
  end_latitude: string;
  end_longitude: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  email: string;
  password_confirm: string;
  role: 'admin' | 'driver';
  phone_number?: string;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface DashboardData {
  total_trucks: number;
  active_trucks: number;
  active_routes: number;
  trucks: Truck[];
  active_routes_data: DeliveryRoute[];
}
