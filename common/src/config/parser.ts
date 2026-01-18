/**
 * Simple YAML parser for configuration files
 */

import type { ConfigValue } from "./schema.ts";

export type ParsedYaml = {
  [section: string]: {
    [field: string]: ConfigValue;
  } | ConfigValue;
};

/**
 * Parse YAML value to appropriate type
 */
export function parseValue(value: string): string | number | boolean {
  const trimmed = value.trim();
  
  // Number
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  
  // Boolean
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  
  // String (remove quotes if present)
  return trimmed.replace(/^["']|["']$/g, "");
}

/**
 * Simple YAML parser for our config needs
 * Supports basic key-value pairs and one level of nesting
 */
export function parseYaml(content: string): ParsedYaml {
  const config: ParsedYaml = {};
  const lines = content.split("\n");
  let currentSection: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Check for section (no indentation, ends with :)
    if (!line.startsWith(" ") && trimmed.endsWith(":")) {
      currentSection = trimmed.slice(0, -1);
      config[currentSection] = {};
      continue;
    }

    // Parse key-value pairs
    const match = trimmed.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      const parsedValue = parseValue(value);
      
      if (currentSection) {
        const section = config[currentSection];
        if (typeof section === "object") {
          section[key] = parsedValue;
        }
      } else {
        config[key] = parsedValue;
      }
    }
  }

  return config;
}
