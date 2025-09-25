import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Location, Truck } from '../types';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  locations: Location[];
  trucks?: Truck[];
  center?: [number, number];
  zoom?: number;
  showRoute?: boolean;
  showTruckIcons?: boolean;
  routePoints?: {start: [number, number], end: [number, number]}[];
  onLocationClick?: (location: Location) => void;
  className?: string;
}

const Map: React.FC<MapProps> = ({
  locations,
  trucks = [],
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 10,
  showRoute = false,
  showTruckIcons = false,
  routePoints = [],
  onLocationClick,
  className = 'h-96',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom]);


  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Clear route line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // Add markers for locations
    locations.forEach((location, index) => {
      const isLatest = index === 0;
      const lat = parseFloat(location.latitude);
      const lng = parseFloat(location.longitude);

      if (isNaN(lat) || isNaN(lng)) return;

      // Use truck icon for current locations or simple dots for historical data
      let icon;
      if (showTruckIcons && isLatest) {
        // Truck icon for current driver location
        icon = L.divIcon({
          html: `
            <div style="
              font-size: 20px; 
              color: #1e40af; 
              text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            ">🚛</div>
          `,
          className: 'truck-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
      } else {
        // Simple dot for historical locations
        icon = L.divIcon({
          html: `<div style="background-color: ${isLatest ? '#ef4444' : '#3b82f6'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          className: 'custom-div-icon',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
      }

      const marker = L.marker([lat, lng], { icon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-size: 12px;">
            <strong>${location.truck_details?.truck_number || 'Truck'}</strong><br/>
            <strong>Driver:</strong> ${location.driver_details?.username || 'Unknown'}<br/>
            <strong>Speed:</strong> ${location.speed} km/h<br/>
            <strong>Time:</strong> ${new Date(location.timestamp).toLocaleString()}
          </div>
        `);

      if (onLocationClick) {
        marker.on('click', () => onLocationClick(location));
      }

      markersRef.current.push(marker);
    });

    // Add route point markers (start and end locations)
    routePoints.forEach((route, routeIndex) => {
      // Start location marker (green pin)
      const startIcon = L.divIcon({
        html: `
          <div style="
            font-size: 24px; 
            color: #10b981; 
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          ">📍</div>
        `,
        className: 'start-pin-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const startMarker = L.marker(route.start, { icon: startIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-size: 12px;">
            <strong>🚀 Pickup Location</strong><br/>
            <strong>Route:</strong> ${routeIndex + 1}<br/>
            <strong>Coordinates:</strong> ${route.start[0].toFixed(6)}, ${route.start[1].toFixed(6)}
          </div>
        `);
      markersRef.current.push(startMarker);

      // End location marker (red pin)
      const endIcon = L.divIcon({
        html: `
          <div style="
            font-size: 24px; 
            color: #ef4444; 
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          ">📍</div>
        `,
        className: 'end-pin-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const endMarker = L.marker(route.end, { icon: endIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-size: 12px;">
            <strong>🏁 Delivery Location</strong><br/>
            <strong>Route:</strong> ${routeIndex + 1}<br/>
            <strong>Coordinates:</strong> ${route.end[0].toFixed(6)}, ${route.end[1].toFixed(6)}
          </div>
        `);
      markersRef.current.push(endMarker);

      // Draw route line between start and end
      const routeLine = L.polyline([route.start, route.end], {
        color: '#8b5cf6',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5',
      }).addTo(mapInstanceRef.current!);
      
      // Store route line for cleanup (we'll modify the ref structure)
      if (!routeLineRef.current) {
        routeLineRef.current = routeLine;
      }
    });

    // Draw route line if requested
    if (showRoute && locations.length > 1) {
      const routePoints: L.LatLngExpression[] = locations
        .map(location => {
          const lat = parseFloat(location.latitude);
          const lng = parseFloat(location.longitude);
          return isNaN(lat) || isNaN(lng) ? null : [lat, lng] as L.LatLngExpression;
        })
        .filter((point): point is L.LatLngExpression => point !== null);

      if (routePoints.length > 1) {
        routeLineRef.current = L.polyline(routePoints, {
          color: 'blue',
          weight: 3,
          opacity: 0.7,
        }).addTo(mapInstanceRef.current);
      }
    }

    // Fit map to show all markers or show default view
    if (locations.length > 0) {
      const validCoords = locations
        .map(location => {
          const lat = parseFloat(location.latitude);
          const lng = parseFloat(location.longitude);
          return isNaN(lat) || isNaN(lng) ? null : [lat, lng] as L.LatLngExpression;
        })
        .filter((coord): coord is L.LatLngExpression => coord !== null);

      if (validCoords.length === 1) {
        mapInstanceRef.current.setView(validCoords[0], 15);
      } else if (validCoords.length > 1) {
        const group = L.featureGroup(markersRef.current);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    } else {
      // Show default center if no locations
      mapInstanceRef.current.setView(center, zoom);
    }
    
    // Force map resize after adding markers
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);
  }, [locations, showRoute, onLocationClick, center, zoom]);

  // Add resize effect when component mounts
  useEffect(() => {
    const resizeMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    // Trigger resize after a short delay
    const timeoutId = setTimeout(resizeMap, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef} 
        className={className}
        style={{ minHeight: '400px', width: '100%' }}
      />
      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2">🗺️</div>
            <div className="text-lg font-medium">No location data available</div>
            <div className="text-sm">Start location sharing to see your position on the map</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
