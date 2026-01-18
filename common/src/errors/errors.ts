/**
 * Error hierarchy for intraf application
 */

/**
 * Base error class for all intraf errors
 */
export class IntrafError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Configuration-related errors
 */
export class ConfigError extends IntrafError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends IntrafError {
  constructor(message: string, public readonly isRetryable: boolean = true) {
    super(message, "CONNECTION_ERROR");
  }
}

/**
 * Authentication-related errors
 */
export class AuthError extends IntrafError {
  constructor(message: string, public readonly statusCode: number = 401) {
    super(message, "AUTH_ERROR");
  }
}

/**
 * WebSocket protocol errors
 */
export class ProtocolError extends IntrafError {
  constructor(message: string) {
    super(message, "PROTOCOL_ERROR");
  }
}

/**
 * Validation errors
 */
export class ValidationError extends IntrafError {
  constructor(message: string, public readonly field?: string) {
    super(message, "VALIDATION_ERROR");
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends IntrafError {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message, "TIMEOUT_ERROR");
  }
}
