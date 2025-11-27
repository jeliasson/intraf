import {
  HEARTBEAT_CHECK_INTERVAL,
  SERVER_HEARTBEAT_TIMEOUT,
  HEARTBEAT_PING,
  HEARTBEAT_PONG,
  generateClientId,
} from "../../common/src/websocket.ts";
import {
  MessageType,
  type ClientId,
  type ClientIdMessage,
} from "../../common/src/types.ts";

Deno.serve((req) => {

  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  // Generate unique client ID upon connection
  const clientId: ClientId = generateClientId();
  
  // Track last heartbeat time
  let lastHeartbeat = Date.now();

  // Monitor for stale connections
  const heartbeatCheck = setInterval(() => {
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
    if (timeSinceLastHeartbeat > SERVER_HEARTBEAT_TIMEOUT) {
      console.log(`[${clientId}] Client heartbeat timeout, closing connection`);
      clearInterval(heartbeatCheck);
      socket.close();
    }
  }, HEARTBEAT_CHECK_INTERVAL);

  socket.addEventListener("open", () => {
    console.log(`[${clientId}] Client connected`);
    // Send the assigned client ID to the client
    const message: ClientIdMessage = {
      type: MessageType.CLIENT_ID,
      id: clientId,
    };
    socket.send(JSON.stringify(message));
  });

  socket.addEventListener("message", (event: MessageEvent) => {
    if (event.data === HEARTBEAT_PING) {
      console.log(`[${clientId}] Received ping, sending pong`);
      lastHeartbeat = Date.now();
      socket.send(HEARTBEAT_PONG);
    }
  });

  socket.addEventListener("close", () => {
    console.log(`[${clientId}] Client disconnected`);
    clearInterval(heartbeatCheck);
  });

  socket.addEventListener("error", (err: Event) => {
    // "Unexpected EOF" errors are normal when clients disconnect abruptly
    // The close event will handle cleanup, so we only log unexpected errors
    const errorEvent = err as ErrorEvent;
    if (errorEvent.message && errorEvent.message !== "Unexpected EOF") {
      console.error(`[${clientId}] WebSocket error:`, errorEvent.message);
    }
    // Don't clear interval here - let close event handle it to avoid double-cleanup
  });

  return response;
});
