/**
 * Zero-knowledge web unlock: ECDH pairing between this browser and the
 * captain's phone (audit P2-17). Replaces pasting the raw crew key.
 *
 * Protocol (must stay byte-compatible with the mobile app,
 * lib/services/web_key_handoff_crypto.dart):
 *  - keys on the wire: base64url(JSON {kty,crv,x,y}) with '=' padding (the
 *    same format the app publishes for member key pushes);
 *  - shared secret: P-256 ECDH x-coordinate (`deriveBits`, 256 bit);
 *  - AES key: HKDF-SHA256(secret, salt = utf8(handoffId), info = INFO);
 *  - AES-256-GCM, 12 byte nonce, `ct` = ciphertext || 16 byte tag,
 *    AAD = utf8(`${INFO}|${handoffId}|${crewId}`).
 *
 * The browser private key is generated non-extractable, lives only in this
 * object's memory and is dropped as soon as the handoff ends.
 */
import { base64UrlToBytes } from '@/lib/crypto';

export const HANDOFF_INFO = 'crewradr::web_handoff::v1';
export const HANDOFF_QR_TYPE = 'crewradr-web-handoff';
export const POLL_INTERVAL_MS = 2000;
export const HANDOFF_TTL_MS = 5 * 60 * 1000;
const MAX_CONSECUTIVE_POLL_ERRORS = 5;

export interface HandoffPayload {
  v: number;
  pub: string;
  nonce: string;
  ct: string;
}

export interface CreatedHandoff {
  id: string;
  expires_at: string;
}

export interface HandoffPollResult {
  status: 'pending' | 'ready' | 'expired';
  payload?: HandoffPayload;
}

export interface HandoffDeps {
  create(crewId: string, browserPub: string): Promise<CreatedHandoff>;
  get(id: string): Promise<HandoffPollResult>;
  cancel(id: string): Promise<void>;
  /** Defaults to the platform WebCrypto. */
  subtle?: SubtleCrypto;
  browserLabel?: string;
}

export type HandoffState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | {
      phase: 'waiting';
      pairingCode: string;
      manualCode: string;
      fingerprint: string;
      expiresAt: number;
    }
  | { phase: 'decrypting' }
  | { phase: 'success'; crewKey: string }
  | { phase: 'expired' }
  | { phase: 'cancelled' }
  | { phase: 'error'; message: string };

const enc = new TextEncoder();

function platformSubtle(): SubtleCrypto {
  const c =
    (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined) ??
    (typeof window !== 'undefined' ? window.crypto : undefined);
  if (!c?.subtle) throw new Error('WebCrypto unavailable');
  return c.subtle;
}

/** base64url WITH padding (the mobile decoder requires it). */
export function toPaddedBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_');
}

function stripPad(s: string): string {
  return s.replace(/=+$/, '');
}

/** Encodes an EC P-256 public JWK in the app's wire format. */
export function encodePublicKey(jwk: { x?: string; y?: string }): string {
  if (!jwk.x || !jwk.y) throw new Error('Incomplete public key');
  const pad = (s: string) => s + '='.repeat((4 - (s.length % 4)) % 4);
  const json = JSON.stringify({
    kty: 'EC',
    crv: 'P-256',
    x: pad(jwk.x),
    y: pad(jwk.y),
  });
  return toPaddedBase64Url(enc.encode(json));
}

/** Parses the app's wire format into a public JWK, or null if malformed. */
export function decodePublicKey(
  encoded: string,
): { kty: 'EC'; crv: 'P-256'; x: string; y: string } | null {
  try {
    const j = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded)));
    if (j?.crv !== 'P-256' || typeof j.x !== 'string' || typeof j.y !== 'string') {
      return null;
    }
    return { kty: 'EC', crv: 'P-256', x: stripPad(j.x), y: stripPad(j.y) };
  } catch {
    return null;
  }
}

export interface EphemeralKeyPair {
  privateKey: CryptoKey;
  publicKeyEncoded: string;
}

/** Fresh P-256 pair; the private key is non-extractable. */
export async function generateEphemeralKeyPair(
  subtle: SubtleCrypto = platformSubtle(),
): Promise<EphemeralKeyPair> {
  const pair = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );
  const jwk = await subtle.exportKey('jwk', pair.publicKey);
  return { privateKey: pair.privateKey, publicKeyEncoded: encodePublicKey(jwk) };
}

/** Short code both screens show so the captain can match phone and browser. */
export async function pairingFingerprint(
  publicKeyEncoded: string,
  subtle: SubtleCrypto = platformSubtle(),
): Promise<string> {
  const d = new Uint8Array(
    await subtle.digest('SHA-256', enc.encode(publicKeyEncoded) as BufferSource),
  );
  const hex = Array.from(d.slice(0, 4), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

export function browserLabel(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} on ${os}` : browser;
}

/** What the QR encodes; the manual code is the same JSON, base64url wrapped. */
export function buildPairingCode(args: {
  id: string;
  crewId: string;
  pub: string;
  label: string;
  expiresAtMs: number;
}): { pairingCode: string; manualCode: string } {
  const pairingCode = JSON.stringify({
    t: HANDOFF_QR_TYPE,
    v: 1,
    id: args.id,
    crew: args.crewId,
    pub: args.pub,
    n: args.label,
    exp: Math.floor(args.expiresAtMs / 1000),
  });
  return {
    pairingCode,
    manualCode: stripPad(toPaddedBase64Url(enc.encode(pairingCode))),
  };
}

/**
 * Derives the AES key and decrypts the phone's payload. Returns the crew key
 * string, or null for ANY failure (wrong key, tampering, wrong ids, bad
 * format) so callers cannot distinguish failure causes.
 */
export async function decryptHandoffPayload(args: {
  payload: HandoffPayload;
  privateKey: CryptoKey;
  handoffId: string;
  crewId: string;
  subtle?: SubtleCrypto;
}): Promise<string | null> {
  const subtle = args.subtle ?? platformSubtle();
  try {
    const { payload } = args;
    if (payload.v !== 1) return null;
    const phoneJwk = decodePublicKey(payload.pub);
    if (!phoneJwk) return null;
    const nonce = base64UrlToBytes(payload.nonce);
    const ct = base64UrlToBytes(payload.ct);
    if (nonce.length !== 12 || ct.length < 17) return null;

    const phonePub = await subtle.importKey(
      'jwk',
      phoneJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );
    const secret = await subtle.deriveBits(
      { name: 'ECDH', public: phonePub },
      args.privateKey,
      256,
    );
    const hkdfKey = await subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
    const aesKey = await subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: enc.encode(args.handoffId) as BufferSource,
        info: enc.encode(HANDOFF_INFO) as BufferSource,
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const plain = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce as BufferSource,
        additionalData: enc.encode(
          `${HANDOFF_INFO}|${args.handoffId}|${args.crewId}`,
        ) as BufferSource,
        tagLength: 128,
      },
      aesKey,
      ct as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/**
 * One pairing attempt. Create -> show code -> poll every 2 s until the phone
 * answers, the row expires (5 min) or the user cancels.
 */
export class WebKeyHandoffSession {
  private state: HandoffState = { phase: 'idle' };
  private listeners = new Set<(s: HandoffState) => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private privateKey: CryptoKey | null = null;
  private handoffId: string | null = null;
  private deadline = 0;
  private errorStreak = 0;
  private finished = false;

  constructor(
    private readonly crewId: string,
    private readonly deps: HandoffDeps,
    private readonly now: () => number = () => Date.now(),
  ) {}

  getState(): HandoffState {
    return this.state;
  }

  subscribe(fn: (s: HandoffState) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private set(s: HandoffState) {
    this.state = s;
    this.listeners.forEach((fn) => fn(s));
  }

  private finish(s: HandoffState) {
    this.finished = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.privateKey = null; // drop the only copy of the browser private key
    this.set(s);
  }

  async start(): Promise<void> {
    if (this.state.phase !== 'idle') return;
    this.set({ phase: 'creating' });
    try {
      const subtle = this.deps.subtle ?? platformSubtle();
      const pair = await generateEphemeralKeyPair(subtle);
      if (this.finished) return;
      const created = await this.deps.create(this.crewId, pair.publicKeyEncoded);
      if (this.finished) {
        void this.deps.cancel(created.id).catch(() => {});
        return;
      }
      this.privateKey = pair.privateKey;
      this.handoffId = created.id;
      const parsed = Date.parse(created.expires_at);
      this.deadline = Number.isFinite(parsed)
        ? Math.min(parsed, this.now() + HANDOFF_TTL_MS)
        : this.now() + HANDOFF_TTL_MS;
      const codes = buildPairingCode({
        id: created.id,
        crewId: this.crewId,
        pub: pair.publicKeyEncoded,
        label: this.deps.browserLabel ?? browserLabel(),
        expiresAtMs: this.deadline,
      });
      this.set({
        phase: 'waiting',
        ...codes,
        fingerprint: await pairingFingerprint(pair.publicKeyEncoded, subtle),
        expiresAt: this.deadline,
      });
      this.schedule();
    } catch (e) {
      this.finish({ phase: 'error', message: errorMessage(e) });
    }
  }

  private schedule() {
    if (this.finished) return;
    this.timer = setTimeout(() => {
      void this.poll();
    }, POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    if (this.finished || !this.handoffId) return;
    if (this.now() >= this.deadline) {
      this.finish({ phase: 'expired' });
      void this.deps.cancel(this.handoffId).catch(() => {});
      return;
    }
    try {
      const res = await this.deps.get(this.handoffId);
      if (this.finished) return;
      this.errorStreak = 0;
      if (res.status === 'expired') {
        this.finish({ phase: 'expired' });
      } else if (res.status === 'ready' && res.payload) {
        await this.complete(res.payload);
      } else {
        this.schedule();
      }
    } catch (e) {
      if (this.finished) return;
      this.errorStreak += 1;
      if (this.errorStreak >= MAX_CONSECUTIVE_POLL_ERRORS || isAuthError(e)) {
        this.finish({ phase: 'error', message: errorMessage(e) });
      } else {
        this.schedule();
      }
    }
  }

  private async complete(payload: HandoffPayload) {
    const key = this.privateKey;
    const id = this.handoffId;
    if (!key || !id) return;
    this.set({ phase: 'decrypting' });
    const crewKey = await decryptHandoffPayload({
      payload,
      privateKey: key,
      handoffId: id,
      crewId: this.crewId,
      subtle: this.deps.subtle,
    });
    if (this.finished) return;
    if (crewKey) this.finish({ phase: 'success', crewKey });
    else this.finish({ phase: 'error', message: 'decrypt_failed' });
  }

  /** Stops polling, forgets the key and frees the server slot. */
  cancel(): void {
    if (this.finished) return;
    const id = this.handoffId;
    this.finish({ phase: 'cancelled' });
    if (id) void this.deps.cancel(id).catch(() => {});
  }
}

function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'error';
}

function isAuthError(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { code?: string }).code === '42501';
}
