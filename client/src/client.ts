import {
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  HEARTBEAT_PING,
  HEARTBEAT_PONG,
} from "../../common/src/websocket.ts";
import {
  type ClientId,
  isClientIdMessage,
} from "../../common/src/types.ts";

// Connect to WebSocket server
const ws = new WebSocket("ws://127.0.0.1:8000");

// Client ID assigned by server
let clientId: ClientId | null = null;

// Heartbeat state
let heartbeatTimer: number | undefined;
let heartbeatTimeoutTimer: number | undefined;
let awaitingPong = false;

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    if (awaitingPong) {
      console.warn("No pong received, connection may be lost");
      ws.close();
      return;
    }
    
    console.log("Sending ping...");
    ws.send(HEARTBEAT_PING);
    awaitingPong = true;
    
    // Set timeout for pong response
    heartbeatTimeoutTimer = setTimeout(() => {
      if (awaitingPong) {
        console.error("Heartbeat timeout - no pong received");
        ws.close();
      }
    }, HEARTBEAT_TIMEOUT);
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = undefined;
  }
}

// Fired when connection opens
ws.onopen = () => {
  console.log("Connected! Waiting for server to assign ID...");
};

// Fired when a message is received
ws.onmessage = (event) => {
  // Try to parse as JSON for server messages
  try {
    const data = JSON.parse(event.data);
    if (isClientIdMessage(data)) {
      clientId = data.id;
      console.log(`Assigned Client ID: ${clientId}`);
      // Start heartbeat after receiving ID
      ws.send("Hello from Deno!");
      startHeartbeat();
      return;
    }
  } catch {
    // Not JSON, handle as regular message
  }
  
  console.log("Received:", event.data);
  
  // Handle pong response
  if (event.data === HEARTBEAT_PONG) {
    console.log("Received pong");
    awaitingPong = false;
    if (heartbeatTimeoutTimer) {
      clearTimeout(heartbeatTimeoutTimer);
      heartbeatTimeoutTimer = undefined;
    }
  }
};

// Fired if an error occurs
ws.onerror = (err) => {
  console.error("WebSocket error:", err);
};

// Fired when connection closes
ws.onclose = () => {
  console.log("Connection closed.");
  stopHeartbeat();
};
