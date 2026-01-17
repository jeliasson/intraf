/**
 * Utility for prompting user input from stdin
 */

/**
 * Prompt user for input using Deno's built-in prompt
 */
export function prompt(message: string): string {
  const result = globalThis.prompt(message);
  return result || "";
}

/**
 * Prompt user for password
 * Note: Deno's prompt doesn't mask input, so we print a warning
 */
export function promptPassword(message: string): string {
  console.warn("⚠️  Warning: Password input will be visible");
  const result = globalThis.prompt(message);
  return result || "";
}

/**
 * Prompt for username and password
 */
export function promptCredentials(): { username: string; password: string } {
  console.log("\n=== Authentication Required ===");
  const username = prompt("Username");
  const password = promptPassword("Password");
  console.log("");
  return { username, password };
}
