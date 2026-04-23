/**
 * Simulated OTP "delivery" that feels like a real SMS.
 *
 * Two channels, used together:
 *  1. System notification (Notification API) — looks like a native SMS banner
 *     on desktop and on Android (works inside Capacitor's WebView too).
 *  2. Sonner toast styled like an SMS bubble — always-visible fallback,
 *     no permission required.
 *
 * The OTP itself is generated server-side and returned via the edge function
 * (devOtp field). This module only handles *presenting* it to the user.
 */

import { toast } from "sonner";

const SENDER = "SafeAttend";

/** Ask for notification permission (idempotent). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function showSystemNotification(otp: string, phoneLast4: string): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(SENDER, {
      body: `Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`,
      tag: `safeattend-otp-${phoneLast4}`,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });
    setTimeout(() => n.close(), 30_000);
    return true;
  } catch {
    return false;
  }
}

function showSmsToast(otp: string, phoneLast4: string) {
  toast(`${SENDER} • SMS`, {
    description: `Your code for ***${phoneLast4} is ${otp}\nValid for 5 minutes. Do not share.`,
    duration: 20_000,
    className: "sms-toast",
  });
}

/** Deliver an OTP via system notification + SMS-style toast. */
export async function deliverOtp(otp: string, phoneNumber: string) {
  const last4 = phoneNumber.slice(-4);
  await requestNotificationPermission();
  const notified = showSystemNotification(otp, last4);
  showSmsToast(otp, last4);
  return { notified };
}
