import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Map from '../components/Map';
import { Truck, Location,  User, DashboardData } from '../types';
import { truckAPI, locationAPI,  authAPI, dashboardAPI } from '../services/api';
import { AdminDashboardService } from '../services/websocket';

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [selectedTruckLocations, setSelectedTruckLocations] = useState<Location[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wsService, setWsService] = useState<AdminDashboardService | null>(null);
  const [showCreateTruckModal, setShowCreateTruckModal] = useState(false);
  const [newTruck, setNewTruck] = useState({
    truck_number: '',
    license_plate: '',
    model: '',
    driver: '',
  });

  // Refs to avoid stale closures in WebSocket callbacks
  // (initialized after callbacks are declared below)
  const loadDashboardDataRef = useRef<() => Promise<void>>();
  const loadTruckLocationsRef = useRef<(truck: Truck) => Promise<void>>();
  const selectedTruckRef = useRef<Truck | null>(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [dashboardResponse, driversResponse] = await Promise.all([
        dashboardAPI.getDashboardData(),
        authAPI.getDrivers(),
      ]);

      setDashboardData(dashboardResponse.data);
      setDrivers(driversResponse.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load truck locations
  const loadTruckLocations = useCallback(async (truck: Truck) => {
    try {
      const response = await locationAPI.getTruckLocationHistory(truck.id, 20);
      setSelectedTruckLocations(response.data.locations);
      setSelectedTruck(truck);
    } catch (error) {
      console.error('Failed to load truck locations:', error);
      setError('Failed to load truck locations');
    }
  }, []);

  // Keep refs updated with latest functions/state
  useEffect(() => { loadDashboardDataRef.current = loadDashboardData; }, [loadDashboardData]);
  useEffect(() => { loadTruckLocationsRef.current = loadTruckLocations; }, [loadTruckLocations]);
  useEffect(() => { selectedTruckRef.current = selectedTruck; }, [selectedTruck]);

  // Create new truck
  const createTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await truckAPI.createTruck({
        truck_number: newTruck.truck_number,
        license_plate: newTruck.license_plate,
        model: newTruck.model,
        driver: newTruck.driver ? parseInt(newTruck.driver) : undefined,
      });
      
      setShowCreateTruckModal(false);
      setNewTruck({ truck_number: '', license_plate: '', model: '', driver: '' });
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to create truck:', error);
      setError('Failed to create truck');
    }
  };

  // Assign driver to truck
  const assignDriver = async (truckId: number, driverId?: number) => {
    try {
      await truckAPI.assignDriver(truckId, driverId);
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to assign driver:', error);
      setError('Failed to assign driver');
    }
  };

  // Initialize WebSocket connection (optional)
  useEffect(() => {
    let localService: AdminDashboardService | null = null;

    const initWebSocket = async () => {
      try {
        const service = new AdminDashboardService();
        await service.connect();
        localService = service;

        service.onMessage((data) => {
          if (data.type === 'location_update') {
            // Update real-time location data without capturing stale variables
            loadDashboardDataRef.current?.();
            const currentTruck = selectedTruckRef.current;
            if (currentTruck) {
              loadTruckLocationsRef.current?.(currentTruck);
            }
          }
        });

        setWsService(service);
        console.log('WebSocket connected for real-time admin updates');
      } catch (error) {
        console.warn('WebSocket connection failed, using REST API only:', error);
        // Continue without WebSocket - admin dashboard will work with REST API polling
      }
    };

    initWebSocket();

    return () => {
      if (localService) {
        localService.disconnect();
        localService = null;
      }
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
    
    // Set up automatic refresh every 10 seconds if no WebSocket
    const refreshInterval = setInterval(() => {
      if (!wsService) {
        loadDashboardData();
        if (selectedTruck) {
          loadTruckLocations(selectedTruck);
        }
      }
    }, 10000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [loadDashboardData, wsService, selectedTruck, loadTruckLocations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-900 to-purple-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-3 rounded-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Fleet Management</h1>
                <p className="text-indigo-200">Central Control Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateTruckModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200 shadow-lg flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                </svg>
                <span>Add Vehicle</span>
              </button>
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🚛</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Trucks
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData.total_trucks}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Trucks
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData.active_trucks}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🛣️</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Routes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData.active_routes}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trucks List */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                All Trucks
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Truck
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData?.trucks.map((truck) => (
                      <tr key={truck.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {truck.truck_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {truck.license_plate}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {truck.driver_details ? (
                            <div className="text-sm text-gray-900">
                              {truck.driver_details.username}
                            </div>
                          ) : (
                            <select
                              onChange={(e) => assignDriver(truck.id, parseInt(e.target.value))}
                              className="text-sm border rounded px-2 py-1"
                              defaultValue=""
                            >
                              <option value="">Assign Driver</option>
                              {drivers.map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.username}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            truck.status === 'active' ? 'bg-green-100 text-green-800' :
                            truck.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {truck.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => loadTruckLocations(truck)}
                            className="text-indigo-600 hover:text-indigo-900 mr-2"
                          >
                            Track
                          </button>
                          {truck.driver_details && (
                            <button
                              onClick={() => assignDriver(truck.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Unassign
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {selectedTruck ? `Tracking: ${selectedTruck.truck_number}` : 'Select a truck to track'}
                </h3>
                {selectedTruck && (
                  <span className="text-sm text-gray-500">
                    {selectedTruckLocations.length} location{selectedTruckLocations.length !== 1 ? 's' : ''} loaded
                  </span>
                )}
              </div>
              <div className="h-96 bg-gray-100 rounded-lg border">
                <Map
                  locations={selectedTruckLocations}
                  showRoute={true}
                  className="h-full w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active Routes */}
        {dashboardData?.active_routes_data && dashboardData.active_routes_data.length > 0 && (
          <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Active Routes
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Truck
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Started
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.active_routes_data.map((route) => (
                      <tr key={route.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {route.truck_details?.truck_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {route.driver_details?.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {route.start_location} → {route.end_location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {route.started_at ? new Date(route.started_at).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Truck Modal */}
      {showCreateTruckModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Truck</h3>
            <form onSubmit={createTruck}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Truck Number
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  value={newTruck.truck_number}
                  onChange={(e) => setNewTruck(prev => ({ ...prev, truck_number: e.target.value }))}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  License Plate
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  value={newTruck.license_plate}
                  onChange={(e) => setNewTruck(prev => ({ ...prev, license_plate: e.target.value }))}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Model
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  value={newTruck.model}
                  onChange={(e) => setNewTruck(prev => ({ ...prev, model: e.target.value }))}
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Assign Driver (Optional)
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  value={newTruck.driver}
                  onChange={(e) => setNewTruck(prev => ({ ...prev, driver: e.target.value }))}
                >
                  <option value="">Select Driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCreateTruckModal(false)}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create Truck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
