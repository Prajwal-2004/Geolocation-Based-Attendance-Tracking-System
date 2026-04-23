/**
 * Simulated OTP "delivery" that feels like a real SMS.
 *
 * Two channels, used together:
 *  1. System notification (Notification API) — looks like a native SMS banner
 *     on desktop and on Android (works inside Capacitor's WebView too).
 *  2. Sonner toast styled like an iMessage/SMS bubble — always visible
 *     fallback, no permission required.
 *
 * The OTP itself is generated server-side and returned via the edge function
 * (devOtp field). This module only handles *presenting* it to the user.
 */

import { toast } from "sonner";
import React from "react";

const SENDER = "SafeAttend";

/**
 * Ask the user for permission to show system notifications.
 * Safe to call multiple times — browsers cache the answer.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function showSystemNotification(otp: string, phoneLast4: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const n = new Notification(SENDER, {
      body: `Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`,
      tag: `safeattend-otp-${phoneLast4}`,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      silent: false,
    });
    // Auto-dismiss after a while so it doesn't pile up
    setTimeout(() => n.close(), 30_000);
    return true;
  } catch {
    return false;
  }
}

function showSmsToast(otp: string, phoneLast4: string) {
  toast.custom(
    (id) => (
      React.createElement("div", {
        className: "bg-white border border-slate-200 p-4 rounded-2xl shadow-lg flex flex-col gap-1 max-w-sm w-full",
        onClick: () => toast.dismiss(id)
      }, [
        React.createElement("div", { className: "font-semibold text-sm text-slate-900" }, SENDER),
        React.createElement("div", { className: "text-sm text-slate-600" }, `Your code for ***${phoneLast4} is ${otp}. Valid 5 min. Do not share.`)
      ])
    ),
    {
      duration: 15_000,
    }
  );
}

/**
 * Deliver an OTP to the user via system notification + SMS-style toast.
 * Returns which channels actually fired.
 */
export async function deliverOtp(otp: string, phoneNumber: string) {
  const last4 = phoneNumber.slice(-4);

  // Request permission lazily — first call will prompt the user.
  await requestNotificationPermission();

  const notified = showSystemNotification(otp, last4);
  showSmsToast(otp, last4);

  return { notified };
}
