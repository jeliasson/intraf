/**
 * Type definitions and type guards
 * Central export point for all type-related functionality
 */

// Export message types and interfaces
export type {
  ClientId,
  BaseMessage,
  ClientIdMessage,
  AuthRequestMessage,
  AuthResponseMessage,
  AuthResultMessage,
  LoginRequestMessage,
  LoginResponseMessage,
  WebSocketMessage,
} from "./messages.ts";

export { MessageType } from "./messages.ts";

// Export type guards
export {
  isClientIdMessage,
  isAuthRequestMessage,
  isAuthResponseMessage,
  isAuthResultMessage,
  isLoginRequestMessage,
  isLoginResponseMessage,
} from "./guards.ts";
