import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Map from '../components/Map';
import AvailableRoutes from '../components/AvailableRoutes';
import { Truck, Location, DeliveryRoute } from '../types';
import { truckAPI, locationAPI, routeAPI } from '../services/api';
import { LocationTrackingService } from '../services/websocket';

const DriverDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [truck, setTruck] = useState<Truck | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentRoute, setCurrentRoute] = useState<DeliveryRoute | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationService, setLocationService] = useState<LocationTrackingService | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routes'>('dashboard');

  // Get user's current position
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  }, []);

  // Send location update
  const sendLocationUpdate = useCallback(async (position: GeolocationPosition) => {
    if (!truck) return;

    const locationData = {
      truck: truck.id,
      latitude: position.coords.latitude.toString(),
      longitude: position.coords.longitude.toString(),
      speed: position.coords.speed || 0,
      heading: position.coords.heading || 0,
      accuracy: position.coords.accuracy || 0,
    };

    try {
      // Send via REST API
      await locationAPI.createLocation(locationData);
      
      // Send via WebSocket if connected
      if (locationService) {
        locationService.sendLocationUpdate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
          accuracy: position.coords.accuracy || 0,
        });
      }
    } catch (error) {
      console.error('Failed to send location update:', error);
    }
  }, [truck, locationService]);

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!truck) return;

    try {
      setIsTracking(true);
      setError('');
      
      // Send initial location via REST API
      try {
        const position = await getCurrentPosition();
        await sendLocationUpdate(position);
      } catch (positionError) {
        console.error('Failed to get initial location:', positionError);
        setError('Failed to access location. Please enable location permissions.');
        setIsTracking(false);
        return;
      }

      // Initialize WebSocket connection (optional for real-time updates)
      try {
        const service = new LocationTrackingService(truck.id);
        await service.connect();
        setLocationService(service);
        console.log('WebSocket connected for real-time updates');
      } catch (wsError) {
        console.warn('WebSocket connection failed, using REST API only:', wsError);
        // Continue without WebSocket - use REST API only
      }

      // Set up periodic location updates (every 5 seconds)
      const intervalId = setInterval(async () => {
        try {
          const position = await getCurrentPosition();
          await sendLocationUpdate(position);
        } catch (error) {
          console.error('Failed to get location:', error);
        }
      }, 5000);

      // Store interval ID for cleanup
      if (locationService) {
        (locationService as any).intervalId = intervalId;
      } else {
        // Store interval ID in a ref if no WebSocket service
        (window as any).trackingIntervalId = intervalId;
      }
    } catch (error) {
      console.error('Failed to start tracking:', error);
      setError('Failed to start location tracking. Please check your connection.');
      setIsTracking(false);
    }
  }, [truck, getCurrentPosition, sendLocationUpdate, locationService]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (locationService) {
      if ((locationService as any).intervalId) {
        clearInterval((locationService as any).intervalId);
      }
      locationService.disconnect();
      setLocationService(null);
    }
    
    // Also clear interval if stored globally
    if ((window as any).trackingIntervalId) {
      clearInterval((window as any).trackingIntervalId);
      (window as any).trackingIntervalId = null;
    }
    
    setIsTracking(false);
  }, [locationService]);

  // Start route
  // const startRoute = async (routeId: number) => {
  //   try {
  //     const response = await routeAPI.startRoute(routeId);
  //     setCurrentRoute(response.data);
  //     await startTracking();
  //   } catch (error) {
  //     console.error('Failed to start route:', error);
  //     setError('Failed to start route');
  //   }
  // };

  // Complete route
  const completeRoute = async (routeId: number) => {
    try {
      await routeAPI.completeRoute(routeId);
      setCurrentRoute(null);
      stopTracking();
      await loadData(); // Reload data
    } catch (error) {
      console.error('Failed to complete route:', error);
      setError('Failed to complete route');
    }
  };

  // Load driver data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get driver's truck
      const trucksResponse = await truckAPI.getTrucks();
      const driverTruck = trucksResponse.data.find(t => t.driver === user?.id);
      
      if (!driverTruck) {
        setError('No truck assigned to this driver');
        setLoading(false);
        return;
      }
      
      setTruck(driverTruck);

      // Get location history
      try {
        const locationsResponse = await locationAPI.getLocations(driverTruck.id);
        setLocations(locationsResponse.data.slice(0, 20)); // Last 20 locations
      } catch (locationError) {
        console.warn('Failed to load locations:', locationError);
        setLocations([]);
      }

      // Get current route
      try {
        const routesResponse = await routeAPI.getRoutes();
        const activeRoute = routesResponse.data.find(r => 
          r.driver === user?.id && r.status === 'in_progress'
        );
        setCurrentRoute(activeRoute || null);
      } catch (routeError) {
        console.warn('Failed to load routes:', routeError);
        setCurrentRoute(null);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load driver data. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !truck) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={logout}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-3 rounded-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Driver Portal</h1>
                <p className="text-blue-200">Welcome back, {user?.username}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                isTracking 
                  ? 'bg-green-500 text-white shadow-lg' 
                  : 'bg-gray-500 text-white'
              }`}>
                {isTracking ? '● TRACKING ACTIVE' : '○ TRACKING INACTIVE'}
              </div>
              <div className={`px-3 py-1 rounded-lg text-xs ${
                locationService 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-yellow-500 text-white'
              }`}>
                {locationService ? 'REAL-TIME' : 'STANDARD'}
              </div>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200 shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Live Tracking
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'routes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Available Routes
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'routes' ? (
          <AvailableRoutes />
        ) : (
          <>
            {/* Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Truck Info */}
          <div className="lg:col-span-1">
            <div className="bg-white overflow-hidden shadow-xl rounded-xl border border-gray-200">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                  </svg>
                  Vehicle Information
                </h3>
              </div>
              <div className="px-6 py-6">
                {truck && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Truck ID</span>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{truck.truck_number}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">License Plate</span>
                        <p className="text-lg font-semibold text-gray-900">{truck.license_plate}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Vehicle Model</span>
                        <p className="text-lg font-semibold text-gray-900">{truck.model}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Vehicle Status</span>
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          truck.status === 'active' ? 'bg-green-100 text-green-800' :
                          truck.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {truck.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tracking Controls */}
                <div className="mt-8 space-y-4">
                  {!isTracking ? (
                    <button
                      onClick={startTracking}
                      disabled={false}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                      <span>START LOCATION TRACKING</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <button
                        disabled={true}
                        className="w-full bg-gray-400 cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center space-x-2 opacity-60"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                        </svg>
                        <span>TRACKING ACTIVE</span>
                      </button>
                      <button
                        onClick={stopTracking}
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"/>
                        </svg>
                        <span>STOP TRACKING</span>
                      </button>
                    </div>
                  )}
                  
                  {/* Connection Status Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-900">Connection Status</span>
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        locationService ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-white'
                      }`}>
                        {locationService ? 'REAL-TIME' : 'STANDARD'}
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      {locationService 
                        ? 'Live position updates via WebSocket connection' 
                        : 'Position updates every 5 seconds via HTTP API'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Route */}
            {currentRoute && (
              <div className="mt-6 bg-white overflow-hidden shadow-xl rounded-xl border border-gray-200">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Active Route
                  </h3>
                </div>
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5 8.293 7.207a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-500">Origin</span>
                        <p className="text-lg font-semibold text-gray-900">{currentRoute.start_location}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <div className="border-l-2 border-dashed border-gray-300 h-8"></div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-500">Destination</span>
                        <p className="text-lg font-semibold text-gray-900">{currentRoute.end_location}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">Route Status</span>
                        <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                          {currentRoute.status.toUpperCase()}
                        </span>
                      </div>
                      {currentRoute.status === 'in_progress' && (
                        <button
                          onClick={() => completeRoute(currentRoute.id)}
                          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
                        >
                          COMPLETE DELIVERY
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white overflow-hidden shadow-xl rounded-xl border border-gray-200">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                    Live Tracking Map
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-purple-700">
                      {locations.length} GPS Point{locations.length !== 1 ? 's' : ''}
                    </span>
                    {isTracking && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-semibold text-green-700">LIVE</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="h-96 bg-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden">
                  <Map
                    locations={locations}
                    showRoute={true}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>

            {/* Live Location Data */}
            {isTracking && locations.length > 0 && (
              <div className="mt-6 bg-white overflow-hidden shadow-xl rounded-xl border border-gray-200">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                    Recent GPS Data
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.slice(0, 6).map((location, index) => (
                      <div key={location.id} className={`p-4 rounded-lg border-2 ${
                        index === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500">
                            {index === 0 ? 'CURRENT' : `${index + 1} AGO`}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(location.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Lat:</span> {parseFloat(location.latitude).toFixed(6)}
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Lng:</span> {parseFloat(location.longitude).toFixed(6)}
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Speed:</span> {location.speed} km/h
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DriverDashboard;
