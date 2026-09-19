import { describe, it, expect, beforeAll } from 'vitest';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  parseCrewKey,
  encryptPayload,
  decryptPayload,
} from '../crypto';
import { webcrypto } from 'node:crypto';

describe('Zero-Knowledge WebCrypto Helper', () => {
  beforeAll(() => {
    // Ensure window.crypto is available in test environment
    if (!globalThis.window) {
      // @ts-expect-error test environment mock
      globalThis.window = {};
    }
    if (!globalThis.window.crypto) {
      // @ts-expect-error node webcrypto fallback
      globalThis.window.crypto = webcrypto;
    }
  });

  const testKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const testKeyBytes = parseCrewKey(testKeyHex)!;
  const testKeyBase64Url = bytesToBase64Url(testKeyBytes);

  it('parses hex keys correctly', () => {
    const parsed = parseCrewKey(testKeyHex);
    expect(parsed).toBeDefined();
    expect(parsed?.length).toBe(32);
    expect(parsed?.[0]).toBe(0x01);
    expect(parsed?.[1]).toBe(0x23);
  });

  it('parses base64url keys correctly', () => {
    const parsed = parseCrewKey(testKeyBase64Url);
    expect(parsed).toBeDefined();
    expect(parsed?.length).toBe(32);
    expect(parsed).toEqual(testKeyBytes);
  });

  it('encrypts and decrypts single location payloads round-trip', async () => {
    const payload = {
      latitude: 37.7749,
      longitude: -122.4194,
      speed_ms: 12.5,
      activity: 'driving',
      timestamp: '2026-09-18T23:00:00Z',
    };

    const ciphertext = await encryptPayload(payload, testKeyBase64Url);
    expect(ciphertext).toBeDefined();
    expect(typeof ciphertext).toBe('string');

    const decrypted = await decryptPayload(ciphertext!, testKeyBase64Url);
    expect(decrypted).toBeDefined();
    expect(decrypted?.latitude).toBeCloseTo(37.7749);
    expect(decrypted?.longitude).toBeCloseTo(-122.4194);
    expect(decrypted?.speed).toBeCloseTo(12.5);
    expect(decrypted?.activity).toBe('driving');
  });

  it('decrypts batched JSON array payloads', async () => {
    const batch = [
      { latitude: 37.7700, longitude: -122.4100, speed: 5 },
      { latitude: 37.7750, longitude: -122.4200, speed: 10 },
    ];

    const ciphertext = await encryptPayload(batch, testKeyHex);
    expect(ciphertext).toBeDefined();

    const decrypted = await decryptPayload(ciphertext!, testKeyHex);
    expect(decrypted).toBeDefined();
    // Should return latest ping from array
    expect(decrypted?.latitude).toBeCloseTo(37.7750);
    expect(decrypted?.longitude).toBeCloseTo(-122.4200);
    expect(decrypted?.speed).toBeCloseTo(10);
  });

  it('returns null on invalid key or corrupted payload', async () => {
    const decrypted = await decryptPayload('not-a-valid-payload', testKeyHex);
    expect(decrypted).toBeNull();

    const wrongKey = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    const ciphertext = await encryptPayload({ latitude: 10, longitude: 20 }, testKeyHex);
    const failedDecryption = await decryptPayload(ciphertext!, wrongKey);
    expect(failedDecryption).toBeNull();
  });
});
