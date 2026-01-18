/**
 * Authentication module barrel export
 */

export { createToken, verifyToken, getKey, type TokenPayload } from "./jwt.ts";
export type { Credentials } from "./credentials.ts";
export { 
  getCredentialsPath,
  loadCredentials,
  saveCredentials,
  deleteCredentials,
} from "./credentials.ts";
