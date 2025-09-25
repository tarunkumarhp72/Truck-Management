import React, { useState } from 'react';
import { RouteRequest } from '../types';
import { LocationSuggestion } from '../services/locationiq';
import LocationSearchInput from './LocationSearchInput';

interface RouteRequestFormProps {
  onSubmit: (data: Partial<RouteRequest>) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Partial<RouteRequest>;
}

const RouteRequestForm: React.FC<RouteRequestFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<RouteRequest>>({
    title: '',
    description: '',
    start_location: '',
    end_location: '',
    start_latitude: '',
    start_longitude: '',
    end_latitude: '',
    end_longitude: '',
    material_type: 'general',
    required_truck_type: 'any',
    estimated_weight_tons: undefined,
    distance_km: undefined,
    budget_min: 0,
    budget_max: 0,
    pickup_deadline: '',
    delivery_deadline: '',
    ...initialData
  });

  const [fromLocation, setFromLocation] = useState<LocationSuggestion | null>(null);
  const [toLocation, setToLocation] = useState<LocationSuggestion | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFromLocationChange = (location: LocationSuggestion | null) => {
    setFromLocation(location);
    if (location) {
      setFormData(prev => ({
        ...prev,
        start_location: location.formatted,
        start_latitude: location.coordinates.lat.toString(),
        start_longitude: location.coordinates.lng.toString()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        start_location: '',
        start_latitude: '',
        start_longitude: ''
      }));
    }
  };

  const handleToLocationChange = (location: LocationSuggestion | null) => {
    setToLocation(location);
    if (location) {
      setFormData(prev => ({
        ...prev,
        end_location: location.formatted,
        end_latitude: location.coordinates.lat.toString(),
        end_longitude: location.coordinates.lng.toString()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        end_location: '',
        end_latitude: '',
        end_longitude: ''
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const materialTypeOptions = [
    { value: 'general', label: 'General Cargo' },
    { value: 'oil', label: 'Oil & Petroleum' },
    { value: 'gas', label: 'Gas' },
    { value: 'chemical', label: 'Chemical' },
    { value: 'food', label: 'Food Items' },
    { value: 'construction', label: 'Construction Materials' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'textiles', label: 'Textiles' },
    { value: 'machinery', label: 'Machinery' },
    { value: 'other', label: 'Other' }
  ];

  const truckTypeOptions = [
    { value: 'any', label: 'Any Type' },
    { value: 'mini', label: 'Mini Truck' },
    { value: 'small', label: 'Small Truck' },
    { value: 'medium', label: 'Medium Truck' },
    { value: 'large', label: 'Large Truck' },
    { value: 'heavy', label: 'Heavy Truck' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {initialData?.id ? 'Edit Route Request' : 'Create Route Request'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Route Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Mumbai to Delhi Heavy Equipment Transport"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional details about the shipment..."
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Location *
            </label>
            <LocationSearchInput
              placeholder="Search for pickup location..."
              value={fromLocation}
              onChange={handleFromLocationChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Location *
            </label>
            <LocationSearchInput
              placeholder="Search for delivery location..."
              value={toLocation}
              onChange={handleToLocationChange}
            />
          </div>
        </div>

        {/* Material and Truck Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material Type *
            </label>
            <select
              name="material_type"
              value={formData.material_type}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {materialTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Truck Type *
            </label>
            <select
              name="required_truck_type"
              value={formData.required_truck_type}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {truckTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Weight (tons)
            </label>
            <input
              type="number"
              name="estimated_weight_tons"
              value={formData.estimated_weight_tons || ''}
              onChange={handleInputChange}
              step="0.1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.0"
            />
          </div>
        </div>

        {/* Budget Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Budget (₹) *
            </label>
            <input
              type="number"
              name="budget_min"
              value={formData.budget_min}
              onChange={handleInputChange}
              required
              min="0"
              step="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Budget (₹) *
            </label>
            <input
              type="number"
              name="budget_max"
              value={formData.budget_max}
              onChange={handleInputChange}
              required
              min="0"
              step="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="25000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distance (km)
            </label>
            <input
              type="number"
              name="distance_km"
              value={formData.distance_km || ''}
              onChange={handleInputChange}
              step="0.1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100.0"
            />
          </div>
        </div>

        {/* Deadline Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Deadline *
            </label>
            <input
              type="datetime-local"
              name="pickup_deadline"
              value={formData.pickup_deadline}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Deadline *
            </label>
            <input
              type="datetime-local"
              name="delivery_deadline"
              value={formData.delivery_deadline}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.title || !formData.start_location || !formData.end_location}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{initialData?.id ? 'Update Route' : 'Create Route'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default RouteRequestForm;
