/**
 * Shared constants for the intraf application
 */

/**
 * HTTP Status Codes
 */
export const HTTP_UPGRADE_REQUIRED = 426;
export const HTTP_OK = 200;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_SERVICE_UNAVAILABLE = 503;

/**
 * WebSocket Close Codes
 * @see https://datatracker.ietf.org/doc/html/rfc6455#section-7.4
 */
export const WS_NORMAL_CLOSURE = 1000;
export const WS_GOING_AWAY = 1001;
export const WS_POLICY_VIOLATION = 1008;

/**
 * Heartbeat Configuration
 */
// Client heartbeat interval - how often the client sends a ping (ms)
export const HEARTBEAT_INTERVAL = 5000;

// Client heartbeat timeout - how long to wait for a pong response (ms)
export const HEARTBEAT_TIMEOUT = 3000;

// Server heartbeat check interval - how often the server checks for stale connections (ms)
export const HEARTBEAT_CHECK_INTERVAL = 10000;

// Server heartbeat timeout - how long before considering a client connection stale (ms)
export const SERVER_HEARTBEAT_TIMEOUT = 30000;

// Heartbeat message types
export const HEARTBEAT_PING = "ping";
export const HEARTBEAT_PONG = "pong";

/**
 * Default Messages
 */
export const MSG_CLIENT_CONNECTED = "Client connected";
export const MSG_CLIENT_DISCONNECTED = "Client disconnected";
export const MSG_CONNECTION_CLOSED = "Connection closed.";
export const MSG_CONNECTION_CLOSED_INTENTIONALLY = "Connection closed intentionally";
