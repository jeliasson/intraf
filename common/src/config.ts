/**
 * Configuration management system
 * Supports multiple sources with precedence: CLI args > Environment variables > Config file
 */

import { LogLevel, parseLogLevel } from "./cli/logger.ts";

export interface ConfigSchema {
  // Server settings
  server?: {
    host?: string;
    port?: number;
  };
  
  // Client settings
  client?: {
    serverUrl?: string;
    reconnectDelay?: number;
  };
  
  // Common settings
  logLevel?: string;
}

export interface ResolvedConfig {
  // Server settings
  serverHost: string;
  serverPort: number;
  
  // Client settings
  clientServerUrl: string;
  clientReconnectDelay: number;
  
  // Common settings
  logLevel: LogLevel;
}

interface ConfigSource {
  name: string;
  data: Partial<ConfigSchema>;
}

export class Config {
  private configFile: Partial<ConfigSchema> = {};
  private sources: ConfigSource[] = [];
  
  constructor(
    private configPath: string,
    private logger?: { warn: (msg: string) => void; debug: (msg: string) => void },
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
      this.configFile = this.parseYaml(content);
      this.sources.push({ name: "Config file", data: this.configFile });
      this.logger?.debug(`Loaded config from ${this.configPath}`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        this.logger?.warn(`Config file not found: ${this.configPath}`);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.logger?.warn(`Error loading config file: ${message}`);
      }
      this.configFile = {};
    }
  }

  /**
   * Simple YAML parser for our config needs
   */
  private parseYaml(content: string): Partial<ConfigSchema> {
    const config: Record<string, Record<string, string | number | boolean> | string | number | boolean> = {};
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
          if (typeof section === "object" && !Array.isArray(section)) {
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
   * Load configuration from environment variables
   */
  private loadEnvironmentVariables(): void {
    const envConfig: Partial<ConfigSchema> = {};

    // Server settings
    const serverHost = Deno.env.get("INTRAF_SERVER_HOST");
    const serverPort = Deno.env.get("INTRAF_SERVER_PORT");
    if (serverHost || serverPort) {
      envConfig.server = {};
      if (serverHost) envConfig.server.host = serverHost;
      if (serverPort) envConfig.server.port = parseInt(serverPort, 10);
    }

    // Client settings
    const clientServerUrl = Deno.env.get("INTRAF_CLIENT_SERVER_URL");
    const clientReconnectDelay = Deno.env.get("INTRAF_CLIENT_RECONNECT_DELAY");
    if (clientServerUrl || clientReconnectDelay) {
      envConfig.client = {};
      if (clientServerUrl) envConfig.client.serverUrl = clientServerUrl;
      if (clientReconnectDelay) envConfig.client.reconnectDelay = parseInt(clientReconnectDelay, 10);
    }

    // Common settings
    const logLevel = Deno.env.get("INTRAF_LOG_LEVEL");
    if (logLevel) {
      envConfig.logLevel = logLevel;
    }

    if (Object.keys(envConfig).length > 0) {
      this.sources.push({ name: "Environment variables", data: envConfig });
    }
  }

  /**
   * Load configuration from CLI arguments
   */
  private loadCliArguments(): void {
    const args = Deno.args;
    const cliConfig: Partial<ConfigSchema> = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // Server settings
      if (arg.startsWith("--server-host=")) {
        cliConfig.server = cliConfig.server || {};
        cliConfig.server.host = arg.split("=")[1];
      } else if (arg === "--server-host") {
        cliConfig.server = cliConfig.server || {};
        cliConfig.server.host = args[++i];
      } else if (arg.startsWith("--server-port=")) {
        cliConfig.server = cliConfig.server || {};
        cliConfig.server.port = parseInt(arg.split("=")[1], 10);
      } else if (arg === "--server-port") {
        cliConfig.server = cliConfig.server || {};
        cliConfig.server.port = parseInt(args[++i], 10);
      }

      // Client settings
      else if (arg.startsWith("--server=")) {
        cliConfig.client = cliConfig.client || {};
        cliConfig.client.serverUrl = arg.split("=")[1];
      } else if (arg === "--server") {
        cliConfig.client = cliConfig.client || {};
        cliConfig.client.serverUrl = args[++i];
      } else if (arg.startsWith("--reconnect-delay=")) {
        cliConfig.client = cliConfig.client || {};
        cliConfig.client.reconnectDelay = parseInt(arg.split("=")[1], 10);
      } else if (arg === "--reconnect-delay") {
        cliConfig.client = cliConfig.client || {};
        cliConfig.client.reconnectDelay = parseInt(args[++i], 10);
      }

      // Common settings
      else if (arg.startsWith("--log-level=")) {
        cliConfig.logLevel = arg.split("=")[1];
      } else if (arg === "--log-level" || arg === "-l") {
        cliConfig.logLevel = args[++i];
      }
    }

    if (Object.keys(cliConfig).length > 0) {
      this.sources.push({ name: "CLI arguments", data: cliConfig });
    }
  }

  /**
   * Get a configuration value with fallback
   */
  private getValue<T>(
    getter: (config: Partial<ConfigSchema>) => T | undefined,
    defaultValue: T,
  ): T {
    // Check sources in reverse order (CLI > Env > File)
    for (let i = this.sources.length - 1; i >= 0; i--) {
      const value = getter(this.sources[i].data);
      if (value !== undefined) {
        return value;
      }
    }
    return defaultValue;
  }

  /**
   * Resolve all configuration values
   */
  resolve(): ResolvedConfig {
    return {
      // Server settings
      serverHost: this.getValue(
        (c) => c.server?.host,
        "0.0.0.0",
      ),
      serverPort: this.getValue(
        (c) => c.server?.port,
        8000,
      ),

      // Client settings
      clientServerUrl: this.getValue(
        (c) => c.client?.serverUrl,
        "ws://127.0.0.1:8000",
      ),
      clientReconnectDelay: this.getValue(
        (c) => c.client?.reconnectDelay,
        1000,
      ),

      // Common settings
      logLevel: parseLogLevel(
        this.getValue(
          (c) => c.logLevel,
          "info",
        ),
      ),
    };
  }

  /**
   * Debug configuration - show all sources and final values
   */
  debugConfig(resolved: ResolvedConfig): void {
    if (!this.logger?.debug) return;

    this.logger.debug("=== Configuration Debug ===");
    
    // Show sources
    this.logger.debug(`Config sources loaded: ${this.sources.length}`);
    for (const source of this.sources) {
      this.logger.debug(`  - ${source.name}: ${JSON.stringify(source.data)}`);
    }

    // Show resolved values
    this.logger.debug("Resolved configuration:");
    this.logger.debug(`  Server: ${resolved.serverHost}:${resolved.serverPort}`);
    this.logger.debug(`  Client server URL: ${resolved.clientServerUrl}`);
    this.logger.debug(`  Client reconnect delay: ${resolved.clientReconnectDelay}ms`);
    this.logger.debug(`  Log level: ${resolved.logLevel}`);
    this.logger.debug("=========================");
  }
}

/**
 * Create and load configuration
 */
export async function loadConfig(
  configPath: string,
  logger?: { warn: (msg: string) => void; debug: (msg: string) => void },
): Promise<ResolvedConfig> {
  const config = new Config(configPath, logger);
  await config.load();
  const resolved = config.resolve();
  config.debugConfig(resolved);
  return resolved;
}
