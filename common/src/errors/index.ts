/**
 * Error handling module barrel export
 */

// Error classes
export {
  IntrafError,
  ConfigError,
  ConnectionError,
  AuthError,
  ProtocolError,
  ValidationError,
  TimeoutError,
} from "./errors.ts";

// Result type
export type { Result, Ok, Err } from "./result.ts";
export {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  andThen,
  tryCatch,
  tryCatchAsync,
} from "./result.ts";

// Utilities
export {
  getErrorMessage,
  isIntrafError,
  formatError,
  isRetryableError,
} from "./utils.ts";
