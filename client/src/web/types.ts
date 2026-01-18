/**
 * Web server types for the client dashboard
 */

export interface ConnectionStatus {
  connected: boolean;
  clientId: string | null;
  serverUrl: string;
  reconnectAttempts: number;
  lastConnected: Date | null;
}

export interface DashboardState {
  connectionStatus: ConnectionStatus;
}
