# GeoAttend — Geolocation-Based Attendance Tracking System

A mobile-first attendance tracking application that uses real-time GPS coordinates and geofencing to verify user presence before logging attendance. Built with React, TypeScript, and Tailwind CSS, designed to run as a native mobile app via Capacitor.

---

## 📱 Features

- **Role-based authentication** (Student, Faculty, Admin)
- **GPS-based check-in/check-out** with real-time location capture
- **Geofence validation** using the Haversine formula
- **Anti-spoofing measures** — timestamp consistency checks, GPS accuracy validation
- **Admin dashboard** — geofence configuration, attendance records, anomaly reports, user management
- **Duplicate prevention** — prevents multiple active check-ins
- **Anomaly logging** — flags suspicious activity for admin review
- **Offline-capable** — all data stored locally via localStorage

---

## 🗂️ File Structure & Explanation

### Core Application Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | Entry point. Mounts the React app to the DOM. |
| `src/App.tsx` | Root component. Defines routes, wraps app with AuthProvider, QueryClient, and UI providers. Contains `ProtectedRoute` and `AuthRoute` logic for role-based access control. |
| `index.html` | HTML shell with mobile-optimized viewport meta tags and PWA-ready attributes. |

### Types

| File | Purpose |
|------|---------|
| `src/types/index.ts` | TypeScript type definitions for `User`, `Geofence`, `AttendanceRecord`, `LocationData`, and `AnomalyLog`. Central schema for all data structures. |

### Core Logic (Business Logic Layer)

| File | Purpose |
|------|---------|
| `src/lib/storage.ts` | **Backend & Database Module** — Manages all data persistence via localStorage. Provides CRUD operations for users, geofences, attendance records, and anomalies. Handles user registration and login with base64 password encoding. Seeds a default admin account on first run. |
| `src/lib/geofence.ts` | **Location & Geofence Validation Module** — Implements the **Haversine formula** for calculating distances between GPS coordinates. Contains `validateLocation()` for geofence boundary checking, `validateTimestamp()` and `checkGpsAccuracy()` for anti-spoofing, and `getCurrentLocation()` wrapper for the browser Geolocation API. |

### Authentication

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | **User Authentication Module** — React context providing `login()`, `register()`, `logout()`, and current `user` state throughout the app. Seeds the default admin on mount. |

### Pages (UI Layer)

| File | Purpose |
|------|---------|
| `src/pages/Login.tsx` | Login screen with email/password form, show/hide password toggle, demo admin credentials, and link to registration. |
| `src/pages/Register.tsx` | Registration screen with role selection (Student/Faculty), department, and optional student ID fields. |
| `src/pages/Dashboard.tsx` | **Attendance Management Module** — Student/Faculty dashboard. Shows check-in/check-out button with pulsing animation, current status, today's stats, and recent attendance history. Orchestrates the full check-in flow: location capture → anti-spoofing validation → geofence matching → record creation or rejection. |
| `src/pages/AdminDashboard.tsx` | **Admin Dashboard & Reporting Module** — Tabbed interface with: (1) Geofence zone management (add/delete/toggle), (2) Attendance records with distance and status, (3) Anomaly flags with type labels, (4) User list with roles. Shows aggregate statistics at the top. |
| `src/pages/NotFound.tsx` | 404 fallback page. |

### Design System

| File | Purpose |
|------|---------|
| `src/index.css` | CSS design tokens. Dark navy (`#0F172A`) background with emerald (`#10B981`) primary accent. Defines all HSL color variables, custom scrollbar, and font imports (Inter + JetBrains Mono). |
| `tailwind.config.ts` | Tailwind configuration extending the base with semantic color tokens (background, foreground, primary, card, warning, success, etc.), custom animations (`pulse-ring`, `slide-up`), and border radius tokens. |

### UI Components (shadcn/ui)

All files in `src/components/ui/` are pre-built, accessible UI primitives from shadcn/ui (Button, Card, Input, Badge, Tabs, Sheet, Select, Switch, Toast, etc.). They use the design tokens from `index.css`.

---

## 🚀 How to Run This Project

### Option 1: Run in Browser (Development)

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open http://localhost:8080 in your browser
```

### Option 2: Run as a Native Mobile App (Capacitor)

This is the recommended approach to run the app on an actual phone.

#### Prerequisites
- **Node.js** (v18+) and **npm** installed
- **Android Studio** (for Android) — [Download](https://developer.android.com/studio)
- **Xcode** (for iOS, Mac only) — [Download from Mac App Store](https://apps.apple.com/app/xcode/id497799835)

#### Step-by-Step Setup

```bash
# 1. Clone and install
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install

# 2. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# 3. Initialize Capacitor
npx cap init "GeoAttend" "app.geoattend.mobile" --web-dir dist

# 4. Build the web app
npm run build

# 5. Add mobile platforms
npx cap add android    # For Android
npx cap add ios        # For iOS (Mac only)

# 6. Sync web code to native projects
npx cap sync

# 7. Open in native IDE
npx cap open android   # Opens Android Studio
npx cap open ios       # Opens Xcode
```

#### Running on Android
1. Open the project in **Android Studio** (`npx cap open android`)
2. Connect your Android phone via USB (enable Developer Mode + USB Debugging)
3. Click the **Run** button (green play icon) and select your device
4. The app will install and launch on your phone

#### Running on iOS
1. Open the project in **Xcode** (`npx cap open ios`)
2. Select your development team in **Signing & Capabilities**
3. Connect your iPhone via USB
4. Click the **Run** button and select your device
5. Trust the developer certificate on your phone: Settings → General → VPN & Device Management

#### After Making Code Changes
```bash
npm run build        # Rebuild the web app
npx cap sync         # Sync changes to native project
npx cap run android  # or: npx cap run ios
```

---

## 🔐 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@geoattend.com | admin123 |

Students and faculty can register via the registration page.

---

## ⚙️ System Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Mobile App     │────▶│  Geofence Engine   │────▶│  localStorage    │
│  (React + Cap.)  │     │  (Haversine calc)  │     │  (JSON storage)  │
└──────────────────┘     └───────────────────┘     └──────────────────┘
        │                         │
        ▼                         ▼
┌──────────────────┐     ┌───────────────────┐
│  GPS Location    │     │  Anti-Spoofing     │
│  (Geolocation    │     │  (Timestamp +      │
│   API)           │     │   Accuracy checks) │
└──────────────────┘     └───────────────────┘
```

---

## 🧮 Haversine Formula

The system validates attendance by computing the great-circle distance between the user's GPS coordinates and the geofence center:

```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlon/2)
c = 2 · atan2(√a, √(1−a))
d = R · c
```

Where **R = 6,371,000 meters** (Earth's radius). If **d ≤ geofence radius**, attendance is accepted.

---

## 📋 Technologies Used

- **React 18** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible component library
- **Vite** — Build tool with HMR
- **Capacitor** — Native mobile app wrapper
- **Geolocation API** — GPS coordinate capture
- **localStorage** — Client-side data persistence

---

## 📄 License

This project is for educational purposes as part of a Software Engineering course project.
