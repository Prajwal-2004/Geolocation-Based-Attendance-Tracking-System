# GeoAttend — Geolocation-Based Attendance Tracking System

A mobile-first attendance tracking application that uses real-time GPS coordinates, polygon-based geofencing, and **multi-factor identity verification** (fingerprint + OTP) to prevent proxy attendance. Built with React, TypeScript, and Tailwind CSS.

---

## 📱 Features

- **Role-based authentication** (Student, Faculty, Admin)
- **GPS-based check-in/check-out** with real-time location capture
- **4-corner polygon geofencing** — admin defines classroom boundaries using 4 coordinate points
- **Haversine formula** for distance calculation and reporting
- **Multi-factor identity verification** — fingerprint (WebAuthn) or OTP after geofence validation
- **One fingerprint limit per student** — prevents proxy attendance via biometric sharing
- **Phone number registration** — required for OTP verification
- **Anti-spoofing measures** — timestamp consistency checks, GPS accuracy validation
- **Admin dashboard** — geofence configuration, attendance records, anomaly reports, user management
- **Duplicate prevention** — prevents multiple active check-ins
- **Anomaly logging** — flags suspicious activity for admin review
- **Lovable Cloud backend** — database, authentication, edge functions

---

## 🔐 Identity Verification System

### How It Works

When a student is **inside the geofence** and clicks "Check In", a **verification popup** appears with two options:

#### Option 1: Fingerprint / Biometric (WebAuthn)
- Uses the device's built-in fingerprint sensor or Face ID via the **Web Authentication API (FIDO2)**
- **Limited to ONE fingerprint per student** — once registered, no additional biometrics can be added
- First-time users are prompted to register their fingerprint; subsequent check-ins verify against it
- Prevents proxy attendance by binding identity to a physical device biometric
- Works entirely client-side via the platform authenticator (TPM/Secure Enclave)

#### Option 2: OTP via SMS
- Sends a **6-digit one-time password** to the student's registered phone number
- Phone number is **required during registration**
- *Currently in demo mode* — OTP is logged to browser console (production would use an SMS provider via Lovable Cloud edge functions)

### Why One Fingerprint?
Students cannot register multiple fingerprints to prevent:
- Sharing biometric credentials with friends for proxy attendance
- Adding a friend's fingerprint to their account
- The credential is bound to the physical device's secure hardware

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
| `src/types/index.ts` | TypeScript type definitions for `User` (with `phoneNumber` and `webauthnCredentialId`), `Geofence` (with `PolygonPoint[]` corners), `AttendanceRecord`, `LocationData`, and `AnomalyLog`. |

### Core Logic (Business Logic Layer)

| File | Purpose |
|------|---------|
| `src/lib/storage.ts` | **Data Persistence Module** — CRUD operations for users, geofences, attendance records, and anomalies via localStorage. Handles registration with phone number field. |
| `src/lib/geofence.ts` | **Location & Geofence Validation Module** — Haversine formula, polygon centroid calculation, `validateLocation()`, `validateTimestamp()` and `checkGpsAccuracy()` for anti-spoofing, and `getCurrentLocation()` with watchPosition. |
| `src/lib/webauthn.ts` | **Biometric Authentication Module** — WebAuthn credential registration (limited to 1 per user), biometric verification, and credential status checks. Uses platform authenticator for fingerprint/Face ID. |

### Authentication

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | React context providing `login()`, `register()`, `logout()`, and current `user` state. Seeds default admin on mount. |

### Components

| File | Purpose |
|------|---------|
| `src/components/VerificationDialog.tsx` | **Identity Verification Popup** — Appears after geofence validation passes. Offers fingerprint (WebAuthn) or OTP verification. Handles first-time fingerprint registration with one-credential limit enforcement. |

### Pages (UI Layer)

| File | Purpose |
|------|---------|
| `src/pages/Login.tsx` | Login screen with email/password form, demo admin credentials. |
| `src/pages/Register.tsx` | Registration with role selection, department, student ID, and **phone number** (required for OTP). |
| `src/pages/Dashboard.tsx` | Student/Faculty dashboard. Full check-in flow: location capture → anti-spoofing → geofence validation → **identity verification** → attendance record. |
| `src/pages/AdminDashboard.tsx` | Admin dashboard: geofence management, attendance records, anomaly reports, user list. |
| `src/pages/NotFound.tsx` | 404 fallback page. |

### Design System

| File | Purpose |
|------|---------|
| `src/index.css` | CSS design tokens with HSL color variables, custom scrollbar, font imports (Inter + JetBrains Mono). |
| `tailwind.config.ts` | Tailwind configuration with semantic color tokens, animations, and border radius tokens. |

---

## 🧮 Algorithms & Security

### Haversine Formula (Distance Calculation)

Calculates the great-circle distance between two points on Earth:
```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlon/2)
c = 2 · atan2(√a, √(1−a))
d = R · c    (R = 6,371,000m)
```

### Anti-Spoofing Checks

| Check | Description | Threshold |
|-------|-------------|-----------|
| Timestamp Consistency | Rejects if client timestamp drifts from device time | >30 seconds |
| GPS Accuracy | Flags suspiciously perfect accuracy (mock GPS tools) | ≤1 meter |

### WebAuthn Security

- Credentials stored in device's Secure Enclave / TPM (cannot be exported)
- Platform authenticator only (no external security keys)
- User verification required (biometric must match)
- One credential per user enforced at application level

---

## ⚙️ System Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Mobile App     │────▶│  Geofence Engine   │────▶│  Lovable Cloud   │
│  (React + TS)    │     │  (Haversine +      │     │  (Database +     │
│                  │     │   Polygon check)   │     │   Auth + Edge)   │
└──────────────────┘     └───────────────────┘     └──────────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  GPS Location    │     │  Anti-Spoofing     │     │  Identity        │
│  (Geolocation    │     │  (Timestamp +      │     │  Verification    │
│   API)           │     │   Accuracy checks) │     │  (WebAuthn + OTP)│
└──────────────────┘     └───────────────────┘     └──────────────────┘
```

### Complete Check-In Flow

```
Student opens app
        │
        ▼
  Clicks "Capture Location"
  (GPS watchPosition — best accuracy within timeout)
        │
        ▼
  Selects class from dropdown
        │
        ▼
  Clicks "Check In"
        │
        ▼
  Anti-spoofing checks
  (timestamp drift <30s, accuracy >1m)
        │
        ▼
  Geofence validation
  (Haversine distance from polygon centroid)
        │
    ┌───┴───┐
    YES     NO
    │       │
    ▼       ▼
  Identity  Rejected
  Verification  (anomaly logged)
  Popup
    │
    ├── Fingerprint (WebAuthn)
    │   └── Verify biometric → ✅ Attendance recorded
    │
    └── OTP (SMS)
        └── Enter 6-digit code → ✅ Attendance recorded
```

---

## 🚀 How to Run This Project

### Prerequisites
- **Node.js** (v18+) and **npm** installed — [Download](https://nodejs.org/)
- **VS Code** — [Download](https://code.visualstudio.com/)
- **Git** — [Download](https://git-scm.com/)

### Step-by-Step

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open http://localhost:8080 in your browser
```

---

## 🔐 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@geoattend.com | admin123 |

Students and faculty can register via the registration page (phone number required).

---

## 📋 Technologies Used

- **React 18** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible component library
- **Vite** — Build tool with HMR
- **Web Authentication API (WebAuthn)** — Fingerprint/biometric verification
- **Lovable Cloud** — Backend database, auth, and edge functions
- **Geolocation API** — GPS coordinate capture

---

## 📄 License

This project is for educational purposes as part of a Software Engineering course project.
