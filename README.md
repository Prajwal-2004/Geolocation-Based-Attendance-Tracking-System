# GeoAttend — Geolocation-Based Attendance Tracking System

A mobile-first attendance tracking application that uses real-time GPS coordinates, polygon-based geofencing, and **OTP-based identity verification** to prevent proxy attendance. Built with React, TypeScript, and Tailwind CSS.

---

## 📱 Features

- **Role-based authentication** (Student, Faculty, Admin)
- **GPS-based check-in/check-out** with real-time location capture
- **4-corner polygon geofencing** — admin defines classroom boundaries using 4 coordinate points
- **Haversine formula** for distance calculation and reporting
- **OTP identity verification** — 6-digit code sent to registered phone number after geofence validation
- **Phone number registration** — required for OTP verification
- **Course & Semester selection** — students and faculty choose from 10 engineering branches and semesters 1–8
- **Class Teacher system** — faculty can be designated as class teacher for a specific semester+course, gaining access to all students' attendance across every subject
- **Teacher assignment per geofence** — admin assigns a teacher and their subject to each zone
- **Teacher Dashboard** — faculty view their assigned classes, attendance stats, and (if class teacher) a full cross-subject view of their class students
- **Anti-spoofing measures** — timestamp consistency checks, GPS accuracy validation
- **Admin dashboard** — geofence configuration, attendance records, anomaly reports, user management
- **5-minute check-in buffer** — students must check in within 5 minutes of class start time
- **Duplicate prevention** — prevents multiple active check-ins
- **Anomaly logging** — flags suspicious activity for admin review
- **Lovable Cloud backend** — database, authentication, edge functions

---

## 🔐 Identity Verification System

### How It Works

When a student is **inside the geofence** and clicks "Check In", a **verification popup** appears:

#### OTP via SMS
- Sends a **6-digit one-time password** to the student's registered phone number
- Phone number is **required during registration** and verified via OTP at signup
- *Currently in demo mode* — OTP is logged to browser console (production would use an SMS provider via Lovable Cloud edge functions)

---

## 🎓 Class Teacher Feature

Faculty members can optionally be designated as a **Class Teacher** during registration:

- **Not a class teacher (NA)**: They only see attendance for their own assigned geofence zones (subject-specific)
- **Class teacher of Sem X, Course Y**: They get an additional **"My Class"** tab showing:
  - All students enrolled in that semester + course
  - Every attendance record for those students across **all subjects and teachers**
  - Per-student breakdown with recent check-in history

This enables class teachers to monitor overall student engagement, not just their own subject.

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
| `src/types/index.ts` | TypeScript type definitions for `User` (with `phoneNumber`, `course`, `semester`, `classTeacherOf`), `Geofence` (with `PolygonPoint[]` corners, teacher assignment), `AttendanceRecord`, `LocationData`, and `AnomalyLog`. Also exports `ENGINEERING_COURSES` and `SEMESTERS` constants. |

### Core Logic (Business Logic Layer)

| File | Purpose |
|------|---------|
| `src/lib/storage.ts` | **Data Persistence Module** — CRUD operations for users, geofences, attendance records, and anomalies via localStorage. Handles registration with phone number, course, and semester fields. |
| `src/lib/geofence.ts` | **Location & Geofence Validation Module** — Haversine formula, polygon centroid calculation, `validateLocation()`, `validateTimestamp()` and `checkGpsAccuracy()` for anti-spoofing, and `getCurrentLocation()` with watchPosition. |

### Authentication

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | React context providing `login()`, `register()`, `logout()`, and current `user` state. Seeds default admin on mount. |

### Components

| File | Purpose |
|------|---------|
| `src/components/VerificationDialog.tsx` | **Identity Verification Popup** — Appears after geofence validation passes. Sends OTP to student's registered phone and verifies the code before completing check-in. |

### Pages (UI Layer)

| File | Purpose |
|------|---------|
| `src/pages/Login.tsx` | Login screen with email/password form, demo admin credentials. |
| `src/pages/Register.tsx` | Registration with role selection (Student/Faculty), **course & semester dropdowns** (10 engineering branches, semesters 1–8), student ID, phone number, subject (faculty), and **class teacher assignment** (faculty). |
| `src/pages/Dashboard.tsx` | Student/Faculty dashboard. Full check-in flow: location capture → anti-spoofing → geofence validation → **OTP verification** → attendance record. Class dropdown shows teacher name and subject. |
| `src/pages/TeacherDashboard.tsx` | Faculty dashboard: assigned classes stats, attendance records, and **class teacher tab** (cross-subject student attendance view). |
| `src/pages/AdminDashboard.tsx` | Admin dashboard: geofence management with teacher/subject assignment, attendance records, anomaly reports, user list. |
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

### 5-Minute Check-In Buffer

- Admin sets a **class start time** per geofence zone
- Students must check in between the start time and **5 minutes after**
- Early or late check-ins are automatically rejected with a descriptive message

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
│   API)           │     │   Accuracy checks) │     │  (OTP via SMS)   │
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
  (shows Zone — Teacher Name (Subject) · Time)
        │
        ▼
  Clicks "Check In"
        │
        ▼
  Anti-spoofing checks
  (timestamp drift <30s, accuracy >1m)
        │
        ▼
  5-minute buffer check
  (device time vs class start time)
        │
        ▼
  Geofence validation
  (Haversine distance from polygon centroid)
        │
    ┌───┴───┐
    YES     NO
    │       │
    ▼       ▼
  OTP     Rejected
  Verification  (anomaly logged)
  Popup
    │
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

## 📱 Running as a Native Android App (Capacitor)

This project is configured with **Capacitor** so it can be deployed as a real native Android (or iOS) app, with full access to device features like GPS, camera, and notifications.

### Prerequisites for Android
- **Node.js** (v18+) and **npm** — [Download](https://nodejs.org/)
- **Android Studio** — [Download](https://developer.android.com/studio) (includes Android SDK & emulator)
- **Java JDK 17+** — usually bundled with Android Studio
- A physical Android device (with USB debugging enabled) **or** an Android emulator from Android Studio

### Step-by-Step Android Setup

```bash
# 1. Export the project to your own GitHub repository
#    (use the "Export to GitHub" button in Lovable, then clone it locally)
git clone <YOUR_GITHUB_REPO_URL>
cd <YOUR_PROJECT_NAME>

# 2. Install all dependencies
npm install

# 3. Add the Android native platform
npx cap add android

# 4. Update native dependencies for Android
npx cap update android

# 5. Build the web app
npm run build

# 6. Sync the built web assets into the Android project
npx cap sync

# 7. Run the app on a connected device or emulator
npx cap run android
```

### Re-syncing After Code Changes

Whenever you `git pull` new changes (or modify any web code), run:

```bash
npm run build
npx cap sync
```

Then re-run `npx cap run android` to launch the updated app.

### iOS (Optional, requires macOS)

```bash
npx cap add ios
npx cap update ios
npm run build
npx cap sync
npx cap run ios
```
> ⚠️ iOS development requires a **Mac with Xcode** installed.

### Helpful Links
- 📘 [Lovable Mobile Development Blog Post](https://lovable.dev/blogs/TODO)
- 📗 [Capacitor Official Docs](https://capacitorjs.com/docs)
- 📙 [Android Studio Setup Guide](https://developer.android.com/studio/install)
- 📕 [Capacitor Android Guide](https://capacitorjs.com/docs/android)

---

## 🔐 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@geoattend.com | admin123 |

Students and faculty can register via the registration page (phone number, course, and semester required).

---

## 📋 Technologies Used

- **React 18** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible component library
- **Vite** — Build tool with HMR
- **Lovable Cloud** — Backend database, auth, and edge functions
- **Geolocation API** — GPS coordinate capture

---

## 📄 License

This project is for educational purposes as part of a Software Engineering course project.
