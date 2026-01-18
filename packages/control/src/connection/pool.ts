/**
 * Connection pool manager for WebSocket connections
 * 
 * Manages active connections with:
 * - Connection limits and rejection
 * - Connection tracking and cleanup
 * - Graceful shutdown support
 * - Connection draining for restarts
 */

import { Logger } from "@intraf/common/src/cli/logger.ts";
import type { ClientId } from "@intraf/common/src/types/messages.ts";

/**
 * Connection metadata
 */
export interface ConnectionInfo {
  clientId: ClientId;
  socket: WebSocket;
  ipAddress: string;
  connectedAt: Date;
  lastActivity: Date;
  authenticated: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Pool statistics
 */
export interface PoolStats {
  active: number;
  limit: number;
  totalConnected: number;
  totalDisconnected: number;
  rejected: number;
  rejectedPerIp: number;
}

/**
 * Rejection reason
 */
export enum RejectionReason {
  POOL_FULL = "POOL_FULL",
  IP_LIMIT_REACHED = "IP_LIMIT_REACHED",
  DRAINING = "DRAINING",
}

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  maxConnections: number;
  maxConnectionsPerIp: number;
  enableDraining?: boolean;
}

/**
 * Connection pool manager
 */
export class ConnectionPool {
  private connections = new Map<ClientId, ConnectionInfo>();
  private ipConnections = new Map<string, Set<ClientId>>();
  private draining = false;
  private stats = {
    totalConnected: 0,
    totalDisconnected: 0,
    rejected: 0,
    rejectedPerIp: 0,
  };

  constructor(
    private config: PoolConfig,
    private logger: Logger
  ) {}

  /**
   * Check if pool can accept new connections
   * Returns null if can accept, or rejection reason if cannot
   */
  canAccept(ipAddress?: string): RejectionReason | null {
    if (this.draining) {
      return RejectionReason.DRAINING;
    }

    if (this.connections.size >= this.config.maxConnections) {
      return RejectionReason.POOL_FULL;
    }

    // Check IP-based limit if IP address provided
    if (ipAddress) {
      const ipConns = this.ipConnections.get(ipAddress);
      if (ipConns && ipConns.size >= this.config.maxConnectionsPerIp) {
        return RejectionReason.IP_LIMIT_REACHED;
      }
    }

    return null;
  }

  /**
   * Get number of connections from an IP address
   */
  getConnectionCountByIp(ipAddress: string): number {
    return this.ipConnections.get(ipAddress)?.size ?? 0;
  }

  /**
   * Add connection to pool
   * Returns null if added successfully, or rejection reason if rejected
   */
  add(info: ConnectionInfo): RejectionReason | null {
    const rejection = this.canAccept(info.ipAddress);
    
    if (rejection) {
      if (rejection === RejectionReason.POOL_FULL) {
        this.stats.rejected++;
        this.logger.warn(
          `Connection rejected: pool full (${this.connections.size}/${this.config.maxConnections})`
        );
      } else if (rejection === RejectionReason.IP_LIMIT_REACHED) {
        this.stats.rejectedPerIp++;
        const count = this.getConnectionCountByIp(info.ipAddress);
        this.logger.warn(
          `Connection rejected: IP limit reached for ${info.ipAddress} (${count}/${this.config.maxConnectionsPerIp})`
        );
      } else if (rejection === RejectionReason.DRAINING) {
        this.stats.rejected++;
        this.logger.warn("Connection rejected: pool is draining");
      }
      return rejection;
    }

    // Add to main connections map
    this.connections.set(info.clientId, info);
    
    // Add to IP tracking map
    if (!this.ipConnections.has(info.ipAddress)) {
      this.ipConnections.set(info.ipAddress, new Set());
    }
    this.ipConnections.get(info.ipAddress)!.add(info.clientId);
    
    this.stats.totalConnected++;
    
    const ipCount = this.getConnectionCountByIp(info.ipAddress);
    this.logger.info(
      `Connection added: ${info.clientId} from ${info.ipAddress} ` +
      `(${this.connections.size}/${this.config.maxConnections}, ` +
      `${ipCount}/${this.config.maxConnectionsPerIp} from IP)`
    );

    return null;
  }

  /**
   * Remove connection from pool
   */
  remove(clientId: ClientId): boolean {
    const conn = this.connections.get(clientId);
    if (!conn) {
      return false;
    }

    // Remove from main connections map
    this.connections.delete(clientId);
    
    // Remove from IP tracking map
    const ipSet = this.ipConnections.get(conn.ipAddress);
    if (ipSet) {
      ipSet.delete(clientId);
      // Clean up empty IP sets
      if (ipSet.size === 0) {
        this.ipConnections.delete(conn.ipAddress);
      }
    }
    
    this.stats.totalDisconnected++;
    
    const ipCount = this.getConnectionCountByIp(conn.ipAddress);
    this.logger.info(
      `Connection removed: ${clientId} from ${conn.ipAddress} ` +
      `(${this.connections.size}/${this.config.maxConnections}, ` +
      `${ipCount}/${this.config.maxConnectionsPerIp} from IP)`
    );

    return true;
  }

  /**
   * Get connection info
   */
  get(clientId: ClientId): ConnectionInfo | undefined {
    return this.connections.get(clientId);
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(clientId: ClientId): void {
    const conn = this.connections.get(clientId);
    if (conn) {
      conn.lastActivity = new Date();
    }
  }

  /**
   * Mark connection as authenticated
   */
  markAuthenticated(clientId: ClientId): void {
    const conn = this.connections.get(clientId);
    if (conn) {
      conn.authenticated = true;
      this.logger.debug(`Connection authenticated: ${clientId}`);
    }
  }

  /**
   * Get all active connections
   */
  getAll(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get all client IDs
   */
  getClientIds(): ClientId[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get pool size
   */
  size(): number {
    return this.connections.size;
  }

  /**
   * Check if pool is full
   */
  isFull(): boolean {
    return this.connections.size >= this.config.maxConnections;
  }

  /**
   * Check if pool is draining
   */
  isDraining(): boolean {
    return this.draining;
  }

  /**
   * Start draining connections (reject new, allow existing to finish)
   */
  startDraining(): void {
    if (this.draining) {
      this.logger.warn("Pool already draining");
      return;
    }

    this.draining = true;
    this.logger.info(
      `Started draining connection pool (${this.connections.size} active connections)`
    );
  }

  /**
   * Stop draining (allow new connections again)
   */
  stopDraining(): void {
    this.draining = false;
    this.logger.info("Stopped draining connection pool");
  }

  /**
   * Close all connections gracefully
   */
  async closeAll(code = 1000, reason = "Server shutdown"): Promise<void> {
    this.logger.info(
      `Closing all connections (${this.connections.size} active)...`
    );

    const closePromises: Promise<void>[] = [];

    for (const [clientId, conn] of this.connections.entries()) {
      const promise = new Promise<void>((resolve) => {
        try {
          if (conn.socket.readyState === WebSocket.OPEN) {
            // Set up close handler before closing
            const onClose = () => {
              conn.socket.removeEventListener("close", onClose);
              resolve();
            };
            conn.socket.addEventListener("close", onClose);
            
            // Close with timeout
            conn.socket.close(code, reason);
            
            // Force resolve after timeout
            setTimeout(() => {
              conn.socket.removeEventListener("close", onClose);
              resolve();
            }, 5000);
          } else {
            resolve();
          }
        } catch (error) {
          this.logger.error(`Error closing connection ${clientId}: ${error}`);
          resolve();
        }
      });

      closePromises.push(promise);
    }

    // Wait for all connections to close
    await Promise.all(closePromises);

    this.connections.clear();
    this.ipConnections.clear();
    this.logger.info("All connections closed");
  }

  /**
   * Find and close idle connections
   * Returns number of connections closed
   */
  closeIdleConnections(idleTimeoutMs: number): number {
    const now = Date.now();
    const toClose: ClientId[] = [];

    for (const [clientId, conn] of this.connections.entries()) {
      const idleTime = now - conn.lastActivity.getTime();
      if (idleTime > idleTimeoutMs) {
        toClose.push(clientId);
      }
    }

    for (const clientId of toClose) {
      const conn = this.connections.get(clientId);
      if (conn) {
        try {
          conn.socket.close(1000, "Idle timeout");
        } catch (error) {
          this.logger.error(`Error closing idle connection ${clientId}: ${error}`);
        }
        this.remove(clientId);
      }
    }

    if (toClose.length > 0) {
      this.logger.info(`Closed ${toClose.length} idle connections`);
    }

    return toClose.length;
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    return {
      active: this.connections.size,
      limit: this.config.maxConnections,
      totalConnected: this.stats.totalConnected,
      totalDisconnected: this.stats.totalDisconnected,
      rejected: this.stats.rejected,
      rejectedPerIp: this.stats.rejectedPerIp,
    };
  }

  /**
   * Log pool statistics
   */
  logStats(): void {
    const stats = this.getStats();
    this.logger.info(
      `Pool stats: ${stats.active}/${stats.limit} active, ` +
      `${stats.totalConnected} total connected, ` +
      `${stats.totalDisconnected} disconnected, ` +
      `${stats.rejected} rejected (${stats.rejectedPerIp} per-IP)`
    );
  }
}
