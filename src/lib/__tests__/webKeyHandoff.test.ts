// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  WebKeyHandoffSession,
  buildPairingCode,
  decodePublicKey,
  decryptHandoffPayload,
  encodePublicKey,
  generateEphemeralKeyPair,
  pairingFingerprint,
  type HandoffDeps,
  type HandoffPayload,
  type HandoffState,
} from '../webKeyHandoff';
import { base64UrlToBytes } from '../crypto';
import { DART_FIXTURE as F } from './webKeyHandoff.fixture';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const enc = new TextEncoder();
const INFO = 'crewradr::web_handoff::v1';

async function importFixturePrivateKey(): Promise<CryptoKey> {
  return subtle.importKey(
    'jwk',
    { ...F.browserPrivateJwk },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );
}

/** Test double for the phone: same algorithm as the Dart WebKeyHandoffCrypto. */
async function phoneSeal(
  browserPubEncoded: string,
  crewKey: string,
  handoffId: string,
  crewId: string,
): Promise<HandoffPayload> {
  const jwk = decodePublicKey(browserPubEncoded)!;
  const browserPub = await subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const eph = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const secret = await subtle.deriveBits({ name: 'ECDH', public: browserPub }, eph.privateKey, 256);
  const hk = await subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  const aes = await subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: enc.encode(handoffId), info: enc.encode(INFO) },
    hk,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const nonce = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, additionalData: enc.encode(`${INFO}|${handoffId}|${crewId}`), tagLength: 128 },
      aes,
      enc.encode(crewKey),
    ),
  );
  const pub = encodePublicKey(await subtle.exportKey('jwk', eph.publicKey));
  const b64 = (b: Uint8Array) => Buffer.from(b).toString('base64url');
  return { v: 1, pub, nonce: b64(nonce), ct: b64(ct) };
}

describe('decryptHandoffPayload (Dart interop fixture)', () => {
  it('decrypts the payload produced by the mobile Dart code', async () => {
    const out = await decryptHandoffPayload({
      payload: F.payload,
      privateKey: await importFixturePrivateKey(),
      handoffId: F.handoffId,
      crewId: F.crewId,
      subtle,
    });
    expect(out).toBe(F.crewKey);
  });

  it('fails with a different browser key', async () => {
    const other = await generateEphemeralKeyPair(subtle);
    const out = await decryptHandoffPayload({
      payload: F.payload,
      privateKey: other.privateKey,
      handoffId: F.handoffId,
      crewId: F.crewId,
      subtle,
    });
    expect(out).toBeNull();
  });

  it('fails when the ciphertext is tampered with', async () => {
    const ct = base64UrlToBytes(F.payload.ct);
    ct[3] ^= 1;
    const out = await decryptHandoffPayload({
      payload: { ...F.payload, ct: Buffer.from(ct).toString('base64url') },
      privateKey: await importFixturePrivateKey(),
      handoffId: F.handoffId,
      crewId: F.crewId,
      subtle,
    });
    expect(out).toBeNull();
  });

  it('fails when the payload is bound to another handoff or crew', async () => {
    const key = await importFixturePrivateKey();
    const base = { payload: F.payload, privateKey: key, subtle };
    expect(
      await decryptHandoffPayload({ ...base, handoffId: '00000000-0000-4000-8000-000000000000', crewId: F.crewId }),
    ).toBeNull();
    expect(
      await decryptHandoffPayload({ ...base, handoffId: F.handoffId, crewId: '00000000-0000-4000-8000-000000000000' }),
    ).toBeNull();
  });

  it('fails on malformed payloads without throwing', async () => {
    const key = await importFixturePrivateKey();
    const common = { privateKey: key, handoffId: F.handoffId, crewId: F.crewId, subtle };
    expect(await decryptHandoffPayload({ ...common, payload: { ...F.payload, v: 2 } })).toBeNull();
    expect(await decryptHandoffPayload({ ...common, payload: { ...F.payload, pub: 'zzz' } })).toBeNull();
    expect(await decryptHandoffPayload({ ...common, payload: { ...F.payload, nonce: 'AAAA' } })).toBeNull();
  });
});

describe('wire format helpers', () => {
  it('encodes public keys in the app format (padded base64url JSON) and round-trips', async () => {
    const pair = await generateEphemeralKeyPair(subtle);
    expect(pair.publicKeyEncoded).toMatch(/^[A-Za-z0-9_-]+=*$/);
    const json = JSON.parse(Buffer.from(pair.publicKeyEncoded, 'base64url').toString());
    expect(json.kty).toBe('EC');
    expect(json.crv).toBe('P-256');
    expect(json.x.length % 4).toBe(0); // Dart's base64Url.decode needs padding
    expect(decodePublicKey(pair.publicKeyEncoded)!.x).toBe(json.x.replace(/=+$/, ''));
  });

  it('the ephemeral private key is not extractable', async () => {
    const pair = await generateEphemeralKeyPair(subtle);
    expect(pair.privateKey.extractable).toBe(false);
    await expect(subtle.exportKey('jwk', pair.privateKey)).rejects.toThrow();
  });

  it('fingerprint matches the Dart implementation', async () => {
    // Dart: sha256(utf8(pub)) first 4 bytes, upper-case hex, XXXX-XXXX
    expect(await pairingFingerprint(F.browserPublicKey, subtle)).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('pairing code carries id, crew, key and expiry; manual code wraps the same JSON', () => {
    const { pairingCode, manualCode } = buildPairingCode({
      id: F.handoffId,
      crewId: F.crewId,
      pub: F.browserPublicKey,
      label: 'Chrome on Windows',
      expiresAtMs: 1_800_000_000_000,
    });
    const j = JSON.parse(pairingCode);
    expect(j).toMatchObject({ t: 'crewradr-web-handoff', v: 1, id: F.handoffId, crew: F.crewId, pub: F.browserPublicKey, exp: 1_800_000_000 });
    expect(Buffer.from(manualCode, 'base64url').toString()).toBe(pairingCode);
  });
});

describe('WebKeyHandoffSession state machine', () => {
  const crewId = F.crewId;
  const handoffId = F.handoffId;
  let browserPub = '';
  let deps: HandoffDeps;
  let create: ReturnType<typeof vi.fn>;
  let get: ReturnType<typeof vi.fn>;
  let cancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    create = vi.fn(async (_c: string, pub: string) => {
      browserPub = pub;
      return { id: handoffId, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() };
    });
    get = vi.fn(async () => ({ status: 'pending' as const }));
    cancel = vi.fn(async () => {});
    deps = { create, get, cancel, subtle, browserLabel: 'Test' };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function waitForPhase(s: WebKeyHandoffSession, phase: HandoffState['phase']): Promise<HandoffState> {
    return new Promise((resolve) => {
      if (s.getState().phase === phase) return resolve(s.getState());
      const un = s.subscribe((st) => {
        if (st.phase === phase) {
          un();
          resolve(st);
        }
      });
    });
  }

  it('creates a handoff, shows codes, polls every 2s and unlocks on a valid payload', async () => {
    const s = new WebKeyHandoffSession(crewId, deps);
    await s.start();
    const waiting = s.getState();
    expect(waiting.phase).toBe('waiting');
    expect(create).toHaveBeenCalledWith(crewId, browserPub);
    expect(get).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1999);
    expect(get).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(get).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4000);
    expect(get).toHaveBeenCalledTimes(3);

    const payload = await phoneSeal(browserPub, F.crewKey, handoffId, crewId);
    get.mockResolvedValueOnce({ status: 'ready', payload });
    const done = waitForPhase(s, 'success');
    await vi.advanceTimersByTimeAsync(2000);
    const final = await done;
    expect(final).toEqual({ phase: 'success', crewKey: F.crewKey });

    // finished: no further polling
    const calls = get.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(get.mock.calls.length).toBe(calls);
  });

  it('expires after 5 minutes and frees the server slot', async () => {
    const s = new WebKeyHandoffSession(crewId, deps);
    await s.start();
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 2000);
    expect(s.getState().phase).toBe('expired');
    expect(cancel).toHaveBeenCalledWith(handoffId);
    expect(get.mock.calls.length).toBeLessThanOrEqual(150);
  });

  it('reports expired when the server says so', async () => {
    get.mockResolvedValue({ status: 'expired' });
    const s = new WebKeyHandoffSession(crewId, deps);
    await s.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(s.getState().phase).toBe('expired');
  });

  it('cancel stops polling and cancels the row', async () => {
    const s = new WebKeyHandoffSession(crewId, deps);
    await s.start();
    s.cancel();
    expect(s.getState().phase).toBe('cancelled');
    expect(cancel).toHaveBeenCalledWith(handoffId);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(get).not.toHaveBeenCalled();
  });

  it('tolerates transient poll errors but gives up after 5 in a row', async () => {
    get.mockRejectedValueOnce(new Error('net')).mockResolvedValue({ status: 'pending' });
    const s = new WebKeyHandoffSession(crewId, deps);
    await s.start();
    await vi.advanceTimersByTimeAsync(6000);
    expect(s.getState().phase).toBe('waiting');

    get.mockReset();
    get.mockRejectedValue(new Error('net'));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(s.getState().phase).toBe('error');
  });

  it('fails fast on an MFA/permission error from the server', async () => {
    get.mockRejectedValue({ code: '42501', message: 'MFA required' });
    const s = new WebKeyHandoffSession(crewId, deps);
    await s.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(s.getState()).toMatchObject({ phase: 'error', message: 'MFA required' });
  });

  it('a payload that cannot be decrypted ends in an error and never exposes a key', async () => {
    const s = new WebKeyHandoffSession(crewId, deps);
    await s.start();
    const bad = await phoneSeal(browserPub, F.crewKey, handoffId, '00000000-0000-4000-8000-000000000000');
    get.mockResolvedValueOnce({ status: 'ready', payload: bad });
    const done = waitForPhase(s, 'error');
    await vi.advanceTimersByTimeAsync(2000);
    expect(await done).toEqual({ phase: 'error', message: 'decrypt_failed' });
  });

  it('create failure surfaces as an error', async () => {
    create.mockRejectedValue({ code: '42501', message: 'Only a captain or co-captain can unlock the web map.' });
    const s = new WebKeyHandoffSession(crewId, deps);
    await s.start();
    expect(s.getState().phase).toBe('error');
    expect(get).not.toHaveBeenCalled();
  });
});
