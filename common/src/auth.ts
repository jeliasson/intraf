/**
 * Authentication utilities for JWT token management
 */

import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

/**
 * JWT token payload structure
 */
export interface TokenPayload {
  sub: string; // Client ID or user identifier
  exp?: number; // Expiration time
  iat?: number; // Issued at time
}

/**
 * Generate a cryptographic key from a secret string
 */
export async function getKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Create a JWT token
 */
export async function createToken(
  subject: string,
  secret: string,
  expiresInSeconds: number = 86400 // 24 hours default
): Promise<string> {
  const key = await getKey(secret);
  const payload = {
    sub: subject,
    exp: getNumericDate(expiresInSeconds),
    iat: getNumericDate(0),
  };
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

/**
 * Verify a JWT token and return the payload
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<TokenPayload | null> {
  try {
    const key = await getKey(secret);
    const payload = await verify(token, key);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
