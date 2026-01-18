/**
 * Common types for WebSocket communication
 * 
 * This file re-exports from the types/ module for backward compatibility.
 * New code should import from 'common/src/types/index.ts' directly.
 */

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
} from "./types/index.ts";

export { MessageType } from "./types/index.ts";

export {
  isClientIdMessage,
  isAuthRequestMessage,
  isAuthResponseMessage,
  isAuthResultMessage,
  isLoginRequestMessage,
  isLoginResponseMessage,
} from "./types/index.ts";
