import axios from 'axios';

const LOCATIONIQ_API_KEY = 'pk.0650fd2f543c03fd67b6cdcd875e76ad';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

export interface LocationIQPlace {
  place_id: string;
  osm_id: string;
  osm_type: string;
  licence: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
  class: string;
  type: string;
  display_name: string;
  display_place: string;
  display_address: string;
  address: {
    name?: string;
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface LocationSuggestion {
  id: string;
  formatted: string;
  address_line1: string;
  address_line2: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  place_id: string;
}

class LocationIQService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = LOCATIONIQ_API_KEY;
    this.baseUrl = LOCATIONIQ_BASE_URL;
  }

  /**
   * Search for location suggestions based on text input using LocationIQ
   * @param text Search text
   * @param limit Maximum number of suggestions (default: 10)
   * @returns Promise with location suggestions
   */
  async searchLocations(text: string, limit: number = 10): Promise<LocationSuggestion[]> {
    if (!text || text.trim().length < 2) {
      return [];
    }

    try {
      const response = await axios.get<LocationIQPlace[]>(`${this.baseUrl}/autocomplete`, {
        params: {
          key: this.apiKey,
          q: text.trim(),
          limit,
          countrycodes: 'in', // Focus on India
          format: 'json'
        },
        headers: {
          'accept': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      });

      return response.data.map((place, index) => {
        // Create formatted address
        const addressParts = [];
        
        // Add name or house number first
        if (place.address.name) {
          addressParts.push(place.address.name);
        } else if (place.address.house_number) {
          addressParts.push(place.address.house_number);
        }
        
        // Add road
        if (place.address.road) {
          addressParts.push(place.address.road);
        }
        
        // Create address line 1 (name/number + road)
        const address_line1 = addressParts.length > 0 ? addressParts.join(', ') : place.display_place;
        
        // Create address line 2 (area details)
        const areaDetails = [];
        if (place.address.suburb) areaDetails.push(place.address.suburb);
        if (place.address.city) areaDetails.push(place.address.city);
        if (place.address.state) areaDetails.push(place.address.state);
        if (place.address.postcode) areaDetails.push(place.address.postcode);
        if (place.address.country) areaDetails.push(place.address.country);
        
        const address_line2 = areaDetails.join(', ');

        return {
          id: place.place_id || `${index}-${Date.now()}`,
          formatted: place.display_name,
          address_line1: address_line1 || place.display_place,
          address_line2: address_line2 || place.display_address,
          coordinates: {
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon)
          },
          place_id: place.place_id
        };
      });
    } catch (error) {
      console.error('LocationIQ API error:', error);
      throw new Error('Failed to fetch location suggestions');
    }
  }

  /**
   * Reverse geocode coordinates to get location information
   * @param lat Latitude
   * @param lng Longitude
   * @returns Promise with location information
   */
  async reverseGeocode(lat: number, lng: number): Promise<LocationSuggestion | null> {
    try {
      const response = await axios.get<LocationIQPlace>(`${this.baseUrl}/reverse`, {
        params: {
          key: this.apiKey,
          lat,
          lon: lng,
          format: 'json'
        },
        headers: {
          'accept': 'application/json'
        },
        timeout: 5000
      });

      const place = response.data;
      
      // Create formatted address similar to search results
      const addressParts = [];
      if (place.address.name) {
        addressParts.push(place.address.name);
      } else if (place.address.house_number) {
        addressParts.push(place.address.house_number);
      }
      if (place.address.road) {
        addressParts.push(place.address.road);
      }
      
      const address_line1 = addressParts.length > 0 ? addressParts.join(', ') : place.display_place;
      
      const areaDetails = [];
      if (place.address.suburb) areaDetails.push(place.address.suburb);
      if (place.address.city) areaDetails.push(place.address.city);
      if (place.address.state) areaDetails.push(place.address.state);
      if (place.address.postcode) areaDetails.push(place.address.postcode);
      if (place.address.country) areaDetails.push(place.address.country);
      
      const address_line2 = areaDetails.join(', ');

      return {
        id: place.place_id || `${Date.now()}`,
        formatted: place.display_name,
        address_line1,
        address_line2,
        coordinates: {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lng)
        },
        place_id: place.place_id
      };
    } catch (error) {
      console.error('LocationIQ reverse geocode error:', error);
      return null;
    }
  }

  /**
   * Get route directions between two points
   * @param startLat Start latitude
   * @param startLng Start longitude
   * @param endLat End latitude
   * @param endLng End longitude
   * @returns Promise with route geometry
   */
  async getDirections(startLat: number, startLng: number, endLat: number, endLng: number): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/directions/driving/${startLng},${startLat};${endLng},${endLat}`, {
        params: {
          key: this.apiKey,
          steps: true,
          geometries: 'geojson',
          overview: 'full'
        },
        headers: {
          'accept': 'application/json'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('LocationIQ directions error:', error);
      throw new Error('Failed to fetch route directions');
    }
  }
}

export const locationiqService = new LocationIQService();
export default locationiqService;
