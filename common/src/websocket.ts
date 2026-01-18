import { MessageType, type ClientId } from "./types.ts";
import {
  HEARTBEAT_INTERVAL as HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT as HEARTBEAT_TIMEOUT_MS,
  HEARTBEAT_CHECK_INTERVAL as HEARTBEAT_CHECK_INTERVAL_MS,
  SERVER_HEARTBEAT_TIMEOUT as SERVER_HEARTBEAT_TIMEOUT_MS,
} from "./constants.ts";

/**
 * WebSocket heartbeat configuration constants
 * Re-exported from constants.ts for backward compatibility
 */
export const HEARTBEAT_INTERVAL = HEARTBEAT_INTERVAL_MS;
export const HEARTBEAT_TIMEOUT = HEARTBEAT_TIMEOUT_MS;
export const HEARTBEAT_CHECK_INTERVAL = HEARTBEAT_CHECK_INTERVAL_MS;
export const SERVER_HEARTBEAT_TIMEOUT = SERVER_HEARTBEAT_TIMEOUT_MS;

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
