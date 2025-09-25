import React, { useState, useEffect } from 'react';
import { RouteRequest, RouteBid, Truck } from '../types';
import { routeRequestAPI, routeBidAPI, truckAPI } from '../services/api';

const AvailableRoutes: React.FC = () => {
  const [availableRoutes, setAvailableRoutes] = useState<RouteRequest[]>([]);
  const [myBids, setMyBids] = useState<RouteBid[]>([]);
  const [driverTruck, setDriverTruck] = useState<Truck | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteRequest | null>(null);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidFormData, setBidFormData] = useState({
    bid_amount: '',
    estimated_pickup_time: '',
    estimated_delivery_time: '',
    additional_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load available routes
  const loadAvailableRoutes = async () => {
    try {
      setLoading(true);
      const response = await routeRequestAPI.getAvailableRoutes();
      setAvailableRoutes(response.data);
    } catch (error) {
      console.error('Failed to load available routes:', error);
      setError('Failed to load available routes');
    } finally {
      setLoading(false);
    }
  };

  // Load driver's bids
  const loadMyBids = async () => {
    try {
      const response = await routeBidAPI.getBids();
      setMyBids(response.data);
    } catch (error) {
      console.error('Failed to load bids:', error);
    }
  };

  // Load driver's truck
  const loadDriverTruck = async () => {
    try {
      const response = await truckAPI.getTrucks();
      const truck = response.data.find(t => t.driver_details);
      setDriverTruck(truck || null);
    } catch (error) {
      console.error('Failed to load truck:', error);
    }
  };

  // Place a bid
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute || !driverTruck) return;

    try {
      setLoading(true);
      await routeBidAPI.createBid({
        route_request: selectedRoute.id,
        truck: driverTruck.id,
        bid_amount: parseFloat(bidFormData.bid_amount),
        estimated_pickup_time: bidFormData.estimated_pickup_time,
        estimated_delivery_time: bidFormData.estimated_delivery_time,
        additional_notes: bidFormData.additional_notes
      });
      
      setShowBidForm(false);
      setBidFormData({
        bid_amount: '',
        estimated_pickup_time: '',
        estimated_delivery_time: '',
        additional_notes: ''
      });
      await loadAvailableRoutes();
      await loadMyBids();
    } catch (error) {
      console.error('Failed to place bid:', error);
      setError('Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  // Withdraw a bid
  const handleWithdrawBid = async (bidId: number) => {
    try {
      await routeBidAPI.withdrawBid(bidId);
      await loadMyBids();
    } catch (error) {
      console.error('Failed to withdraw bid:', error);
      setError('Failed to withdraw bid');
    }
  };

  useEffect(() => {
    loadAvailableRoutes();
    loadMyBids();
    loadDriverTruck();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Available Routes</h2>
          <p className="text-gray-600">Browse and bid on available delivery routes</p>
        </div>
        {driverTruck && (
          <div className="text-right">
            <div className="text-sm text-gray-500">Your Truck</div>
            <div className="font-semibold text-gray-900">
              {driverTruck.truck_number} - {driverTruck.truck_type.charAt(0).toUpperCase() + driverTruck.truck_type.slice(1)}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {!driverTruck && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No truck assigned
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You need to have a truck assigned to place bids. Please contact your administrator.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Routes */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Open for Bidding</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading routes...</p>
            </div>
          ) : availableRoutes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2">No routes available for bidding at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableRoutes.map((route) => (
                <div key={route.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{route.title}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(route.status)}`}>
                          {route.status.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                          </svg>
                          {route.start_location} → {route.end_location}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(route.budget_min)} - {formatCurrency(route.budget_max)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {route.bid_count || 0} bids
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-medium text-gray-700">Material:</span>
                      <div className="text-gray-900 capitalize">{route.material_type}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Truck Type:</span>
                      <div className="text-gray-900 capitalize">{route.required_truck_type}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Weight:</span>
                      <div className="text-gray-900">{route.estimated_weight_tons || 'N/A'} tons</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Distance:</span>
                      <div className="text-gray-900">{route.distance_km || 'N/A'} km</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-medium text-gray-700">Pickup by:</span>
                      <div className="text-gray-900">{new Date(route.pickup_deadline).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Deliver by:</span>
                      <div className="text-gray-900">{new Date(route.delivery_deadline).toLocaleString()}</div>
                    </div>
                  </div>

                  {route.description && (
                    <div className="text-sm text-gray-600 mb-4">
                      <span className="font-medium text-gray-700">Description:</span>
                      <p className="mt-1">{route.description}</p>
                    </div>
                  )}

                  {driverTruck && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedRoute(route);
                          setShowBidForm(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        Place Bid
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Bids */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">My Bids</h3>
          
          {myBids.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center text-gray-500">
              <p>No bids placed yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBids.map((bid) => (
                <div key={bid.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {bid.route_request_details?.title}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getBidStatusColor(bid.status)}`}>
                      {bid.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-lg font-bold text-green-600 mb-2">
                    {formatCurrency(bid.bid_amount)}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-3">
                    Pickup: {new Date(bid.estimated_pickup_time).toLocaleDateString()}
                  </div>

                  {bid.status === 'pending' && (
                    <button
                      onClick={() => handleWithdrawBid(bid.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm font-semibold"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bid Form Modal */}
      {showBidForm && selectedRoute && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Place Bid</h3>
              <button
                onClick={() => setShowBidForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium text-gray-900">{selectedRoute.title}</div>
              <div className="text-sm text-gray-600">{selectedRoute.start_location} → {selectedRoute.end_location}</div>
              <div className="text-sm text-gray-600">Budget: {formatCurrency(selectedRoute.budget_min)} - {formatCurrency(selectedRoute.budget_max)}</div>
            </div>

            <form onSubmit={handlePlaceBid}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Bid Amount (₹) *
                </label>
                <input
                  type="number"
                  value={bidFormData.bid_amount}
                  onChange={(e) => setBidFormData({...bidFormData, bid_amount: e.target.value})}
                  required
                  min={selectedRoute.budget_min}
                  max={selectedRoute.budget_max}
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Between ${selectedRoute.budget_min} and ${selectedRoute.budget_max}`}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Pickup Time *
                </label>
                <input
                  type="datetime-local"
                  value={bidFormData.estimated_pickup_time}
                  onChange={(e) => setBidFormData({...bidFormData, estimated_pickup_time: e.target.value})}
                  required
                  max={selectedRoute.pickup_deadline}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Delivery Time *
                </label>
                <input
                  type="datetime-local"
                  value={bidFormData.estimated_delivery_time}
                  onChange={(e) => setBidFormData({...bidFormData, estimated_delivery_time: e.target.value})}
                  required
                  max={selectedRoute.delivery_deadline}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={bidFormData.additional_notes}
                  onChange={(e) => setBidFormData({...bidFormData, additional_notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional information about your bid..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowBidForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Placing...' : 'Place Bid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableRoutes;
