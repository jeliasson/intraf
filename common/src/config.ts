/**
 * Configuration management system
 * Supports multiple sources with precedence: CLI args > Environment variables > Config file
 * Uses a schema-driven approach to automatically generate CLI args, env vars, and resolved config
 */

import { LogLevel, parseLogLevel } from "./cli/logger.ts";

/**
 * Base type for configuration values
 */
type ConfigValue = string | number | boolean | LogLevel;

/**
 * Configuration field definition with default value and optional transform
 */
export interface ConfigFieldDef<T extends ConfigValue = ConfigValue> {
  default: T;
  transform?: (value: string) => T;
  description?: string;
}

/**
 * Configuration schema - nested structure of field definitions
 */
export type ConfigSchema = {
  [section: string]: {
    [field: string]: ConfigFieldDef;
  } | ConfigFieldDef;
};

/**
 * Extract the resolved type from a config schema
 */
export type ResolvedFromSchema<S extends ConfigSchema> = {
  [K in keyof S]: S[K] extends ConfigFieldDef
    ? S[K]["default"]
    : S[K] extends Record<string, ConfigFieldDef>
    ? { [P in keyof S[K]]: S[K][P] extends ConfigFieldDef ? S[K][P]["default"] : never }
    : never;
};

/**
 * Partial config loaded from sources (file, env, CLI) - just the raw values
 */
type PartialConfigData = {
  [section: string]: {
    [field: string]: ConfigValue;
  } | ConfigValue;
};

interface ConfigSource {
  name: string;
  data: PartialConfigData;
}

export class Config<S extends ConfigSchema> {
  private sources: ConfigSource[] = [];
  
  constructor(
    private schema: S,
    private configPath: string,
    private envPrefix: string = "INTRAF",
    private logger?: { warn: (msg: string) => void; info: (msg: string) => void; debug: (msg: string) => void },
  ) {}

  /**
   * Load configuration from all sources
   */
  async load(): Promise<void> {
    // 1. Load from config file (lowest priority)
    await this.loadConfigFile();
    
    // 2. Load from environment variables
    this.loadEnvironmentVariables();
    
    // 3. Load from CLI arguments (highest priority)
    this.loadCliArguments();
  }

  /**
   * Load configuration from YAML file
   */
  private async loadConfigFile(): Promise<void> {
    try {
      const content = await Deno.readTextFile(this.configPath);
      const configData = this.parseYaml(content);
      this.sources.push({ name: "Config file", data: configData });
      this.logger?.debug(`Loaded config from ${this.configPath}`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        this.logger?.warn(`Config file not found: ${this.configPath}`);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.logger?.warn(`Error loading config file: ${message}`);
      }
    }
  }

  /**
   * Simple YAML parser for our config needs
   */
  private parseYaml(content: string): PartialConfigData {
    const config: PartialConfigData = {};
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
        const parsedValue = this.parseValue(value);
        
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

  /**
   * Parse YAML value to appropriate type
   */
  private parseValue(value: string): string | number | boolean {
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
   * Convert section.field to SECTION_FIELD for env vars
   */
  private toEnvVar(section: string, field: string): string {
    return `${this.envPrefix}_${section}_${field}`.toUpperCase();
  }

  /**
   * Convert section.field to --section-field for CLI args
   */
  private toCliArg(section: string, field: string): string {
    return `--${section}-${field}`.toLowerCase();
  }

  /**
   * Load configuration from environment variables dynamically based on schema
   */
  private loadEnvironmentVariables(): void {
    const envConfig: PartialConfigData = {};

    for (const [section, sectionDef] of Object.entries(this.schema)) {
      // Top-level field (no nested section)
      if ("default" in sectionDef) {
        const envVar = `${this.envPrefix}_${section}`.toUpperCase();
        const value = Deno.env.get(envVar);
        if (value !== undefined) {
          envConfig[section] = this.parseValue(value);
        }
      } 
      // Nested section
      else {
        for (const [field] of Object.entries(sectionDef)) {
          const envVar = this.toEnvVar(section, field);
          const value = Deno.env.get(envVar);
          if (value !== undefined) {
            if (!envConfig[section]) {
              envConfig[section] = {};
            }
            const sectionData = envConfig[section];
            if (typeof sectionData === "object") {
              sectionData[field] = this.parseValue(value);
            }
          }
        }
      }
    }

    if (Object.keys(envConfig).length > 0) {
      this.sources.push({ name: "Environment variables", data: envConfig });
    }
  }

  /**
   * Load configuration from CLI arguments dynamically based on schema
   */
  private loadCliArguments(): void {
    const args = Deno.args;
    const cliConfig: PartialConfigData = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      for (const [section, sectionDef] of Object.entries(this.schema)) {
        // Top-level field
        if ("default" in sectionDef) {
          const cliArg = `--${section}`.toLowerCase();
          const cliArgEq = `${cliArg}=`;
          
          if (arg.startsWith(cliArgEq)) {
            cliConfig[section] = this.parseValue(arg.substring(cliArgEq.length));
          } else if (arg === cliArg || arg === `-${section[0]}`) {
            cliConfig[section] = this.parseValue(args[++i]);
          }
        }
        // Nested section
        else {
          for (const [field] of Object.entries(sectionDef)) {
            const cliArg = this.toCliArg(section, field);
            const cliArgEq = `${cliArg}=`;

            if (arg.startsWith(cliArgEq)) {
              if (!cliConfig[section]) {
                cliConfig[section] = {};
              }
              const sectionData = cliConfig[section];
              if (typeof sectionData === "object") {
                sectionData[field] = this.parseValue(arg.substring(cliArgEq.length));
              }
            } else if (arg === cliArg) {
              if (!cliConfig[section]) {
                cliConfig[section] = {};
              }
              const sectionData = cliConfig[section];
              if (typeof sectionData === "object") {
                sectionData[field] = this.parseValue(args[++i]);
              }
            }
          }
        }
      }
    }

    if (Object.keys(cliConfig).length > 0) {
      this.sources.push({ name: "CLI arguments", data: cliConfig });
    }
  }

  /**
   * Get a configuration value with fallback to default from schema
   */
  private getValue<T extends ConfigValue>(
    section: string,
    field: string | null,
    fieldDef: ConfigFieldDef<T>,
  ): T {
    // Check sources in reverse order (CLI > Env > File)
    for (let i = this.sources.length - 1; i >= 0; i--) {
      const sourceData = this.sources[i].data;
      
      // Top-level field
      if (field === null) {
        const value = sourceData[section];
        if (value !== undefined && typeof value !== "object") {
          // Apply transform if available
          if (fieldDef.transform && typeof value === "string") {
            return fieldDef.transform(value);
          }
          return value as T;
        }
      }
      // Nested field
      else {
        const sectionData = sourceData[section];
        if (sectionData && typeof sectionData === "object") {
          const value = sectionData[field];
          if (value !== undefined) {
            // Apply transform if available
            if (fieldDef.transform && typeof value === "string") {
              return fieldDef.transform(value);
            }
            return value as T;
          }
        }
      }
    }
    
    return fieldDef.default;
  }

  /**
   * Resolve all configuration values based on schema
   */
  resolve(): ResolvedFromSchema<S> {
    const resolved: Record<string, ConfigValue | Record<string, ConfigValue>> = {};

    for (const [section, sectionDef] of Object.entries(this.schema)) {
      // Top-level field
      if ("default" in sectionDef) {
        resolved[section] = this.getValue(section, null, sectionDef as ConfigFieldDef);
      }
      // Nested section
      else {
        resolved[section] = {};
        const resolvedSection = resolved[section];
        if (typeof resolvedSection === "object") {
          for (const [field, fieldDef] of Object.entries(sectionDef)) {
            resolvedSection[field] = this.getValue(section, field, fieldDef as ConfigFieldDef);
          }
        }
      }
    }

    return resolved as ResolvedFromSchema<S>;
  }

  /**
   * Show configuration - nice formatted output
   */
  showConfig(resolved: ResolvedFromSchema<S>): void {
    if (!this.logger?.info) return;

    this.logger.info("Configuration loaded:");
    
    // Show resolved values
    for (const [key, value] of Object.entries(resolved)) {
      if (typeof value === "object") {
        for (const [subKey, subValue] of Object.entries(value)) {
          this.logger.info(`  ${key}.${subKey} = ${subValue}`);
        }
      } else {
        this.logger.info(`  ${key} = ${value}`);
      }
    }

    // Show sources in debug mode
    if (this.logger.debug && this.sources.length > 0) {
      this.logger.debug("Config sources:");
      for (const source of this.sources) {
        this.logger.debug(`  - ${source.name}`);
      }
    }
  }
  
  /**
   * Debug configuration - show all sources and final values (verbose)
   */
  debugConfig(resolved: ResolvedFromSchema<S>): void {
    if (!this.logger?.debug) return;

    this.logger.debug("=== Configuration Debug ===");
    
    // Show sources with data
    this.logger.debug(`Config sources loaded: ${this.sources.length}`);
    for (const source of this.sources) {
      this.logger.debug(`  - ${source.name}: ${JSON.stringify(source.data)}`);
    }

    // Show resolved values
    this.logger.debug("Resolved configuration:");
    for (const [key, value] of Object.entries(resolved)) {
      if (typeof value === "object") {
        this.logger.debug(`  ${key}:`);
        for (const [subKey, subValue] of Object.entries(value)) {
          this.logger.debug(`    ${subKey}: ${subValue}`);
        }
      } else {
        this.logger.debug(`  ${key}: ${value}`);
      }
    }
    this.logger.debug("=========================");
  }
}

/**
 * Create and load configuration with a given schema
 */
export async function loadConfig<S extends ConfigSchema>(
  schema: S,
  configPath: string,
  envPrefix: string = "INTRAF",
  logger?: { warn: (msg: string) => void; info: (msg: string) => void; debug: (msg: string) => void },
): Promise<ResolvedFromSchema<S>> {
  const config = new Config(schema, configPath, envPrefix, logger);
  await config.load();
  const resolved = config.resolve();
  config.showConfig(resolved);
  config.debugConfig(resolved);
  return resolved;
}

/**
 * Example schema definition (for reference)
 */
export const exampleSchema = {
  server: {
    host: { default: "0.0.0.0" },
    port: { default: 8000 },
  },
  client: {
    serverUrl: { default: "ws://127.0.0.1:8000" },
    reconnectDelay: { default: 1000 },
  },
  logLevel: { 
    default: parseLogLevel("info"),
    transform: parseLogLevel,
  },
} satisfies ConfigSchema;

// Type inference test
export type ExampleConfig = ResolvedFromSchema<typeof exampleSchema>;
