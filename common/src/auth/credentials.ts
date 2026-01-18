/**
 * Credentials storage utility for managing authentication tokens
 * Stores credentials in a cross-platform location
 */

import { join } from "https://deno.land/std@0.221.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.221.0/fs/mod.ts";
import { Result, ok, err } from "../errors/index.ts";

/**
 * Credentials structure stored in credentials.json
 */
export interface Credentials {
  token?: string;
}

/**
 * Get the cross-platform credentials directory path
 * Uses XDG_STATE_HOME on Linux, ~/Library/Application Support on macOS,
 * and LOCALAPPDATA on Windows
 */
function getCredentialsDir(): Result<string, Error> {
  const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
  
  if (!homeDir) {
    return err(new Error("Unable to determine home directory"));
  }

  // Determine the appropriate base directory based on OS
  let baseDir: string;
  
  if (Deno.build.os === "windows") {
    // Windows: %LOCALAPPDATA%\intraf
    baseDir = Deno.env.get("LOCALAPPDATA") || join(homeDir, "AppData", "Local");
  } else if (Deno.build.os === "darwin") {
    // macOS: ~/Library/Application Support/intraf
    baseDir = join(homeDir, "Library", "Application Support");
  } else {
    // Linux/Unix: $XDG_STATE_HOME/intraf or ~/.local/state/intraf
    const xdgStateHome = Deno.env.get("XDG_STATE_HOME");
    baseDir = xdgStateHome || join(homeDir, ".local", "state");
  }

  return ok(join(baseDir, "intraf"));
}

/**
 * Get the full path to the credentials file
 */
export function getCredentialsPath(): string {
  const dirResult = getCredentialsDir();
  if (!dirResult.ok) {
    throw dirResult.error;
  }
  return join(dirResult.value, "credentials.json");
}

/**
 * Load credentials from the credentials file
 * Returns null if file doesn't exist or can't be parsed
 */
export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const credPath = getCredentialsPath();
    const content = await Deno.readTextFile(credPath);
    return JSON.parse(content) as Credentials;
  } catch {
    // File doesn't exist or invalid JSON - this is expected for first run
    return null;
  }
}

/**
 * Save credentials to the credentials file
 * Creates directory if it doesn't exist
 */
export async function saveCredentials(credentials: Credentials): Promise<Result<void, Error>> {
  try {
    const dirResult = getCredentialsDir();
    if (!dirResult.ok) {
      return dirResult;
    }

    const credPath = join(dirResult.value, "credentials.json");
    
    // Ensure directory exists
    await ensureDir(dirResult.value);
    
    // Write credentials
    await Deno.writeTextFile(
      credPath,
      JSON.stringify(credentials, null, 2)
    );

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Delete the credentials file
 */
export async function deleteCredentials(): Promise<Result<void, Error>> {
  try {
    const credPath = getCredentialsPath();
    await Deno.remove(credPath);
    return ok(undefined);
  } catch (error) {
    // File doesn't exist - this is fine, nothing to delete
    if (error instanceof Deno.errors.NotFound) {
      return ok(undefined);
    }
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
