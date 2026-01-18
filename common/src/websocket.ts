/**
 * WebSocket module - backward compatibility re-exports
 * Actual implementation is in websocket/ subdirectory
 */

import { MessageType } from "./types.ts";
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

// Re-export utilities from websocket module
export { generateClientId } from "./websocket/utils.ts";
