import axios from 'axios';

const GEOAPIFY_API_KEY = '8f699aa93a3f4b49b6a3b4e761d1a73d';
const GEOAPIFY_BASE_URL = 'https://api.geoapify.com/v1/geocode';

export interface GeoapifyLocation {
  type: string;
  properties: {
    country: string;
    country_code: string;
    state?: string;
    city?: string;
    postcode?: string;
    suburb?: string;
    street?: string;
    iso3166_2?: string;
    state_code?: string;
    lon: number;
    lat: number;
    housenumber?: string;
    result_type: string;
    formatted: string;
    address_line1: string;
    address_line2: string;
    timezone?: {
      name: string;
      offset_STD: string;
      offset_STD_seconds: number;
      offset_DST: string;
      offset_DST_seconds: number;
      abbreviation_STD: string;
      abbreviation_DST: string;
    };
    plus_code?: string;
    plus_code_short?: string;
    rank: {
      confidence: number;
      confidence_street_level?: number;
      confidence_building_level?: number;
      match_type: string;
    };
    place_id: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  bbox: [number, number, number, number];
}

export interface GeoapifyResponse {
  type: string;
  features: GeoapifyLocation[];
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

class GeoapifyService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = GEOAPIFY_API_KEY;
    this.baseUrl = GEOAPIFY_BASE_URL;
  }

  /**
   * Search for location suggestions based on text input
   * @param text Search text
   * @param limit Maximum number of suggestions (default: 10)
   * @returns Promise with location suggestions
   */
  async searchLocations(text: string, limit: number = 10): Promise<LocationSuggestion[]> {
    if (!text || text.trim().length < 2) {
      return [];
    }

    try {
      const response = await axios.get<GeoapifyResponse>(`${this.baseUrl}/autocomplete`, {
        params: {
          text: text.trim(),
          apiKey: this.apiKey,
          limit,
          format: 'geojson',
          // Bias results towards India
          bias: 'countrycode:in',
          // Filter to show only relevant results
          filter: 'countrycode:in'
        },
        timeout: 5000 // 5 second timeout
      });

      return response.data.features.map((feature, index) => ({
        id: feature.properties.place_id || `${index}-${Date.now()}`,
        formatted: feature.properties.formatted,
        address_line1: feature.properties.address_line1,
        address_line2: feature.properties.address_line2,
        coordinates: {
          lat: feature.properties.lat,
          lng: feature.properties.lon
        },
        place_id: feature.properties.place_id
      }));
    } catch (error) {
      console.error('Geoapify API error:', error);
      throw new Error('Failed to fetch location suggestions');
    }
  }

  /**
   * Get detailed information about a specific location
   * @param placeId Geoapify place ID
   * @returns Promise with detailed location information
   */
  async getLocationDetails(placeId: string): Promise<GeoapifyLocation | null> {
    try {
      const response = await axios.get<GeoapifyResponse>(`${this.baseUrl}/details`, {
        params: {
          id: placeId,
          apiKey: this.apiKey
        },
        timeout: 5000
      });

      return response.data.features.length > 0 ? response.data.features[0] : null;
    } catch (error) {
      console.error('Geoapify details API error:', error);
      return null;
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
      const response = await axios.get<GeoapifyResponse>(`${this.baseUrl}/reverse`, {
        params: {
          lat,
          lon: lng,
          apiKey: this.apiKey
        },
        timeout: 5000
      });

      if (response.data.features.length > 0) {
        const feature = response.data.features[0];
        return {
          id: feature.properties.place_id || `${Date.now()}`,
          formatted: feature.properties.formatted,
          address_line1: feature.properties.address_line1,
          address_line2: feature.properties.address_line2,
          coordinates: {
            lat: feature.properties.lat,
            lng: feature.properties.lon
          },
          place_id: feature.properties.place_id
        };
      }

      return null;
    } catch (error) {
      console.error('Geoapify reverse geocode error:', error);
      return null;
    }
  }
}

export const geoapifyService = new GeoapifyService();
export default geoapifyService;
