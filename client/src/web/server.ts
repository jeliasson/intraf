import { Logger } from "../../../common/src/cli/logger.ts";
import type { DashboardState } from "./types.ts";

/**
 * Web server for client dashboard
 */
export class WebServer {
  private server: Deno.HttpServer | null = null;
  private state: DashboardState;

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

      // Route: Root - Dashboard
      if (url.pathname === "/") {
        return this.handleDashboard();
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
   * Handle dashboard page request
   */
  private handleDashboard(): Response {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>intraf - Client Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 2rem;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    header {
      margin-bottom: 3rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #1e293b;
    }
    
    h1 {
      font-size: 2.5rem;
      color: #60a5fa;
      margin-bottom: 0.5rem;
    }
    
    .subtitle {
      color: #94a3b8;
      font-size: 1.1rem;
    }
    
    .card {
      background: #1e293b;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid #334155;
    }
    
    .card h2 {
      color: #60a5fa;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }
    
    .status-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s ease-in-out infinite;
    }
    
    .status-connected {
      background: #10b981;
    }
    
    .status-disconnected {
      background: #ef4444;
      animation: none;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .info-grid {
      display: grid;
      gap: 1rem;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 4px;
    }
    
    .info-label {
      color: #94a3b8;
      font-weight: 500;
    }
    
    .info-value {
      color: #e2e8f0;
      font-family: 'Courier New', monospace;
    }
    
    .section {
      margin-bottom: 2rem;
    }
    
    .placeholder {
      padding: 2rem;
      text-align: center;
      color: #64748b;
      background: #0f172a;
      border-radius: 4px;
      border: 2px dashed #334155;
    }
    
    .button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }
    
    .button:hover {
      background: #2563eb;
    }
    
    .button:disabled {
      background: #475569;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>intraf</h1>
      <p class="subtitle">Client Dashboard</p>
    </header>
    
    <div class="section">
      <div class="card">
        <h2>Connection Status</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="info-value">
              <span id="status-indicator" class="status-indicator"></span>
              <span id="status-text">Loading...</span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Client ID</span>
            <span class="info-value" id="client-id">-</span>
          </div>
          <div class="info-item">
            <span class="info-label">Server URL</span>
            <span class="info-value" id="server-url">-</span>
          </div>
          <div class="info-item">
            <span class="info-label">Reconnect Attempts</span>
            <span class="info-value" id="reconnect-attempts">-</span>
          </div>
          <div class="info-item">
            <span class="info-label">Last Connected</span>
            <span class="info-value" id="last-connected">-</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="card">
        <h2>Tunnels</h2>
        <div class="placeholder">
          <p>Tunnel management coming soon</p>
          <p style="margin-top: 0.5rem; font-size: 0.9rem;">Create and configure HTTP tunnels to expose local services</p>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="card">
        <h2>Authentication</h2>
        <div class="placeholder">
          <p>Login system coming soon</p>
          <p style="margin-top: 0.5rem; font-size: 0.9rem;">Secure your tunnels with authentication</p>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // Fetch and update status every 2 seconds
    async function updateStatus() {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (data.connected) {
          statusIndicator.className = 'status-indicator status-connected';
          statusText.textContent = 'Connected';
        } else {
          statusIndicator.className = 'status-indicator status-disconnected';
          statusText.textContent = 'Disconnected';
        }
        
        document.getElementById('client-id').textContent = data.clientId || 'Not assigned';
        document.getElementById('server-url').textContent = data.serverUrl || '-';
        document.getElementById('reconnect-attempts').textContent = data.reconnectAttempts;
        document.getElementById('last-connected').textContent = data.lastConnected 
          ? new Date(data.lastConnected).toLocaleString() 
          : 'Never';
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    }
    
    // Initial update
    updateStatus();
    
    // Update every 2 seconds
    setInterval(updateStatus, 2000);
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
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
    if (this.server) {
      await this.server.shutdown();
      this.logger.info("Web dashboard server stopped");
    }
  }
}
