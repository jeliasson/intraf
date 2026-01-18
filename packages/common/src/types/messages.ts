/**
 * Message types and interfaces for WebSocket communication
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
  AUTH_REQUEST = "auth.request",
  AUTH_RESPONSE = "auth.response",
  AUTH_RESULT = "auth.result",
  LOGIN_REQUEST = "login.request",
  LOGIN_RESPONSE = "login.response",
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
 * Authentication request message from server to client
 */
export interface AuthRequestMessage extends BaseMessage {
  type: MessageType.AUTH_REQUEST;
}

/**
 * Authentication response message from client to server
 */
export interface AuthResponseMessage extends BaseMessage {
  type: MessageType.AUTH_RESPONSE;
  token: string | null; // null if no token available
}

/**
 * Authentication result message from server to client
 */
export interface AuthResultMessage extends BaseMessage {
  type: MessageType.AUTH_RESULT;
  success: boolean;
  status: number; // 200 for success, 401 for unauthorized
  message?: string;
}

/**
 * Login request message from client to server
 */
export interface LoginRequestMessage extends BaseMessage {
  type: MessageType.LOGIN_REQUEST;
  username: string;
  password: string;
}

/**
 * Login response message from server to client
 */
export interface LoginResponseMessage extends BaseMessage {
  type: MessageType.LOGIN_RESPONSE;
  success: boolean;
  token?: string; // JWT token if login successful
  message?: string;
}

/**
 * Union type for all WebSocket messages
 */
export type WebSocketMessage = 
  | ClientIdMessage 
  | AuthRequestMessage 
  | AuthResponseMessage 
  | AuthResultMessage
  | LoginRequestMessage
  | LoginResponseMessage;
