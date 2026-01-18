/**
 * Credentials module - backward compatibility re-exports
 * Actual implementation is in auth/ subdirectory
 */

export type { Credentials } from "./auth/credentials.ts";
export { 
  getCredentialsPath,
  loadCredentials,
  saveCredentials,
  deleteCredentials,
} from "./auth/credentials.ts";
