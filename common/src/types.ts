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

/**
 * Type guard to check if a message is an AuthRequestMessage
 */
export function isAuthRequestMessage(data: unknown): data is AuthRequestMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === MessageType.AUTH_REQUEST
  );
}

/**
 * Type guard to check if a message is an AuthResponseMessage
 */
export function isAuthResponseMessage(data: unknown): data is AuthResponseMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === MessageType.AUTH_RESPONSE &&
    "token" in data &&
    (typeof data.token === "string" || data.token === null)
  );
}

/**
 * Type guard to check if a message is an AuthResultMessage
 */
export function isAuthResultMessage(data: unknown): data is AuthResultMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === MessageType.AUTH_RESULT &&
    "success" in data &&
    typeof data.success === "boolean" &&
    "status" in data &&
    typeof data.status === "number"
  );
}

/**
 * Type guard to check if a message is a LoginRequestMessage
 */
export function isLoginRequestMessage(data: unknown): data is LoginRequestMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === MessageType.LOGIN_REQUEST &&
    "username" in data &&
    typeof data.username === "string" &&
    "password" in data &&
    typeof data.password === "string"
  );
}

/**
 * Type guard to check if a message is a LoginResponseMessage
 */
export function isLoginResponseMessage(data: unknown): data is LoginResponseMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === MessageType.LOGIN_RESPONSE &&
    "success" in data &&
    typeof data.success === "boolean"
  );
}
