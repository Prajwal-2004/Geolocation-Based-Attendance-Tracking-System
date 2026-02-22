# GeoAttend — Geolocation-Based Attendance Tracking System

A mobile-first attendance tracking application that uses real-time GPS coordinates and radius-based geofencing to verify user presence before logging attendance. Built with React (JSX), JavaScript, and Tailwind CSS, designed to run as a native mobile app via Capacitor.

---

## 📱 Features

- **Role-based authentication** (Student, Faculty, Admin)
- **GPS-based check-in/check-out** with real-time location capture
- **Radius-based geofencing** — admin defines a center point and radius in meters
- **Haversine formula** for accurate great-circle distance calculation
- **Anti-spoofing measures** — timestamp consistency checks, GPS accuracy validation
- **Admin dashboard** — geofence configuration, attendance records, anomaly reports, user management
- **Two-step check-in** — capture location first, then verify and check in
- **Duplicate prevention** — prevents multiple active check-ins
- **Anomaly logging** — flags suspicious activity for admin review
- **Offline-capable** — all data stored locally via localStorage

---

## 🗂️ File Structure & Explanation

### Core Application Files

| File | Purpose |
|------|---------|
| `src/main.jsx` | Entry point. Mounts the React app to the DOM. |
| `src/App.jsx` | Root component. Defines routes, wraps app with AuthProvider, QueryClient, and UI providers. Contains `ProtectedRoute` and `AuthRoute` logic for role-based access control. |
| `index.html` | HTML shell with mobile-optimized viewport meta tags and PWA-ready attributes. |

### Core Logic (Business Logic Layer)

| File | Purpose |
|------|---------|
| `src/lib/storage.js` | **Backend & Database Module** — Manages all data persistence via localStorage. Provides CRUD operations for users, geofences, attendance records, and anomalies. Handles user registration and login with base64 password encoding. Seeds a default admin account on first run. |
| `src/lib/geofence.js` | **Location & Geofence Validation Module** — Implements the **Haversine formula** for distance calculation, `validateLocation()` for radius-based geofence checking, `validateTimestamp()` and `checkGpsAccuracy()` for anti-spoofing, and `getCurrentLocation()` wrapper for the browser Geolocation API. |

### Authentication

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.jsx` | **User Authentication Module** — React context providing `login()`, `register()`, `logout()`, and current `user` state throughout the app. Seeds the default admin on mount. |

### Pages (UI Layer)

| File | Purpose |
|------|---------|
| `src/pages/Index.jsx` | Landing page with GeoAttend logo, hamburger menu navigation, and feature cards. |
| `src/pages/Login.jsx` | Login screen with email/password form, show/hide password toggle, demo admin credentials, and link to registration. |
| `src/pages/Register.jsx` | Registration screen with role selection (Student/Faculty), department, and optional student ID fields. |
| `src/pages/Dashboard.jsx` | **Attendance Management Module** — Student/Faculty dashboard. Two-step check-in flow: capture GPS location first, review coordinates, then check in. Orchestrates: location capture → anti-spoofing validation → geofence matching (Haversine distance vs radius) → record creation or rejection. |
| `src/pages/AdminDashboard.jsx` | **Admin Dashboard & Reporting Module** — Tabbed interface with: (1) Geofence zone management with center point + radius input and GPS capture, (2) Attendance records with distance and status, (3) Anomaly flags with type labels, (4) User list with roles. Shows aggregate statistics at the top. |
| `src/pages/NotFound.jsx` | 404 fallback page. |

### Design System

| File | Purpose |
|------|---------|
| `src/index.css` | CSS design tokens with HSL color variables, custom scrollbar, and font imports. |
| `tailwind.config.ts` | Tailwind configuration extending the base with semantic color tokens, custom animations, and border radius tokens. |

### UI Components (shadcn/ui)

All files in `src/components/ui/` are pre-built, accessible UI primitives from shadcn/ui (Button, Card, Input, Badge, Tabs, Sheet, Select, Switch, Toast, etc.). They use the design tokens from `index.css`. These remain in TypeScript (.tsx) as they are library components.

---

## 🧮 Algorithm Used

### Haversine Formula (Distance Calculation)

The Haversine formula calculates the **great-circle distance** between two points on Earth given their latitude and longitude. Used to determine if a student is within the allowed radius of a geofence center.

**Formula:**
```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlon/2)
c = 2 · atan2(√a, √(1−a))
d = R · c
```

Where **R = 6,371,000 meters** (Earth's radius). The result `d` gives the distance in meters.

**How geofence validation works:**
1. Admin sets a center point (latitude, longitude) and radius in meters for each zone.
2. When a student checks in, the Haversine formula calculates the distance between the student's GPS position and the geofence center.
3. If `distance ≤ radius`, the check-in is **valid**. Otherwise, it is **rejected**.

**Used in:** `src/lib/geofence.js` → `haversineDistance()` and `validateLocation()`

---

### Anti-Spoofing Checks

| Check | Description | File |
|-------|-------------|------|
| Timestamp Consistency | Rejects if client timestamp drifts >30 seconds from server time | `validateTimestamp()` |
| GPS Accuracy | Flags suspiciously perfect accuracy (<1m), common in GPS spoofing tools | `checkGpsAccuracy()` |

---

## 🚀 How to Run This Project

### Prerequisites
- **Node.js** (v18+) and **npm** installed — [Download](https://nodejs.org/)
- **VS Code** — [Download](https://code.visualstudio.com/)
- **Git** — [Download](https://git-scm.com/)

### Step-by-Step: Running in VS Code

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Open in VS Code
code .

# 3. Open a terminal in VS Code (Ctrl + ` or Terminal → New Terminal)

# 4. Install dependencies
npm install

# 5. Start the development server
npm run dev

# 6. Open http://localhost:8080 in your browser
#    The app will auto-reload when you make changes.
```

### VS Code Recommended Extensions
- **ES7+ React/Redux/React-Native snippets** — React code shortcuts
- **Tailwind CSS IntelliSense** — Autocomplete for Tailwind classes
- **Prettier** — Code formatting

---

### Running as a Native Mobile App (Capacitor)

This is the recommended approach to run the app on an actual phone.

#### Prerequisites
- **Android Studio** (for Android) — [Download](https://developer.android.com/studio)
- **Xcode** (for iOS, Mac only) — [Download from Mac App Store](https://apps.apple.com/app/xcode/id497799835)

#### Step-by-Step Setup

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# 2. Initialize Capacitor
npx cap init "GeoAttend" "app.geoattend.mobile" --web-dir dist

# 3. Build the web app
npm run build

# 4. Add mobile platforms
npx cap add android    # For Android
npx cap add ios        # For iOS (Mac only)

# 5. Sync web code to native projects
npx cap sync

# 6. Open in native IDE
npx cap open android   # Opens Android Studio
npx cap open ios       # Opens Xcode
```

#### Running on Android Phone
1. Open the project in **Android Studio** (`npx cap open android`)
2. Connect your Android phone via USB (enable **Developer Mode** + **USB Debugging**)
3. Click the **Run** button (green play icon) and select your device
4. The app will install and launch on your phone
5. Grant **Location permissions** when prompted

#### Running on iOS (iPhone)
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
│  (React + Cap.)  │     │  (Haversine dist.  │     │  (JSON storage)  │
│                  │     │   calculation)     │     │                  │
└──────────────────┘     └───────────────────┘     └──────────────────┘
        │                         │
        ▼                         ▼
┌──────────────────┐     ┌───────────────────┐
│  GPS Location    │     │  Anti-Spoofing     │
│  (Geolocation    │     │  (Timestamp +      │
│   API)           │     │   Accuracy checks) │
└──────────────────┘     └───────────────────┘
```

### Validation Flow

```
Student taps "Capture Location"
        │
        ▼
  GPS coordinates displayed
  (lat, lon, accuracy, time)
        │
        ▼
  Student taps "Check In"
        │
        ▼
  Anti-spoofing checks
  (timestamp + accuracy)
        │
        ▼
  For each active geofence:
    Haversine distance calculation
    (Is student within radius?)
        │
    ┌───┴───┐
    YES     NO
    │       │
    ▼       ▼
  Log      Try next zone
  valid    or reject
  attendance
```

---

## 📋 Technologies Used

- **React 18** — UI framework
- **JavaScript (JSX)** — Application logic (core files)
- **TypeScript (TSX)** — UI component library (shadcn/ui)
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible component library
- **Vite** — Build tool with HMR
- **Capacitor** — Native mobile app wrapper
- **Geolocation API** — GPS coordinate capture
- **localStorage** — Client-side data persistence

---

## 📄 License

This project is for educational purposes as part of a Software Engineering course project.
