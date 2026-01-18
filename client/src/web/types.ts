/**
 * Web server types for the client dashboard
 */

import type { ConnectionState } from "../connection/state.ts";

export interface ConnectionStatus {
  connected: boolean;
  clientId: string | null;
  serverUrl: string;
  reconnectAttempts: number;
  lastConnected: Date | null;
  state?: ConnectionState;
  stateDescription?: string;
}

export interface DashboardState {
  connectionStatus: ConnectionStatus;
}

/**
 * WebSocket message types for web dashboard communication
 */
export enum WebDashboardMessageType {
  STATUS_UPDATE = "status_update",
  LOG_ENTRY = "log_entry",
  SERVER_EVENT = "server_event",
}

export interface WebDashboardMessage {
  type: WebDashboardMessageType;
}

export interface StatusUpdateMessage extends WebDashboardMessage {
  type: WebDashboardMessageType.STATUS_UPDATE;
  status: ConnectionStatus;
}

export interface LogEntryMessage extends WebDashboardMessage {
  type: WebDashboardMessageType.LOG_ENTRY;
  timestamp: string;
  level: string;
  prefix: string;
  message: string;
}

export interface ServerEventMessage extends WebDashboardMessage {
  type: WebDashboardMessageType.SERVER_EVENT;
  event: string;
  data: unknown;
}
