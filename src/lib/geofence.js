/**
 * Haversine formula: calculates the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 * Returns distance in meters.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates whether a user's location falls within a geofence boundary.
 * Uses Haversine formula to calculate distance from geofence center
 * and checks if it's within the allowed radius.
 *
 * @param {Object} location - { latitude, longitude, accuracy, timestamp }
 * @param {Object} geofence - { latitude, longitude, radiusMeters, ... }
 * @returns {{ isValid: boolean, distance: number }}
 */
export function validateLocation(location, geofence) {
  const distance = haversineDistance(
    location.latitude,
    location.longitude,
    geofence.latitude,
    geofence.longitude
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
export function validateTimestamp(clientTimestamp) {
  const serverTime = Date.now();
  const drift = Math.abs(serverTime - clientTimestamp);
  return drift < 30000; // 30 seconds tolerance
}

/**
 * Anti-spoofing: checks if GPS accuracy is suspiciously perfect.
 * Mock GPS tools often report accuracy of exactly 0 or very high precision.
 */
export function checkGpsAccuracy(accuracy) {
  return accuracy > 1;
}

/**
 * Gets the user's current location using the browser Geolocation API.
 * @returns {Promise<{ latitude: number, longitude: number, accuracy: number, timestamp: number }>}
 */
export function getCurrentLocation() {
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
