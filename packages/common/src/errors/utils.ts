/**
 * Error handling utilities and helpers
 */

import { IntrafError } from "./errors.ts";

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

/**
 * Check if error is an IntrafError
 */
export function isIntrafError(error: unknown): error is IntrafError {
  return error instanceof IntrafError;
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): string {
  if (isIntrafError(error)) {
    return `[${error.code}] ${error.message}`;
  }
  return getErrorMessage(error);
}

/**
 * Check if error should be retried (for connection errors)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof IntrafError) {
    // ConnectionError has isRetryable property
    return "isRetryable" in error && error.isRetryable === true;
  }
  // Network errors are generally retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    );
  }
  return false;
}
