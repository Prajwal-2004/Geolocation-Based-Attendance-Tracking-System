import { LocationData, Geofence, PolygonPoint } from '@/types';

/**
 * Haversine formula: calculates the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Ray Casting Algorithm: determines if a point lies inside a polygon.
 * 
 * How it works:
 * 1. Cast an imaginary horizontal ray from the point to the right.
 * 2. Count how many edges of the polygon the ray crosses.
 * 3. If the count is odd, the point is inside; if even, it's outside.
 * 
 * This works because entering a polygon always adds one crossing,
 * and exiting adds another. So inside = odd crossings.
 */
export function pointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: PolygonPoint[]
): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].latitude, yi = polygon[i].longitude;
    const xj = polygon[j].latitude, yj = polygon[j].longitude;

    // Check if the ray crosses this edge
    const intersect =
      yi > point.longitude !== yj > point.longitude &&
      point.latitude < ((xj - xi) * (point.longitude - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates the centroid (geometric center) of a polygon.
 */
export function getPolygonCenter(corners: PolygonPoint[]): { latitude: number; longitude: number } {
  const lat = corners.reduce((sum, c) => sum + c.latitude, 0) / corners.length;
  const lon = corners.reduce((sum, c) => sum + c.longitude, 0) / corners.length;
  return { latitude: lat, longitude: lon };
}

/**
 * Validates whether a user's location falls within a geofence boundary.
 * Supports both polygon (4-corner) and legacy circular geofences.
 */
export function validateLocation(
  location: LocationData,
  geofence: Geofence
): { isValid: boolean; distance: number } {
  if (geofence.corners && geofence.corners.length >= 3) {
    // Polygon-based validation using Ray Casting
    const isInside = pointInPolygon(
      { latitude: location.latitude, longitude: location.longitude },
      geofence.corners
    );
    const center = getPolygonCenter(geofence.corners);
    const distance = haversineDistance(
      location.latitude, location.longitude,
      center.latitude, center.longitude
    );
    return { isValid: isInside, distance: Math.round(distance) };
  }

  // Legacy circular geofence fallback
  const distance = haversineDistance(
    location.latitude, location.longitude,
    geofence.latitude, geofence.longitude
  );
  return {
    isValid: distance <= geofence.radiusMeters,
    distance: Math.round(distance),
  };
}

/**
 * Anti-spoofing: checks timestamp consistency.
 * Rejects if the timestamp is more than 30 seconds off from server time.
 */
export function validateTimestamp(clientTimestamp: number): boolean {
  const serverTime = Date.now();
  const drift = Math.abs(serverTime - clientTimestamp);
  return drift < 30000; // 30 seconds tolerance
}

/**
 * Anti-spoofing: checks if GPS accuracy is suspiciously perfect.
 * Mock GPS tools often report accuracy of exactly 0 or very high precision.
 */
export function checkGpsAccuracy(accuracy: number): boolean {
  return accuracy > 1;
}

/**
 * Gets the user's current location using the browser Geolocation API.
 */
export function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this device'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please enable GPS.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location unavailable. Please check GPS settings.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out. Please try again.'));
            break;
          default:
            reject(new Error('Failed to get location.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
