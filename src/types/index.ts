export type UserRole = 'student' | 'faculty' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  studentId?: string;
  createdAt: string;
}

export interface PolygonPoint {
  latitude: number;
  longitude: number;
}

export interface Geofence {
  id: string;
  name: string;
  /** @deprecated Use corners instead for polygon-based geofencing */
  latitude: number;
  /** @deprecated Use corners instead for polygon-based geofencing */
  longitude: number;
  /** @deprecated Use corners instead for polygon-based geofencing */
  radiusMeters: number;
  /** Four corner coordinates defining the classroom boundary */
  corners?: PolygonPoint[];
  /** Admin-defined accuracy threshold in meters — student must be within this distance from centroid */
  accuracyMeters?: number;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  geofenceId: string;
  geofenceName: string;
  checkInTime: string;
  checkOutTime?: string;
  latitude: number;
  longitude: number;
  distanceFromCenter: number;
  status: 'valid' | 'rejected' | 'flagged';
  rejectionReason?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface AnomalyLog {
  id: string;
  userId: string;
  userName: string;
  type: 'spoofing' | 'duplicate' | 'out_of_range' | 'timestamp_mismatch';
  description: string;
  timestamp: string;
  locationData?: LocationData;
}
