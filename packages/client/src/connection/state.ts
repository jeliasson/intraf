/**
 * Connection state machine for WebSocket client
 * 
 * State transitions:
 * DISCONNECTED → CONNECTING → CONNECTED → AUTHENTICATED → READY
 *                     ↓            ↓              ↓          ↓
 *                DISCONNECTED ← ← ← ← ← ← ← ← ← ← ←
 */

import { Logger } from "@intraf/common/src/cli/logger.ts";

/**
 * Connection lifecycle states
 */
export enum ConnectionState {
  /** No active connection, not attempting to connect */
  DISCONNECTED = "DISCONNECTED",
  
  /** Attempting to establish WebSocket connection */
  CONNECTING = "CONNECTING",
  
  /** WebSocket connection established, waiting for authentication */
  CONNECTED = "CONNECTED",
  
  /** Authentication completed (or skipped if disabled) */
  AUTHENTICATED = "AUTHENTICATED",
  
  /** Fully operational and ready to handle requests */
  READY = "READY",
}

/**
 * Events that trigger state transitions
 */
export enum ConnectionEvent {
  CONNECT_REQUESTED = "CONNECT_REQUESTED",
  CONNECTION_OPENED = "CONNECTION_OPENED",
  CONNECTION_CLOSED = "CONNECTION_CLOSED",
  CONNECTION_ERROR = "CONNECTION_ERROR",
  AUTH_COMPLETED = "AUTH_COMPLETED",
  CLIENT_ID_ASSIGNED = "CLIENT_ID_ASSIGNED",
  DISCONNECT_REQUESTED = "DISCONNECT_REQUESTED",
}

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<ConnectionState, Partial<Record<ConnectionEvent, ConnectionState>>> = {
  [ConnectionState.DISCONNECTED]: {
    [ConnectionEvent.CONNECT_REQUESTED]: ConnectionState.CONNECTING,
    // Allow idempotent transitions (already disconnected, stay disconnected)
    [ConnectionEvent.CONNECTION_ERROR]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.CONNECTION_CLOSED]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.DISCONNECT_REQUESTED]: ConnectionState.DISCONNECTED,
  },
  [ConnectionState.CONNECTING]: {
    [ConnectionEvent.CONNECTION_OPENED]: ConnectionState.CONNECTED,
    [ConnectionEvent.CONNECTION_ERROR]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.CONNECTION_CLOSED]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.DISCONNECT_REQUESTED]: ConnectionState.DISCONNECTED,
  },
  [ConnectionState.CONNECTED]: {
    [ConnectionEvent.AUTH_COMPLETED]: ConnectionState.AUTHENTICATED,
    [ConnectionEvent.CONNECTION_CLOSED]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.CONNECTION_ERROR]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.DISCONNECT_REQUESTED]: ConnectionState.DISCONNECTED,
  },
  [ConnectionState.AUTHENTICATED]: {
    [ConnectionEvent.CLIENT_ID_ASSIGNED]: ConnectionState.READY,
    [ConnectionEvent.CONNECTION_CLOSED]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.CONNECTION_ERROR]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.DISCONNECT_REQUESTED]: ConnectionState.DISCONNECTED,
  },
  [ConnectionState.READY]: {
    [ConnectionEvent.CONNECTION_CLOSED]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.CONNECTION_ERROR]: ConnectionState.DISCONNECTED,
    [ConnectionEvent.DISCONNECT_REQUESTED]: ConnectionState.DISCONNECTED,
  },
};

/**
 * Connection state machine with transition validation
 */
export class ConnectionStateMachine {
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private listeners: Array<(state: ConnectionState, event: ConnectionEvent) => void> = [];

  constructor(private logger: Logger) {}

  /**
   * Get current state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if in a specific state
   */
  is(state: ConnectionState): boolean {
    return this.state === state;
  }

  /**
   * Check if connection is operational
   */
  isReady(): boolean {
    return this.state === ConnectionState.READY;
  }

  /**
   * Check if connection is active (connected, authenticated, or ready)
   */
  isActive(): boolean {
    return this.state === ConnectionState.CONNECTED ||
           this.state === ConnectionState.AUTHENTICATED ||
           this.state === ConnectionState.READY;
  }

  /**
   * Attempt state transition
   * Returns true if transition was valid and applied
   */
  transition(event: ConnectionEvent): boolean {
    const validTransitions = VALID_TRANSITIONS[this.state];
    const nextState = validTransitions[event];

    if (!nextState) {
      this.logger.warn(
        `Invalid transition: ${event} in state ${this.state}`
      );
      return false;
    }

    const previousState = this.state;
    this.state = nextState;
    
    // Only log non-idempotent transitions (state actually changed)
    if (previousState !== nextState) {
      this.logger.debug(
        `State transition: ${previousState} → ${nextState} (${event})`
      );
    }

    // Notify listeners (even for idempotent transitions)
    this.notifyListeners(nextState, event);

    return true;
  }

  /**
   * Force state change (for recovery scenarios)
   * Use sparingly - prefer transition() for normal flow
   */
  forceState(state: ConnectionState, reason: string): void {
    const previousState = this.state;
    this.state = state;
    
    this.logger.warn(
      `Forced state change: ${previousState} → ${state} (${reason})`
    );

    // Notify listeners with a synthetic event
    this.notifyListeners(state, ConnectionEvent.CONNECTION_ERROR);
  }

  /**
   * Reset to disconnected state
   */
  reset(): void {
    if (this.state !== ConnectionState.DISCONNECTED) {
      this.forceState(ConnectionState.DISCONNECTED, "reset");
    }
  }

  /**
   * Add state change listener
   */
  addListener(listener: (state: ConnectionState, event: ConnectionEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove state change listener
   */
  removeListener(listener: (state: ConnectionState, event: ConnectionEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(state: ConnectionState, event: ConnectionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(state, event);
      } catch (error) {
        this.logger.error(`State listener error: ${error}`);
      }
    }
  }

  /**
   * Get human-readable state description
   */
  getStateDescription(): string {
    switch (this.state) {
      case ConnectionState.DISCONNECTED:
        return "Disconnected";
      case ConnectionState.CONNECTING:
        return "Connecting...";
      case ConnectionState.CONNECTED:
        return "Connected, authenticating...";
      case ConnectionState.AUTHENTICATED:
        return "Authenticated, initializing...";
      case ConnectionState.READY:
        return "Ready";
      default:
        return "Unknown";
    }
  }
}
