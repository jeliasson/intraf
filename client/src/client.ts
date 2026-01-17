import { Logger, parseLogLevel } from "../../common/src/cli/logger.ts";
import { loadConfig, ConfigSchema } from "../../common/src/config.ts";
import { WebSocketEventHandler } from "./ws/events.ts";

// Define client configuration schema
const clientSchema = {
  server: {
    host: { default: "127.0.0.1", description: "WebSocket server host" },
    port: { default: 8000, description: "WebSocket server port" },
    reconnectDelay: { default: 1000, description: "Initial delay before connecting (ms)" },
    reconnectEnabled: { default: true, description: "Enable automatic reconnection" },
    reconnectInterval: { default: 5000, description: "Delay between reconnection attempts (ms)" },
    reconnectMaxAttempts: { default: 0, description: "Maximum reconnection attempts (0 = infinite)" },
    reconnectBackoff: { default: true, description: "Use exponential backoff for reconnection" },
    reconnectMaxDelay: { default: 30000, description: "Maximum reconnection delay (ms)" },
  },
  log: {
    level: { 
      default: parseLogLevel("info"),
      transform: parseLogLevel,
      description: "Log level (debug, info, warn, error, critical)",
    },
  }
} satisfies ConfigSchema;

// Initialize temporary logger for config loading
const tempLogger = new Logger("CLIENT");

// Load configuration with client schema
const config = await loadConfig(clientSchema, "./intraf.yaml", "INTRAF", tempLogger);

// Re-initialize logger with configured log level
const logger = new Logger("CLIENT", config.log.level);

logger.info(`Starting client with log level: ${logger.getLevelName()}`);

/**
 * WebSocket client with automatic reconnection support
 */
class ReconnectingWebSocketClient {
  private ws: WebSocket | null = null;
  private events: WebSocketEventHandler | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: number | null = null;
  private intentionalClose = false;

  constructor(
    private host: string,
    private port: number,
    private logger: Logger,
    private reconnectEnabled: boolean,
    private reconnectInterval: number,
    private reconnectMaxAttempts: number,
    private reconnectBackoff: boolean,
    private reconnectMaxDelay: number,
  ) {}

  /**
   * Calculate reconnection delay with optional exponential backoff
   */
  private getReconnectDelay(): number {
    if (!this.reconnectBackoff) {
      return this.reconnectInterval;
    }

    // Exponential backoff: interval * 2^attempts
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    return Math.min(delay, this.reconnectMaxDelay);
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.logger.warn("Already connected");
      return;
    }

    try {
      const url = `ws://${this.host}:${this.port}`;
      this.logger.info(`Connecting to ${url}...`);
      this.ws = new WebSocket(url);

      // Create event handler for this connection
      this.events = new WebSocketEventHandler(this.ws, this.logger);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0; // Reset on successful connection
        if (this.events) {
          this.events.onOpen();
        }
      };

      this.ws.onmessage = (event) => {
        if (this.events) {
          void this.events.onMessage(event);
        }
      };

      this.ws.onerror = (err) => {
        if (this.events) {
          this.events.onError(err);
        }
      };

      this.ws.onclose = () => {
        if (this.events) {
          this.events.onClose();
        }
        this.handleDisconnect();
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Connection error: ${message}`);
      this.handleDisconnect();
    }
  }

  /**
   * Handle disconnection and attempt reconnection if enabled
   */
  private handleDisconnect(): void {
    // Clear any existing reconnection timeout
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Don't reconnect if it was an intentional close
    if (this.intentionalClose) {
      this.logger.info("Connection closed intentionally");
      return;
    }

    // Don't reconnect if disabled
    if (!this.reconnectEnabled) {
      this.logger.info("Reconnection disabled");
      return;
    }

    // Check if max attempts reached (0 means infinite)
    if (this.reconnectMaxAttempts > 0 && this.reconnectAttempts >= this.reconnectMaxAttempts) {
      this.logger.error(`Maximum reconnection attempts (${this.reconnectMaxAttempts}) reached`);
      return;
    }

    // Calculate delay and schedule reconnection
    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;
    
    const maxAttemptsDisplay = this.reconnectMaxAttempts > 0 
      ? this.reconnectMaxAttempts.toString() 
      : "∞";
    
    const delaySeconds = (delay / 1000).toFixed(1);
    
    this.logger.info(
      `Reconnecting in ${delaySeconds}s (attempt ${this.reconnectAttempts}/${maxAttemptsDisplay})...`
    );

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Close the connection intentionally (will not trigger reconnection)
   */
  close(): void {
    this.intentionalClose = true;
    
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create client instance
const client = new ReconnectingWebSocketClient(
  config.server.host,
  config.server.port,
  logger,
  config.server.reconnectEnabled,
  config.server.reconnectInterval,
  config.server.reconnectMaxAttempts,
  config.server.reconnectBackoff,
  config.server.reconnectMaxDelay,
);

// Initial delay before first connection
await new Promise(resolve => setTimeout(resolve, config.server.reconnectDelay));

// Start connection
client.connect();

// Handle process signals for graceful shutdown
Deno.addSignalListener("SIGINT", () => {
  logger.info("Received SIGINT, closing connection...");
  client.close();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", () => {
  logger.info("Received SIGTERM, closing connection...");
  client.close();
  Deno.exit(0);
});
