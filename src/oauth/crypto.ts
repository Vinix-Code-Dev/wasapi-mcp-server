import {
  randomBytes,
  createHmac,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";

/**
 * Generates a URL-safe opaque token (base64url, no padding). Used for access
 * tokens, refresh tokens, auth codes, login session ids and grant codes.
 */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * HMAC-SHA256 of a token, hex-encoded. The Redis key for a token is its hash,
 * never the token itself — so a Redis dump never reveals usable bearer tokens.
 */
export function hashToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

/** Derives a fixed 32-byte AES key from an arbitrary-length secret. */
function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

const IV_LEN = 12; // GCM standard nonce length
const AUTH_TAG_LEN = 16;

/**
 * Encrypts a plaintext (the Wasapi API key) with AES-256-GCM. Returns a single
 * base64url string packing iv || authTag || ciphertext so it can be stored as
 * one opaque field and decrypted with only the secret.
 */
export function encryptSecret(plaintext: string, secret: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

/** Reverses encryptSecret(). Throws if the payload is malformed or tampered. */
export function decryptSecret(packed: string, secret: string): string {
  const buf = Buffer.from(packed, "base64url");
  if (buf.length < IV_LEN + AUTH_TAG_LEN) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = buf.subarray(0, IV_LEN);
  const authTag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
