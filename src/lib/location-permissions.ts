import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type LocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

function mapNativePermissionState(status: { location?: string; coarseLocation?: string }): LocationPermissionState {
  if (status.location === 'granted' || status.coarseLocation === 'granted') {
    return 'granted';
  }

  if (status.location === 'denied' || status.coarseLocation === 'denied') {
    return 'denied';
  }

  return 'prompt';
}

export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    const status = await Geolocation.checkPermissions();
    return mapNativePermissionState(status);
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }

  if (!('permissions' in navigator) || typeof navigator.permissions?.query !== 'function') {
    return 'prompt';
  }

  const result = await navigator.permissions.query({ name: 'geolocation' });
  return result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'prompt';
}

export async function requestLocationPermission(): Promise<LocationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    const status = await Geolocation.requestPermissions({ permissions: ['location'] });
    return mapNativePermissionState(status);
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (error) => resolve(error.code === error.PERMISSION_DENIED ? 'denied' : 'prompt'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}