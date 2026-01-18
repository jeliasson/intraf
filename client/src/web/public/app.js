// WebSocket connection for real-time updates
let ws = null;
let reconnectInterval = null;
let autoScroll = true;
const maxLogs = 1000; // Maximum number of log entries to keep

// DOM elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const connectionStateEl = document.getElementById('connection-state');
const clientIdEl = document.getElementById('client-id');
const serverUrlEl = document.getElementById('server-url');
const reconnectAttemptsEl = document.getElementById('reconnect-attempts');
const lastConnectedEl = document.getElementById('last-connected');
const logsContainer = document.getElementById('logs-container');
const clearLogsBtn = document.getElementById('clear-logs');
const autoScrollCheckbox = document.getElementById('auto-scroll');

// Auto-scroll checkbox handler
autoScrollCheckbox.addEventListener('change', (e) => {
  autoScroll = e.target.checked;
  if (autoScroll) {
    scrollLogsToBottom();
  }
});

// Clear logs button handler
clearLogsBtn.addEventListener('click', () => {
  logsContainer.innerHTML = '';
  addLogPlaceholder('Logs cleared');
});

// Connect to WebSocket
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    clearReconnectInterval();
    removePlaceholder();
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    addLogPlaceholder('Disconnected from log stream. Reconnecting...');
    scheduleReconnect();
  };
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'status_update':
      updateStatus(message.status);
      break;
    case 'log_entry':
      addLogEntry(message);
      break;
    case 'server_event':
      // Handle server events in the future
      break;
    default:
      console.warn('Unknown message type:', message.type);
  }
}

// Update connection status display
function updateStatus(status) {
  // Update main status indicator based on state or connected flag
  const isReady = status.state === 'READY';
  const isConnecting = status.state === 'CONNECTING';
  
  if (isReady) {
    statusIndicator.className = 'status-indicator status-connected';
    statusText.textContent = 'Ready';
  } else if (status.connected || isConnecting) {
    statusIndicator.className = 'status-indicator status-connecting';
    statusText.textContent = status.stateDescription || 'Connecting...';
  } else {
    statusIndicator.className = 'status-indicator status-disconnected';
    statusText.textContent = 'Disconnected';
  }
  
  // Update detailed connection state
  connectionStateEl.textContent = status.stateDescription || status.state || 'Unknown';
  
  clientIdEl.textContent = status.clientId || 'Not assigned';
  serverUrlEl.textContent = status.serverUrl || '-';
  reconnectAttemptsEl.textContent = status.reconnectAttempts;
  lastConnectedEl.textContent = status.lastConnected 
    ? new Date(status.lastConnected).toLocaleString() 
    : 'Never';
}

// Add a log entry to the display
function addLogEntry(log) {
  removePlaceholder();
  
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  
  const timestamp = document.createElement('span');
  timestamp.className = 'log-timestamp';
  timestamp.textContent = new Date(log.timestamp).toLocaleTimeString();
  
  const level = document.createElement('span');
  level.className = `log-level log-level-${log.level}`;
  level.textContent = log.level;
  
  const prefix = document.createElement('span');
  prefix.className = 'log-prefix';
  prefix.textContent = log.prefix ? `[${log.prefix}]` : '';
  
  const message = document.createElement('span');
  message.className = 'log-message';
  message.textContent = log.message;
  
  entry.appendChild(timestamp);
  entry.appendChild(level);
  if (log.prefix) {
    entry.appendChild(prefix);
  }
  entry.appendChild(message);
  
  logsContainer.appendChild(entry);
  
  // Limit the number of log entries
  while (logsContainer.children.length > maxLogs) {
    logsContainer.removeChild(logsContainer.firstChild);
  }
  
  if (autoScroll) {
    scrollLogsToBottom();
  }
}

// Add placeholder message
function addLogPlaceholder(message) {
  const placeholder = document.createElement('div');
  placeholder.className = 'logs-placeholder';
  placeholder.textContent = message;
  logsContainer.appendChild(placeholder);
}

// Remove placeholder messages
function removePlaceholder() {
  const placeholders = logsContainer.querySelectorAll('.logs-placeholder');
  placeholders.forEach(p => p.remove());
}

// Scroll logs container to bottom
function scrollLogsToBottom() {
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Schedule WebSocket reconnection
function scheduleReconnect() {
  if (reconnectInterval) return;
  
  reconnectInterval = setInterval(() => {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      console.log('Attempting to reconnect WebSocket...');
      connectWebSocket();
    }
  }, 3000);
}

// Clear reconnection interval
function clearReconnectInterval() {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
}

// Fallback: fetch status via HTTP API
async function fetchStatusFallback() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    updateStatus(data);
  } catch (error) {
    console.error('Failed to fetch status:', error);
  }
}

// Initialize on page load
connectWebSocket();

// Fallback: Also poll status via HTTP every 5 seconds as backup
setInterval(fetchStatusFallback, 5000);
