#!/usr/bin/env -S deno run --allow-write --allow-read --allow-env

/**
 * Helper script to generate and save a JWT token for testing authentication
 */

import { createToken } from "../common/src/auth.ts";
import { saveCredentials, getCredentialsPath } from "../common/src/credentials.ts";

const args = Deno.args;

if (args.length < 1) {
  console.error("Usage: deno run --allow-write --allow-read --allow-env scripts/generate-token.ts <subject> [secret] [expiry-seconds]");
  console.error("\nExample:");
  console.error("  deno run --allow-write --allow-read --allow-env scripts/generate-token.ts test-user");
  console.error("  deno run --allow-write --allow-read --allow-env scripts/generate-token.ts test-user my-secret-key 3600");
  Deno.exit(1);
}

const subject = args[0];
const secret = args[1] || "change-me-in-production";
const expirySeconds = args[2] ? parseInt(args[2]) : 86400; // 24 hours default

console.log(`Generating JWT token for subject: ${subject}`);
console.log(`Secret: ${secret}`);
console.log(`Expiry: ${expirySeconds} seconds`);

// Generate token
const token = await createToken(subject, secret, expirySeconds);

console.log(`\nGenerated token:\n${token}\n`);

// Save to credentials file
await saveCredentials({ token });

const credPath = getCredentialsPath();
console.log(`Token saved to: ${credPath}`);
console.log("\nYou can now connect with the client to test authentication.");
