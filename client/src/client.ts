import { Logger, parseLogLevel } from "../../common/src/cli/logger.ts";
import { loadConfig, ConfigSchema } from "../../common/src/config.ts";
import { MSG_CONNECTION_CLOSED_INTENTIONALLY } from "../../common/src/constants.ts";
import { WebSocketEventHandler } from "./ws/events.ts";
import { WebServer } from "./web/server.ts";

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
  web: {
    enabled: { default: true, description: "Enable web dashboard server" },
    host: { default: "127.0.0.1", description: "Web dashboard host address" },
    port: { default: 3000, description: "Web dashboard port" },
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
  private reconnectTimeoutId: number | undefined = undefined;
  private intentionalClose = false;
  private clientId: string | null = null;
  private lastConnected: Date | null = null;
  private webServer: WebServer | null = null;

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
   * Set web server instance for status updates
   */
  setWebServer(webServer: WebServer): void {
    this.webServer = webServer;
    this.updateWebServerStatus();
  }

  /**
   * Update web server with current connection status
   */
  private updateWebServerStatus(): void {
    if (this.webServer) {
      this.webServer.updateConnectionStatus({
        connected: this.ws?.readyState === WebSocket.OPEN,
        clientId: this.clientId,
        serverUrl: `ws://${this.host}:${this.port}`,
        reconnectAttempts: this.reconnectAttempts,
        lastConnected: this.lastConnected,
      });
    }
  }

  /**
   * Set client ID (called when server assigns ID)
   */
  setClientId(id: string): void {
    this.clientId = id;
    this.updateWebServerStatus();
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

      // Create event handler for this connection with client ID callback
      this.events = new WebSocketEventHandler(
        this.ws, 
        this.logger,
        (id: string) => this.setClientId(id)
      );

      this.ws.onopen = () => {
        this.reconnectAttempts = 0; // Reset on successful connection
        this.lastConnected = new Date();
        this.updateWebServerStatus();
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
    this.updateWebServerStatus();
    
    // Clear any existing reconnection timeout
    if (this.reconnectTimeoutId !== undefined) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }

    // Don't reconnect if it was an intentional close
    if (this.intentionalClose) {
      this.logger.info(MSG_CONNECTION_CLOSED_INTENTIONALLY);
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
    this.updateWebServerStatus();
    
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
    
    if (this.reconnectTimeoutId !== undefined) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
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

// Start web server if enabled
let webServer: WebServer | null = null;
if (config.web.enabled) {
  const webLogger = new Logger("WEB", config.log.level);
  webServer = new WebServer(config.web.host, config.web.port, webLogger);
  webServer.start();
  client.setWebServer(webServer);
  
  // Add logger hook to broadcast logs to web clients
  Logger.addHook((level, levelName, prefix, timestamp, message) => {
    if (webServer) {
      webServer.broadcastLogEntry(levelName, prefix, timestamp, message);
    }
  });
}

// Initial delay before first connection
await new Promise(resolve => setTimeout(resolve, config.server.reconnectDelay));

// Start connection
client.connect();

// Handle process signals for graceful shutdown
Deno.addSignalListener("SIGINT", async () => {
  logger.info("Received SIGINT, closing connection...");
  client.close();
  if (webServer) {
    await webServer.stop();
  }
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", async () => {
  logger.info("Received SIGTERM, closing connection...");
  client.close();
  if (webServer) {
    await webServer.stop();
  }
  Deno.exit(0);
});
