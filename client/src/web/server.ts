import { Logger } from "../../../common/src/cli/logger.ts";
import type { DashboardState, StatusUpdateMessage, LogEntryMessage, WebDashboardMessageType } from "./types.ts";
import { WebDashboardMessageType as MessageType } from "./types.ts";

/**
 * Web server for client dashboard
 */
export class WebServer {
  private server: Deno.HttpServer | null = null;
  private state: DashboardState;
  private wsConnections: Set<WebSocket> = new Set();

  constructor(
    private host: string,
    private port: number,
    private logger: Logger,
  ) {
    // Initialize state
    this.state = {
      connectionStatus: {
        connected: false,
        clientId: null,
        serverUrl: "",
        reconnectAttempts: 0,
        lastConnected: null,
      },
    };
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(status: Partial<DashboardState["connectionStatus"]>): void {
    this.state.connectionStatus = {
      ...this.state.connectionStatus,
      ...status,
    };
    
    // Broadcast status update to all connected WebSocket clients
    this.broadcastStatusUpdate();
  }

  /**
   * Broadcast a log entry to all connected WebSocket clients
   */
  broadcastLogEntry(level: string, prefix: string, timestamp: string, message: string): void {
    const logMessage: LogEntryMessage = {
      type: MessageType.LOG_ENTRY,
      timestamp,
      level,
      prefix,
      message,
    };
    
    this.broadcast(logMessage);
  }

  /**
   * Broadcast status update to all connected WebSocket clients
   */
  private broadcastStatusUpdate(): void {
    const statusMessage: StatusUpdateMessage = {
      type: MessageType.STATUS_UPDATE,
      status: this.state.connectionStatus,
    };
    
    this.broadcast(statusMessage);
  }

  /**
   * Broadcast a message to all connected WebSocket clients
   */
  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    
    this.wsConnections.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      } catch (error) {
        this.logger.debug(`Failed to send message to WebSocket client: ${error}`);
      }
    });
  }

  /**
   * Try to start server on a port, if busy try the next port
   */
  private async tryStartServer(handler: (req: Request) => Response, startPort: number, maxAttempts = 10): Promise<void> {
    let port = startPort;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        this.server = Deno.serve({
          hostname: this.host,
          port: port,
          onListen: ({ hostname, port }) => {
            this.logger.info(`Web dashboard available at http://${hostname}:${port}`);
            if (port !== startPort) {
              this.logger.info(`Note: Port ${startPort} was busy, using port ${port} instead`);
            }
          },
        }, handler);
        return; // Success!
      } catch (error) {
        if (error instanceof Deno.errors.AddrInUse) {
          this.logger.debug(`Port ${port} is busy, trying ${port + 1}...`);
          port++;
          attempts++;
        } else {
          // Some other error, rethrow
          throw error;
        }
      }
    }
    
    // If we get here, all ports were busy
    throw new Error(`Could not find available port after ${maxAttempts} attempts (tried ${startPort}-${startPort + maxAttempts - 1})`);
  }

  /**
   * Start the web server
   */
  start(): void {
    const handler = (req: Request): Response => {
      const url = new URL(req.url);

      // Route: WebSocket upgrade
      if (url.pathname === "/ws") {
        return this.handleWebSocket(req);
      }

      // Route: Root - Dashboard
      if (url.pathname === "/") {
        return this.handleDashboard();
      }

      // Route: Static files
      if (url.pathname === "/styles.css") {
        return this.handleStaticFile("styles.css", "text/css");
      }

      if (url.pathname === "/app.js") {
        return this.handleStaticFile("app.js", "application/javascript");
      }

      // Route: API - Status
      if (url.pathname === "/api/status") {
        return this.handleApiStatus();
      }

      // Route: API - Tunnels (placeholder)
      if (url.pathname === "/api/tunnels") {
        return this.handleApiTunnels();
      }

      // 404 Not Found
      return new Response("Not Found", { status: 404 });
    };

    this.tryStartServer(handler, this.port);
  }

  /**
   * Handle WebSocket upgrade request
   */
  private handleWebSocket(req: Request): Response {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      this.wsConnections.add(socket);
      this.logger.debug(`Web dashboard client connected (${this.wsConnections.size} total)`);
      
      // Send initial status update to new client
      this.broadcastStatusUpdate();
    };
    
    socket.onclose = () => {
      this.wsConnections.delete(socket);
      this.logger.debug(`Web dashboard client disconnected (${this.wsConnections.size} remaining)`);
    };
    
    socket.onerror = (error) => {
      this.logger.debug(`Web dashboard WebSocket error: ${error}`);
      this.wsConnections.delete(socket);
    };
    
    return response;
  }

  /**
   * Handle dashboard page request
   */
  private handleDashboard(): Response {
    return this.handleStaticFile("index.html", "text/html; charset=utf-8");
  }

  /**
   * Handle static file request
   */
  private handleStaticFile(filename: string, contentType: string): Response {
    try {
      const publicDir = new URL("./public/", import.meta.url).pathname;
      const filePath = `${publicDir}${filename}`;
      const content = Deno.readTextFileSync(filePath);
      
      return new Response(content, {
        headers: { "Content-Type": contentType },
      });
    } catch (error) {
      this.logger.error(`Failed to read static file ${filename}: ${error}`);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  /**
   * Handle API status request
   */
  private handleApiStatus(): Response {
    return new Response(JSON.stringify(this.state.connectionStatus), {
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Handle API tunnels request (placeholder)
   */
  private handleApiTunnels(): Response {
    return new Response(JSON.stringify({ tunnels: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Stop the web server
   */
  async stop(): Promise<void> {
    // Close all WebSocket connections
    this.wsConnections.forEach(ws => {
      try {
        ws.close();
      } catch (error) {
        // Ignore close errors
      }
    });
    this.wsConnections.clear();
    
    if (this.server) {
      await this.server.shutdown();
      this.logger.info("Web dashboard server stopped");
    }
  }
}
