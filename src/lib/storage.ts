import { User, Geofence, AttendanceRecord, AnomalyLog } from '@/types';

const KEYS = {
  USERS: 'geoattend_users',
  CURRENT_USER: 'geoattend_current_user',
  GEOFENCES: 'geoattend_geofences',
  ATTENDANCE: 'geoattend_attendance',
  ANOMALIES: 'geoattend_anomalies',
};

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Users
export const getUsers = (): User[] => get(KEYS.USERS, []);
export const saveUsers = (users: User[]) => set(KEYS.USERS, users);
export const getCurrentUser = (): User | null => get(KEYS.CURRENT_USER, null);
export const setCurrentUser = (user: User | null) => set(KEYS.CURRENT_USER, user);

export const registerUser = (user: Omit<User, 'id' | 'createdAt'>, password: string): User => {
  const users = getUsers();
  if (users.find(u => u.email === user.email)) {
    throw new Error('Email already registered');
  }
  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  // Store password hash (simplified - in production use bcrypt)
  const passwords = get<Record<string, string>>('geoattend_passwords', {});
  passwords[newUser.id] = btoa(password);
  set('geoattend_passwords', passwords);
  return newUser;
};

export const loginUser = (email: string, password: string): User => {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) throw new Error('User not found');
  const passwords = get<Record<string, string>>('geoattend_passwords', {});
  if (passwords[user.id] !== btoa(password)) throw new Error('Invalid password');
  setCurrentUser(user);
  return user;
};

export const logoutUser = () => setCurrentUser(null);

// Geofences
export const getGeofences = (): Geofence[] => get(KEYS.GEOFENCES, []);
export const saveGeofences = (geofences: Geofence[]) => set(KEYS.GEOFENCES, geofences);

export const addGeofence = (geofence: Omit<Geofence, 'id' | 'createdAt'>): Geofence => {
  const geofences = getGeofences();
  const newGeofence: Geofence = {
    ...geofence,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  geofences.push(newGeofence);
  saveGeofences(geofences);
  return newGeofence;
};

export const updateGeofence = (id: string, updates: Partial<Geofence>) => {
  const geofences = getGeofences();
  const idx = geofences.findIndex(g => g.id === id);
  if (idx !== -1) {
    geofences[idx] = { ...geofences[idx], ...updates };
    saveGeofences(geofences);
  }
};

export const deleteGeofence = (id: string) => {
  saveGeofences(getGeofences().filter(g => g.id !== id));
};

// Attendance
export const getAttendanceRecords = (): AttendanceRecord[] => get(KEYS.ATTENDANCE, []);
export const saveAttendanceRecords = (records: AttendanceRecord[]) => set(KEYS.ATTENDANCE, records);

export const addAttendanceRecord = (record: Omit<AttendanceRecord, 'id'>): AttendanceRecord => {
  const records = getAttendanceRecords();
  const newRecord: AttendanceRecord = { ...record, id: crypto.randomUUID() };
  records.push(newRecord);
  saveAttendanceRecords(records);
  return newRecord;
};

export const updateAttendanceRecord = (id: string, updates: Partial<AttendanceRecord>) => {
  const records = getAttendanceRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...updates };
    saveAttendanceRecords(records);
  }
};

// Anomalies
export const getAnomalies = (): AnomalyLog[] => get(KEYS.ANOMALIES, []);
export const addAnomaly = (anomaly: Omit<AnomalyLog, 'id'>): AnomalyLog => {
  const anomalies = getAnomalies();
  const newAnomaly: AnomalyLog = { ...anomaly, id: crypto.randomUUID() };
  anomalies.push(newAnomaly);
  set(KEYS.ANOMALIES, anomalies);
  return newAnomaly;
};

// Seed default admin
export const seedDefaultAdmin = () => {
  const users = getUsers();
  if (!users.find(u => u.role === 'admin')) {
    registerUser({ email: 'admin@geoattend.com', name: 'System Admin', role: 'admin' }, 'admin123');
  }
};
