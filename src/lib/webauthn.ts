/**
 * WebAuthn (FIDO2) helpers for fingerprint/biometric verification.
 * Each user is limited to ONE credential to prevent proxy attendance.
 */

import { getUsers, saveUsers } from './storage';

const RP_NAME = 'GeoAttend';
const RP_ID = window.location.hostname;

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Check if WebAuthn is supported on this device.
 */
export function isWebAuthnSupported(): boolean {
  return !!window.PublicKeyCredential;
}

/**
 * Register a new biometric credential for a user.
 * Throws if user already has a credential registered.
 */
export async function registerBiometric(userId: string, userName: string): Promise<string> {
  if (!isWebAuthnSupported()) {
    throw new Error('Biometric authentication is not supported on this device.');
  }

  // Check if user already has a credential
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user?.webauthnCredentialId) {
    throw new Error('You already have a fingerprint registered. Only one is allowed.');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: RP_NAME, id: RP_ID },
    user: {
      id: new TextEncoder().encode(userId),
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Use device built-in (fingerprint/Face ID)
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Biometric registration was cancelled.');
  }

  const credentialId = bufferToBase64(credential.rawId);

  // Save credential ID to user — limit enforced: only one per user
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx].webauthnCredentialId = credentialId;
    saveUsers(users);
  }

  return credentialId;
}

/**
 * Verify a user's biometric credential (fingerprint/Face ID).
 * Returns true if verification succeeds.
 */
export async function verifyBiometric(userId: string): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    throw new Error('Biometric authentication is not supported on this device.');
  }

  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user?.webauthnCredentialId) {
    throw new Error('No fingerprint registered. Please register your fingerprint first.');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [
      {
        id: base64ToBuffer(user.webauthnCredentialId),
        type: 'public-key',
        transports: ['internal'],
      },
    ],
    userVerification: 'required',
    timeout: 60000,
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    return !!assertion;
  } catch {
    return false;
  }
}

/**
 * Check if a user has a biometric credential registered.
 */
export function hasBiometricRegistered(userId: string): boolean {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  return !!user?.webauthnCredentialId;
}
