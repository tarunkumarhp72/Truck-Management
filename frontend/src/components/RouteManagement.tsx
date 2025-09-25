import React, { useState, useEffect } from 'react';
import { RouteRequest, RouteBid } from '../types';
import { routeRequestAPI, routeBidAPI } from '../services/api';
import RouteRequestForm from './RouteRequestForm';
import Map from './Map';

const RouteManagement: React.FC = () => {
  const [routeRequests, setRouteRequests] = useState<RouteRequest[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteRequest | null>(null);
  const [routeBids, setRouteBids] = useState<RouteBid[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load route requests
  const loadRouteRequests = async () => {
    try {
      setLoading(true);
      const response = await routeRequestAPI.getRouteRequests();
      setRouteRequests(response.data);
    } catch (error) {
      console.error('Failed to load route requests:', error);
      setError('Failed to load route requests');
    } finally {
      setLoading(false);
    }
  };

  // Load bids for a specific route
  const loadRouteBids = async (routeId: number) => {
    try {
      const response = await routeRequestAPI.getRouteBids(routeId);
      setRouteBids(response.data);
    } catch (error) {
      console.error('Failed to load route bids:', error);
      setError('Failed to load route bids');
    }
  };

  // Create new route request
  const handleCreateRoute = async (data: Partial<RouteRequest>) => {
    try {
      setLoading(true);
      await routeRequestAPI.createRouteRequest(data);
      setShowCreateForm(false);
      await loadRouteRequests();
    } catch (error) {
      console.error('Failed to create route request:', error);
      setError('Failed to create route request');
    } finally {
      setLoading(false);
    }
  };

  // Accept a bid
  const handleAcceptBid = async (bidId: number) => {
    try {
      await routeBidAPI.acceptBid(bidId);
      await loadRouteRequests();
      if (selectedRoute) {
        await loadRouteBids(selectedRoute.id);
      }
    } catch (error) {
      console.error('Failed to accept bid:', error);
      setError('Failed to accept bid');
    }
  };

  // Reject a bid
  const handleRejectBid = async (bidId: number) => {
    try {
      await routeBidAPI.rejectBid(bidId);
      if (selectedRoute) {
        await loadRouteBids(selectedRoute.id);
      }
    } catch (error) {
      console.error('Failed to reject bid:', error);
      setError('Failed to reject bid');
    }
  };

  // Select a route and load its bids
  const handleSelectRoute = async (route: RouteRequest) => {
    setSelectedRoute(route);
    await loadRouteBids(route.id);
  };

  useEffect(() => {
    loadRouteRequests();
  }, []);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showCreateForm) {
    return (
      <RouteRequestForm
        onSubmit={handleCreateRoute}
        onCancel={() => setShowCreateForm(false)}
        loading={loading}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Route Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Route Request</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Requests List */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Route Requests</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading routes...</p>
              </div>
            ) : routeRequests.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No route requests found. Create your first route request to get started.
              </div>
            ) : (
              routeRequests.map((route) => (
                <div
                  key={route.id}
                  onClick={() => handleSelectRoute(route)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedRoute?.id === route.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">{route.title}</h4>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(route.status)}`}>
                      {route.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {route.start_location} → {route.end_location}
                  </p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>₹{route.budget_min} - ₹{route.budget_max}</span>
                    <span>{route.bid_count || 0} bids</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Route Map */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedRoute ? 'Route Overview' : 'Select a route to view map'}
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64 bg-gray-100 rounded-lg border overflow-hidden">
              <Map
                locations={[]}
                showRoute={false}
                routePoints={selectedRoute ? [{
                  start: [parseFloat(selectedRoute.start_latitude), parseFloat(selectedRoute.start_longitude)],
                  end: [parseFloat(selectedRoute.end_latitude), parseFloat(selectedRoute.end_longitude)]
                }] : []}
                className="h-full w-full"
              />
            </div>
            {selectedRoute && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Distance:</span>
                  <div className="text-gray-900">{selectedRoute.distance_km || 'N/A'} km</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Material:</span>
                  <div className="text-gray-900 capitalize">{selectedRoute.material_type}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Route Details and Bids */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedRoute ? `Bids for "${selectedRoute.title}"` : 'Select a route to view bids'}
            </h3>
          </div>
          
          {selectedRoute ? (
            <div className="p-6">
              {/* Route Details */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Material:</span>
                    <span className="ml-2 text-gray-900 capitalize">{selectedRoute.material_type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Truck Type:</span>
                    <span className="ml-2 text-gray-900 capitalize">{selectedRoute.required_truck_type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Pickup:</span>
                    <span className="ml-2 text-gray-900">{new Date(selectedRoute.pickup_deadline).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Delivery:</span>
                    <span className="ml-2 text-gray-900">{new Date(selectedRoute.delivery_deadline).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Bids List */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Received Bids ({routeBids.length})</h4>
                {routeBids.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No bids received yet for this route.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {routeBids.map((bid) => (
                      <div key={bid.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-semibold text-gray-900">
                              {bid.driver_details?.username}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {bid.truck_details?.truck_number} - {bid.truck_details?.model}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">₹{bid.bid_amount}</div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getBidStatusColor(bid.status)}`}>
                              {bid.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">Pickup:</span>
                            <div>{new Date(bid.estimated_pickup_time).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="font-medium">Delivery:</span>
                            <div>{new Date(bid.estimated_delivery_time).toLocaleString()}</div>
                          </div>
                        </div>

                        {bid.additional_notes && (
                          <div className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">Notes:</span>
                            <p className="mt-1">{bid.additional_notes}</p>
                          </div>
                        )}

                        {bid.status === 'pending' && selectedRoute.status === 'open' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAcceptBid(bid.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm font-semibold"
                            >
                              Accept Bid
                            </button>
                            <button
                              onClick={() => handleRejectBid(bid.id)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm font-semibold"
                            >
                              Reject Bid
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Select a route request from the left to view and manage bids.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteManagement;
