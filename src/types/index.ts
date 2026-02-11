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

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
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
