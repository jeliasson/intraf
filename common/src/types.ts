/**
 * Common types for WebSocket communication
 */

/**
 * Client ID - unique identifier assigned by server
 */
export type ClientId = string;

/**
 * Message types for WebSocket communication
 */
export enum MessageType {
  CLIENT_ID = "client_id",
  HEARTBEAT_PING = "ping",
  HEARTBEAT_PONG = "pong",
}

/**
 * Base message structure
 */
export interface BaseMessage {
  type: MessageType;
}

/**
 * Client ID assignment message from server to client
 */
export interface ClientIdMessage extends BaseMessage {
  type: MessageType.CLIENT_ID;
  id: ClientId;
}

/**
 * Union type for all WebSocket messages
 */
export type WebSocketMessage = ClientIdMessage;

/**
 * Type guard to check if a message is a ClientIdMessage
 */
export function isClientIdMessage(data: unknown): data is ClientIdMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === MessageType.CLIENT_ID &&
    "id" in data &&
    typeof data.id === "string"
  );
}
