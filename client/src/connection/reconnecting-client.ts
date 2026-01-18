/**
 * Reconnecting WebSocket client with automatic reconnection support
 */

import { Logger } from "../../../common/src/cli/logger.ts";
import { MSG_CONNECTION_CLOSED_INTENTIONALLY } from "../../../common/src/constants.ts";
import { ConnectionError, getErrorMessage } from "../../../common/src/errors/index.ts";
import { WebSocketEventHandler } from "../ws/events.ts";
import { WebServer } from "../web/server.ts";
import { ConnectionStateMachine, ConnectionState, ConnectionEvent } from "./state.ts";

export class ReconnectingWebSocketClient {
  private ws: WebSocket | null = null;
  private events: WebSocketEventHandler | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: number | undefined = undefined;
  private connectionTimeoutId: number | undefined = undefined;
  private intentionalClose = false;
  private clientId: string | null = null;
  private lastConnected: Date | null = null;
  private webServer: WebServer | null = null;
  private stateMachine: ConnectionStateMachine;

  constructor(
    private host: string,
    private port: number,
    private logger: Logger,
    private reconnectEnabled: boolean,
    private reconnectInterval: number,
    private reconnectMaxAttempts: number,
    private reconnectBackoff: boolean,
    private reconnectMaxDelay: number,
    private connectionTimeout: number,
  ) {
    this.stateMachine = new ConnectionStateMachine(logger);
    
    // Listen to state changes and update web server
    this.stateMachine.addListener((state) => {
      this.updateWebServerStatus();
    });
  }

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
        connected: this.stateMachine.isActive(),
        clientId: this.clientId,
        serverUrl: `ws://${this.host}:${this.port}`,
        reconnectAttempts: this.reconnectAttempts,
        lastConnected: this.lastConnected,
        state: this.stateMachine.getState(),
        stateDescription: this.stateMachine.getStateDescription(),
      });
    }
  }

  /**
   * Set client ID (called when server assigns ID)
   */
  setClientId(id: string): void {
    this.clientId = id;
    
    // Transition to READY state when client ID is assigned
    this.stateMachine.transition(ConnectionEvent.CLIENT_ID_ASSIGNED);
    this.updateWebServerStatus();
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.stateMachine.isActive()) {
      this.logger.warn("Already connected or connecting");
      return;
    }

    // Transition to CONNECTING state
    this.stateMachine.transition(ConnectionEvent.CONNECT_REQUESTED);
    
    // Track connection start time to detect immediate failures
    const connectionStartTime = Date.now();

    // Set connection timeout
    this.connectionTimeoutId = setTimeout(() => {
      if (this.stateMachine.is(ConnectionState.CONNECTING)) {
        this.logger.error(`Connection timeout after ${this.connectionTimeout}ms`);
        if (this.ws) {
          this.ws.close();
        }
        this.stateMachine.transition(ConnectionEvent.CONNECTION_ERROR);
        this.handleDisconnect(new Error("Connection timeout"));
      }
    }, this.connectionTimeout);

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
        // Clear connection timeout
        if (this.connectionTimeoutId !== undefined) {
          clearTimeout(this.connectionTimeoutId);
          this.connectionTimeoutId = undefined;
        }

        this.reconnectAttempts = 0; // Reset on successful connection
        this.lastConnected = new Date();
        
        // Transition to CONNECTED state
        this.stateMachine.transition(ConnectionEvent.CONNECTION_OPENED);
        
        // Immediately transition to AUTHENTICATED since auth is disabled
        this.stateMachine.transition(ConnectionEvent.AUTH_COMPLETED);
        
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
        // Clear connection timeout
        if (this.connectionTimeoutId !== undefined) {
          clearTimeout(this.connectionTimeoutId);
          this.connectionTimeoutId = undefined;
        }

        // Transition to DISCONNECTED on error
        this.stateMachine.transition(ConnectionEvent.CONNECTION_ERROR);
        
        // Detect immediate failures (< 100ms) which are likely server rejections
        const connectionDuration = Date.now() - connectionStartTime;
        if (connectionDuration < 100 && this.reconnectAttempts > 0) {
          this.logger.error("Server rejected connection - may be at capacity, shutting down, or per-IP limit reached");
        } else if (this.events) {
          this.events.onError(err);
        }
      };

      this.ws.onclose = () => {
        // Clear connection timeout
        if (this.connectionTimeoutId !== undefined) {
          clearTimeout(this.connectionTimeoutId);
          this.connectionTimeoutId = undefined;
        }

        // Transition to DISCONNECTED state (only if not already disconnected)
        // This handles the case where onerror already transitioned to DISCONNECTED
        if (!this.stateMachine.is(ConnectionState.DISCONNECTED)) {
          if (!this.intentionalClose) {
            this.stateMachine.transition(ConnectionEvent.CONNECTION_CLOSED);
          } else {
            this.stateMachine.transition(ConnectionEvent.DISCONNECT_REQUESTED);
          }
        }
        
        if (this.events) {
          this.events.onClose();
        }
        this.handleDisconnect();
      };
    } catch (error) {
      // Transition to DISCONNECTED on connection failure
      this.stateMachine.transition(ConnectionEvent.CONNECTION_ERROR);
      
      const message = getErrorMessage(error);
      this.logger.error(`Connection error: ${message}`);
      this.handleDisconnect(error);
    }
  }

  /**
   * Handle disconnection and attempt reconnection if enabled
   */
  private handleDisconnect(error?: unknown): void {
    this.updateWebServerStatus();
    
    // Clear any existing timeouts
    if (this.reconnectTimeoutId !== undefined) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }
    if (this.connectionTimeoutId !== undefined) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = undefined;
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
      const errorInfo = error ? ` (${getErrorMessage(error)})` : "";
      this.logger.error(`Maximum reconnection attempts (${this.reconnectMaxAttempts}) reached${errorInfo}`);
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
    
    // Clear all timeouts
    if (this.reconnectTimeoutId !== undefined) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }
    if (this.connectionTimeoutId !== undefined) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Reset state machine to DISCONNECTED
    this.stateMachine.reset();
  }
  
  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.stateMachine.getState();
  }
  
  /**
   * Check if connection is ready for operations
   */
  isReady(): boolean {
    return this.stateMachine.isReady();
  }
  
  /**
   * Send message through WebSocket (only if ready)
   * Returns true if message was sent, false otherwise
   */
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): boolean {
    if (!this.stateMachine.isActive()) {
      this.logger.warn("Cannot send message: connection not active");
      return false;
    }
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn("Cannot send message: WebSocket not open");
      return false;
    }
    
    try {
      this.ws.send(data);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message: ${getErrorMessage(error)}`);
      return false;
    }
  }
  
  /**
   * Get WebSocket instance (for event handlers)
   * Use with caution - prefer using send() method
   */
  getSocket(): WebSocket | null {
    return this.ws;
  }
}
