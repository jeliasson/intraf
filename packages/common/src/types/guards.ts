/**
 * Type guard functions for WebSocket messages
 */

import type {
  ClientIdMessage,
  AuthRequestMessage,
  AuthResponseMessage,
  AuthResultMessage,
  LoginRequestMessage,
  LoginResponseMessage,
} from "./messages.ts";
import { MessageType } from "./messages.ts";

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
