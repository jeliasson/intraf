/**
 * Auth module - backward compatibility re-exports
 * Actual implementation is in auth/ subdirectory
 */

export { createToken, verifyToken, getKey, type TokenPayload } from "./auth/jwt.ts";
