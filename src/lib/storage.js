const KEYS = {
  USERS: 'geoattend_users',
  CURRENT_USER: 'geoattend_current_user',
  GEOFENCES: 'geoattend_geofences',
  ATTENDANCE: 'geoattend_attendance',
  ANOMALIES: 'geoattend_anomalies',
};

function get(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Users
export const getUsers = () => get(KEYS.USERS, []);
export const saveUsers = (users) => set(KEYS.USERS, users);
export const getCurrentUser = () => get(KEYS.CURRENT_USER, null);
export const setCurrentUser = (user) => set(KEYS.CURRENT_USER, user);

export const registerUser = (user, password) => {
  const users = getUsers();
  if (users.find((u) => u.email === user.email)) {
    throw new Error('Email already registered');
  }
  const newUser = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  // Store password hash (simplified - in production use bcrypt)
  const passwords = get('geoattend_passwords', {});
  passwords[newUser.id] = btoa(password);
  set('geoattend_passwords', passwords);
  return newUser;
};

export const loginUser = (email, password) => {
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error('User not found');
  const passwords = get('geoattend_passwords', {});
  if (passwords[user.id] !== btoa(password)) throw new Error('Invalid password');
  setCurrentUser(user);
  return user;
};

export const logoutUser = () => setCurrentUser(null);

// Geofences
export const getGeofences = () => get(KEYS.GEOFENCES, []);
export const saveGeofences = (geofences) => set(KEYS.GEOFENCES, geofences);

export const addGeofence = (geofence) => {
  const geofences = getGeofences();
  const newGeofence = {
    ...geofence,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  geofences.push(newGeofence);
  saveGeofences(geofences);
  return newGeofence;
};

export const updateGeofence = (id, updates) => {
  const geofences = getGeofences();
  const idx = geofences.findIndex((g) => g.id === id);
  if (idx !== -1) {
    geofences[idx] = { ...geofences[idx], ...updates };
    saveGeofences(geofences);
  }
};

export const deleteGeofence = (id) => {
  saveGeofences(getGeofences().filter((g) => g.id !== id));
};

// Attendance
export const getAttendanceRecords = () => get(KEYS.ATTENDANCE, []);
export const saveAttendanceRecords = (records) => set(KEYS.ATTENDANCE, records);

export const addAttendanceRecord = (record) => {
  const records = getAttendanceRecords();
  const newRecord = { ...record, id: crypto.randomUUID() };
  records.push(newRecord);
  saveAttendanceRecords(records);
  return newRecord;
};

export const updateAttendanceRecord = (id, updates) => {
  const records = getAttendanceRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...updates };
    saveAttendanceRecords(records);
  }
};

// Anomalies
export const getAnomalies = () => get(KEYS.ANOMALIES, []);
export const addAnomaly = (anomaly) => {
  const anomalies = getAnomalies();
  const newAnomaly = { ...anomaly, id: crypto.randomUUID() };
  anomalies.push(newAnomaly);
  set(KEYS.ANOMALIES, anomalies);
  return newAnomaly;
};

// Seed default admin
export const seedDefaultAdmin = () => {
  const users = getUsers();
  if (!users.find((u) => u.role === 'admin')) {
    registerUser(
      { email: 'admin@geoattend.com', name: 'System Admin', role: 'admin', department: 'Administration' },
      'admin123'
    );
  }
};
