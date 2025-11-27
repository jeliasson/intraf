import { MessageType, type ClientId } from "./types.ts";

/**
 * WebSocket heartbeat configuration constants
 */

// Client heartbeat interval - how often the client sends a ping
export const HEARTBEAT_INTERVAL = 5000;

// Client heartbeat timeout - how long to wait for a pong response
export const HEARTBEAT_TIMEOUT = 3000;

// Server heartbeat check interval - how often the server checks for stale connections
export const HEARTBEAT_CHECK_INTERVAL = 10000;

// Server heartbeat timeout - how long before considering a client connection stale
export const SERVER_HEARTBEAT_TIMEOUT = 30000;

// Heartbeat message constants - use MessageType enum values
export const HEARTBEAT_PING = MessageType.HEARTBEAT_PING;
export const HEARTBEAT_PONG = MessageType.HEARTBEAT_PONG;

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
