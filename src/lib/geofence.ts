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
 * Calculates the centroid (geometric center) of a polygon.
 */
export function getPolygonCenter(corners: PolygonPoint[]): { latitude: number; longitude: number } {
  const lat = corners.reduce((sum, c) => sum + c.latitude, 0) / corners.length;
  const lon = corners.reduce((sum, c) => sum + c.longitude, 0) / corners.length;
  return { latitude: lat, longitude: lon };
}

/**
 * Calculates the maximum Haversine distance from the centroid to any corner.
 * This is used as the effective radius of a polygon geofence.
 */
export function getMaxCornerDistance(corners: PolygonPoint[]): number {
  const center = getPolygonCenter(corners);
  let maxDist = 0;
  for (const corner of corners) {
    const d = haversineDistance(center.latitude, center.longitude, corner.latitude, corner.longitude);
    if (d > maxDist) maxDist = d;
  }
  return maxDist;
}

/**
 * Validates whether a user's location falls within a geofence boundary.
 * For polygon geofences (4 corners): calculates centroid, then checks if
 * the user's Haversine distance from centroid is within the max corner distance.
 * For legacy circular geofences: checks distance against radiusMeters.
 */
export function validateLocation(
  location: LocationData,
  geofence: Geofence
): { isValid: boolean; distance: number; maxDistance: number } {
  if (geofence.corners && geofence.corners.length >= 3) {
    const center = getPolygonCenter(geofence.corners);
    const distance = haversineDistance(
      location.latitude, location.longitude,
      center.latitude, center.longitude
    );
    const maxDistance = getMaxCornerDistance(geofence.corners);
    return {
      isValid: distance <= maxDistance,
      distance: Math.round(distance),
      maxDistance: Math.round(maxDistance),
    };
  }

  // Legacy circular geofence fallback
  const distance = haversineDistance(
    location.latitude, location.longitude,
    geofence.latitude, geofence.longitude
  );
  return {
    isValid: distance <= geofence.radiusMeters,
    distance: Math.round(distance),
    maxDistance: geofence.radiusMeters,
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
