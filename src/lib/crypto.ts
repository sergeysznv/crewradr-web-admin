/**
 * Zero-Knowledge Client-Side Cryptography for CrewRadr Web Admin.
 *
 * Implements AES-256-GCM decryption matching Dart's Cryptography package:
 * Payload format: base64url(nonce[12] || ciphertext || mac[16])
 * Key format: 32-byte secret key (base64url or hex)
 *
 * All operations execute in the client's browser using the W3C Web Crypto API.
 * The decryption key is kept in browser memory/sessionStorage and never transmitted to the server.
 */

export interface DecryptedLocation {
  latitude: number;
  longitude: number;
  speed?: number | null;
  activity?: string | null;
  timestamp?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Decodes a base64 or base64url string to Uint8Array.
 */
export function base64UrlToBytes(base64UrlStr: string): Uint8Array {
  let base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a Uint8Array to a base64url string.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Normalizes a crew key from base64url, base64, or 64-char hex into a 32-byte raw Uint8Array.
 */
export function parseCrewKey(keyStr: string): Uint8Array | null {
  const trimmed = keyStr.trim();
  if (!trimmed) return null;

  // 64-character hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(trimmed.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  // Base64 or Base64url (approx 43-44 chars for 32 bytes)
  try {
    const bytes = base64UrlToBytes(trimmed);
    if (bytes.length === 32) return bytes;
  } catch (_) {
    // ignore
  }

  return null;
}

const AES_GCM_NONCE_LENGTH = 12;
const AES_GCM_TAG_LENGTH = 16;

/**
 * Decrypts a base64url encrypted payload using the provided 32-byte crew key.
 */
export async function decryptPayload(
  encryptedPayload: string,
  crewKeyStr: string
): Promise<DecryptedLocation | null> {
  try {
    const keyBytes = parseCrewKey(crewKeyStr);
    if (!keyBytes) return null;

    const payloadBytes = base64UrlToBytes(encryptedPayload);
    if (payloadBytes.length < AES_GCM_NONCE_LENGTH + AES_GCM_TAG_LENGTH + 1) {
      return null;
    }

    const nonce = payloadBytes.slice(0, AES_GCM_NONCE_LENGTH);
    // In Web Crypto API, AES-GCM decrypt expects ciphertext || tag together
    const ciphertextAndTag = payloadBytes.slice(AES_GCM_NONCE_LENGTH);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce as unknown as BufferSource,
        tagLength: 128,
      },
      cryptoKey,
      ciphertextAndTag as unknown as BufferSource
    );

    const text = new TextDecoder().decode(decryptedBuffer);
    const parsed = JSON.parse(text);

    // Handle batch payloads (JSON arrays of location pings)
    const item = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
    if (!item) return null;

    const lat = item.latitude ?? item.lat;
    const lng = item.longitude ?? item.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return null;
    }

    return {
      latitude: lat,
      longitude: lng,
      speed: item.speed ?? item.speed_ms ?? null,
      activity: item.activity ?? item.event_type ?? null,
      timestamp: item.timestamp ?? item.created_at ?? null,
      metadata: item.metadata ?? null,
    };
  } catch (_) {
    return null;
  }
}

/**
 * Encrypts a payload with a crew key (matches Dart VaultService format).
 */
export async function encryptPayload(
  data: Record<string, unknown> | unknown[],
  crewKeyStr: string
): Promise<string | null> {
  try {
    const keyBytes = parseCrewKey(crewKeyStr);
    if (!keyBytes) return null;

    const plaintext = JSON.stringify(data);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    const nonce = window.crypto.getRandomValues(new Uint8Array(AES_GCM_NONCE_LENGTH));

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const ciphertextBuffer = await window.crypto.subtle.decrypt
      ? await window.crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: nonce as unknown as BufferSource,
            tagLength: 128,
          },
          cryptoKey,
          plaintextBytes as unknown as BufferSource
        )
      : null;

    if (!ciphertextBuffer) return null;

    const ciphertextAndTag = new Uint8Array(ciphertextBuffer);
    const combined = new Uint8Array(nonce.length + ciphertextAndTag.length);
    combined.set(nonce, 0);
    combined.set(ciphertextAndTag, nonce.length);

    return bytesToBase64Url(combined);
  } catch (_) {
    return null;
  }
}
