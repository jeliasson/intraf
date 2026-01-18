/**
 * WebSocket module barrel export
 */

export { generateClientId } from "./utils.ts";

// Re-export constants for convenience
export {
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  HEARTBEAT_CHECK_INTERVAL,
  SERVER_HEARTBEAT_TIMEOUT,
} from "../constants.ts";

// Re-export message type constants
export { MessageType } from "../types.ts";
