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
  truck_type: 'mini' | 'small' | 'medium' | 'large' | 'heavy';
  capacity_tons: number;
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

export interface RouteRequest {
  id: number;
  title: string;
  description: string;
  start_location: string;
  end_location: string;
  start_latitude: string;
  start_longitude: string;
  end_latitude: string;
  end_longitude: string;
  material_type: 'general' | 'oil' | 'gas' | 'chemical' | 'food' | 'construction' | 'electronics' | 'textiles' | 'machinery' | 'other';
  required_truck_type: 'mini' | 'small' | 'medium' | 'large' | 'heavy' | 'any';
  estimated_weight_tons?: number;
  distance_km?: number;
  budget_min: number;
  budget_max: number;
  pickup_deadline: string;
  delivery_deadline: string;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  created_by: number;
  created_by_details?: User;
  assigned_driver?: number;
  assigned_driver_details?: User;
  assigned_truck?: number;
  assigned_truck_details?: Truck;
  winning_bid_amount?: number;
  bid_count?: number;
  lowest_bid?: number;
  created_at: string;
  updated_at: string;
}

export interface RouteBid {
  id: number;
  route_request: number;
  route_request_details?: RouteRequest;
  driver: number;
  driver_details?: User;
  truck: number;
  truck_details?: Truck;
  bid_amount: number;
  estimated_pickup_time: string;
  estimated_delivery_time: string;
  additional_notes: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  total_trucks: number;
  active_trucks: number;
  active_routes: number;
  trucks: Truck[];
  active_routes_data: DeliveryRoute[];
}
