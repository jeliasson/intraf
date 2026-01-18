/**
 * WebSocket utility functions
 */

import type { ClientId } from "../types.ts";

/**
 * Generate a unique client ID using a random hash
 * Returns first 10 characters of a hex-encoded random hash
 */
export function generateClientId(): ClientId {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  const hexString = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hexString.substring(0, 10);
}
