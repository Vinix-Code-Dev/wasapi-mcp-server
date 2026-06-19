import { describe, it, expect } from "vitest";
import {
  generateOpaqueToken,
  hashToken,
  encryptSecret,
  decryptSecret,
} from "../../../src/oauth/crypto.js";

describe("crypto", () => {
  it("generates url-safe opaque tokens", () => {
    const t = generateOpaqueToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t).not.toBe(generateOpaqueToken());
  });

  it("hashToken is deterministic and secret-dependent", () => {
    expect(hashToken("abc", "s1")).toBe(hashToken("abc", "s1"));
    expect(hashToken("abc", "s1")).not.toBe(hashToken("abc", "s2"));
    expect(hashToken("abc", "s1")).not.toBe(hashToken("abd", "s1"));
  });

  it("encrypts and decrypts round-trip without exposing plaintext", () => {
    const secret = "key-encryption-secret-1234567890";
    const enc = encryptSecret("wsp_super_secret", secret);
    expect(enc).not.toContain("wsp_super_secret");
    expect(decryptSecret(enc, secret)).toBe("wsp_super_secret");
  });

  it("fails to decrypt with the wrong secret", () => {
    const enc = encryptSecret("data", "secret-aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(() => decryptSecret(enc, "secret-bbbbbbbbbbbbbbbbbbbbbbbb")).toThrow();
  });
});
