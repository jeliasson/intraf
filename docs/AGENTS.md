# AGENTS.md

This document provides AI agents with context about the **intraf** project architecture, conventions, and design patterns to maintain consistency when making code changes.

## Project Overview

**intraf** is an open-source tunneling service built with Deno and WebSockets. The project consists of:

- **Control Server** (`packages/control`): WebSocket server that manages client connections and tunnel coordination
- **Tunnel Server** (`packages/tunnel`): Data plane server for handling actual traffic tunneling (planned)
- **Client** (`packages/client`): WebSocket client with automatic reconnection that connects to the control server
- **Common** (`packages/common`): Shared library (types, configuration, utilities) used across all packages

## Technology Stack

- **Runtime**: Deno (TypeScript runtime)
- **Protocol**: WebSockets for real-time bidirectional communication
- **Configuration**: YAML files with environment variable and CLI argument support
- **Logging**: Custom logger with colored output and log levels
- **Module System**: Deno's native ESM with JSR imports
- **Workspace**: Deno workspaces for monorepo management

## Refactoring History

The intraf project has undergone significant refactoring to improve code organization, maintainability, and production readiness. This section documents the major architectural improvements for context.

### Phase 1-6: Foundation & Module Organization (Completed)

**Objective:** Restructure the codebase into focused, maintainable modules organized by domain.

**Key Improvements:**
- **Constants Extraction**: Moved all magic numbers to `common/src/constants.ts`
  - HTTP status codes (426, 200, 401, 503)
  - WebSocket close codes (1000, 1001, 1008)
  - Heartbeat intervals and timeouts
  - Default message strings

- **Domain-Driven Organization**: Reorganized `common/` into focused modules:
  - `types/` - Message types, guards, and type definitions
  - `config/` - Configuration loader, schema, and parser
  - `errors/` - Error hierarchy and Result<T, E> pattern
  - `auth/` - JWT utilities and credential management
  - `websocket/` - WebSocket utilities (client ID generation)
  - `cli/` - Logger and argument parsing

- **Error Handling**: Implemented functional error handling with Result<T, E> pattern
  - `IntrafError` base class with error codes
  - Specialized errors: `ConfigError`, `ConnectionError`, `AuthError`, `ProtocolError`, `ValidationError`, `TimeoutError`
  - Result utilities: `ok()`, `err()`, `map()`, `andThen()`, `tryCatch()`, etc.

**Impact:** ~1,500+ lines removed, ~3,000+ lines reorganized, 15+ new focused modules

### Phase 7: Client State Machine (Completed)

**Objective:** Implement proper connection lifecycle management with state tracking.

**Components:**
- **State Machine** (`client/src/connection/state.ts`): 
  - States: `DISCONNECTED → CONNECTING → CONNECTED → AUTHENTICATED → READY`
  - Event-driven transitions with validation
  - State query methods and change listeners
  - Idempotent state transitions

- **Client Integration** (`client/src/connection/reconnecting-client.ts`):
  - Integrated state machine into WebSocket client
  - Automatic state transitions on connection events
  - State-based operation guards (e.g., `send()` only in READY state)
  - Web dashboard integration for state visibility

- **Web Dashboard Updates**:
  - Real-time state display with colored indicators
  - Connection state field shows current lifecycle stage
  - Orange "connecting" status indicator

**Benefits:**
- Clear connection lifecycle visibility
- Prevents operations in invalid states
- Better debugging with state history
- Foundation for future features (authentication flows, tunnel management)

### Phase 8: Production Robustness (Completed)

**Objective:** Add enterprise-grade resource management, limits, and graceful shutdown.

**8.1 Server Connection Pool** (`server/src/connection/pool.ts`):
- Tracks all active connections with metadata (clientId, socket, IP, timestamps)
- **Global Limits**: Configurable max connections (default: 1000)
- **Per-IP Limits**: Prevents single IP from monopolizing resources (default: 2)
- **Rejection Handling**: Typed rejection reasons (POOL_FULL, IP_LIMIT_REACHED, DRAINING)
- **Idle Detection**: Automatic cleanup of stale connections (default: 5 min)
- **Graceful Close**: Safe connection termination with timeout
- **Statistics**: Tracks total connected/disconnected, rejections, per-IP rejections

**8.2 Server Integration** (`server/src/server.ts`):
- IP extraction from headers (`x-forwarded-for`, `x-real-ip`)
- Pre-upgrade rejection with specific HTTP 503 messages
- Graceful shutdown handlers (SIGINT, SIGTERM):
  - Drains pool (rejects new connections)
  - Closes all active connections safely
  - Logs shutdown progress
- Periodic maintenance: idle cleanup, statistics logging

**8.3 Connection Handler** (`server/src/connection/handler.ts`):
- Passes client IP to connection pool
- Updates activity timestamp on every message
- Defensive error handling for pool failures

**8.4 Client Connection Timeout** (`client/src/connection/reconnecting-client.ts`):
- Configurable timeout for connection establishment (default: 10s)
- Automatic cleanup and reconnection on timeout
- Proper timeout clearing on success/error/close

**8.5 Client Error Detection** (Fixed):
- **Immediate Failure Detection**: Detects server rejections (< 100ms connection duration)
- **Improved Messages**: "Server rejected connection - may be at capacity, shutting down, or per-IP limit reached"
- **CLI Arg Fix**: Added `toKebabCase()` helper for proper camelCase→kebab-case conversion
  - Now supports: `--server-max-connections`, `--server-max-connections-per-ip`

**Configuration:**
```typescript
// Server
server.maxConnections: 1000           // Global connection limit
server.maxConnectionsPerIp: 2         // Per-IP connection limit
server.idleTimeout: 300000            // 5 minutes
server.connectionTimeout: 10000       // 10 seconds

// Client
server.connectionTimeout: 10000       // Connection establishment timeout
```

**Benefits:**
- Prevents resource exhaustion attacks
- Fair resource distribution (per-IP limits)
- Clean shutdown without orphaned connections
- Clear feedback to clients when rejected
- Automatic cleanup of idle/stale connections

**Testing Verified:**
- ✅ Global capacity limits (max connections)
- ✅ Per-IP limits (max connections per IP)
- ✅ Graceful shutdown with connection draining
- ✅ Client reconnection with exponential backoff
- ✅ Connection timeout detection
- ✅ Improved error messages on rejection

### Architecture Summary

The refactoring has transformed intraf from a basic WebSocket prototype into a production-ready tunneling service with:

1. **Modular Architecture**: Domain-driven code organization with clear separation of concerns
2. **Type Safety**: Comprehensive TypeScript types, guards, and error handling
3. **State Management**: Proper connection lifecycle with state machine
4. **Resource Management**: Connection pooling with limits and automatic cleanup
5. **Graceful Operations**: Safe shutdown, connection draining, and timeout handling
6. **Production Monitoring**: Statistics, logging, and clear error messages
7. **Configuration Flexibility**: Schema-driven config with CLI args, env vars, and file support

## Project Structure

```
intraf/
├── deno.json         # Root workspace configuration
├── Makefile          # Development commands
├── README.md         # Project readme
├── docs/             # Documentation
│   ├── AGENTS.md                  # This file (AI agent guide)
│   ├── CONFIGURATION.md           # Configuration system details
│   ├── DATABASE.md                # Database setup (future)
│   └── STRANGE-AI.md              # Notes on unusual AI decisions
│
└── packages/         # Monorepo packages
    ├── common/           # Shared library
    │   ├── deno.json
    │   ├── mod.ts                 # Barrel export file
    │   └── src/
    │       ├── constants.ts           # All magic numbers and constants
    │       ├── types/                 # Type definitions
    │       │   ├── index.ts           # Type exports
    │       │   ├── messages.ts        # WebSocket message types
    │       │   └── guards.ts          # Type guard functions
    │       ├── config/                # Configuration system
    │       │   ├── index.ts           # Config exports
    │       │   ├── schema.ts          # Schema types
    │       │   ├── loader.ts          # Config loader with precedence
    │       │   └── parser.ts          # YAML/value parsing
    │       ├── errors/                # Error handling (Result<T, E>)
    │       │   ├── index.ts           # Error exports
    │       │   ├── errors.ts          # Error hierarchy
    │       │   ├── result.ts          # Result type & utilities
    │       │   └── utils.ts           # Error utilities
    │       ├── auth/                  # Authentication (JWT)
    │       │   ├── index.ts           # Auth exports
    │       │   ├── jwt.ts             # JWT utilities
    │       │   └── credentials.ts     # Credential management
    │       ├── websocket/             # WebSocket utilities
    │       │   ├── index.ts           # WebSocket exports
    │       │   └── utils.ts           # Client ID generation
    │       └── cli/                   # CLI utilities
    │           ├── index.ts           # CLI exports
    │           ├── logger.ts          # Logging system with hooks
    │           └── args.ts            # Argument parsing
    │
    ├── control/          # Control Server (Core)
    │   ├── deno.json
    │   ├── intraf.yaml
    │   ├── src/
    │   │   ├── server.ts              # Main server entry point
    │   │   ├── config.ts              # Server configuration schema
    │   │   ├── connection/            # Connection management (Phase 8)
    │   │   │   ├── pool.ts            # Connection pool with limits & tracking
    │   │   │   └── handler.ts         # Connection handler with activity tracking
    │   │   └── ws/                    # WebSocket event handlers
    │   │       ├── events.ts          # Event handler coordinator
    │   │       ├── heartbeat.ts       # Server-side heartbeat monitoring
    │   │       └── events/            # Individual event handlers
    │   │           ├── open.ts        # Connection established
    │   │           ├── message.ts     # Message received
    │   │           ├── close.ts       # Connection closed
    │   │           └── error.ts       # Error handling
    │   └── README.md                  # Control server docs (future)
    │
    ├── tunnel/           # Tunnel Server (Data Plane) - PLANNED
    │   ├── deno.json
    │   ├── intraf.yaml
    │   ├── src/
    │   │   └── server.ts              # Placeholder for tunnel server
    │   └── README.md                  # Tunnel server docs
    │
    └── client/           # WebSocket client
        ├── deno.json
        ├── intraf.yaml
        ├── src/
        │   ├── client.ts              # Main client entry point
        │   ├── config.ts              # Client configuration schema
        │   ├── connection/            # Connection management (Phase 7)
        │   │   ├── state.ts           # Connection state machine
        │   │   └── reconnecting-client.ts  # WebSocket client with reconnection
        │   ├── web/                   # Web dashboard server
        │   │   ├── server.ts          # HTTP server implementation
        │   │   ├── types.ts           # Web server types
        │   │   └── public/            # Static web assets
        │   │       ├── index.html     # Dashboard UI
        │   │       ├── app.js         # Dashboard logic
        │   │       └── styles.css     # Dashboard styles
        │   └── ws/                    # WebSocket event handlers
        │       ├── events.ts          # Event handler coordinator
        │       ├── heartbeat.ts       # Client-side heartbeat pinging
        │       └── events/            # Individual event handlers
        │           ├── open.ts        # Connection established
        │           ├── message.ts     # Message received
        │           ├── close.ts       # Connection closed
        │           └── error.ts       # Error handling
        └── README.md                  # Client docs (future)
```

## Core Design Patterns

### 1. Configuration System

The project uses a **schema-driven configuration system** that automatically generates CLI arguments and environment variables from a single schema definition.

**Key Files:**
- `common/src/config/` - Configuration system implementation
- `control/src/config.ts` - Control server configuration schema
- `client/src/config.ts` - Client configuration schema

**Pattern:**
```typescript
const schema = {
  server: {
    host: { default: "0.0.0.0", description: "Server host address" },
    port: { default: 8000, description: "Server port" },
  },
  log: {
    level: { 
      default: parseLogLevel("info"),
      transform: parseLogLevel,
      description: "Log level",
    },
  }
} satisfies ConfigSchema;

const config = await loadConfig(schema, "./intraf.yaml", "INTRAF", logger);
```

**Configuration Precedence (highest to lowest):**
1. CLI arguments (`--server-port=9000`)
2. Environment variables (`INTRAF_SERVER_PORT=9000`)
3. Config file (`intraf.yaml`)
4. Schema defaults

**When adding new configuration options:**
- Add to the appropriate schema (control server or client)
- The CLI args and env vars are auto-generated
- Use descriptive names and provide defaults
- Add transform function for complex types (like LogLevel)

### 2. WebSocket Event Handling

WebSocket events are handled through a **modular event handler pattern** with separate files for each event type.

**Pattern:**
```typescript
// events.ts - Coordinator
export class WebSocketEventHandler {
  private socket: WebSocket;
  private logger: Logger;
  private clientId: ClientId;
  private heartbeatContext: HeartbeatContext;

  onOpen(): void {
    handleOpen({ socket, logger, clientId });
  }
  
  onMessage(event: MessageEvent): void {
    handleMessage({ event, socket, logger, heartbeatContext });
  }
  // ... other handlers
}

// events/open.ts - Individual handler
export function handleOpen({ socket, logger, clientId }: OpenHandlerParams): void {
  logger.info("Client connected");
  // Handle connection open logic
}
```

**Key Principles:**
- Each event handler is in its own file (`open.ts`, `message.ts`, `close.ts`, `error.ts`)
- Handlers receive parameters via an interface (e.g., `OpenHandlerParams`)
- The coordinator class (`WebSocketEventHandler`) manages context and delegates to handlers
- Server and client have different implementations but follow the same structure

### 3. Heartbeat System

The project implements a **bidirectional heartbeat** to detect stale connections:

**Client-side** (`client/src/ws/heartbeat.ts`):
- Sends `ping` messages every 5 seconds
- Waits for `pong` response within 3 seconds
- Closes connection if no pong received

**Server-side** (`server/src/ws/heartbeat.ts`):
- Monitors last heartbeat timestamp
- Checks every 10 seconds
- Closes connection if no heartbeat for 30 seconds

**Constants** (`common/src/websocket.ts`):
```typescript
export const HEARTBEAT_INTERVAL = 5000;         // Client ping interval
export const HEARTBEAT_TIMEOUT = 3000;          // Client pong timeout
export const HEARTBEAT_CHECK_INTERVAL = 10000;  // Server check interval
export const SERVER_HEARTBEAT_TIMEOUT = 30000;  // Server timeout threshold
```

### 4. Type-Safe Message System

WebSocket messages use a **discriminated union type system** for type safety:

**Pattern** (`common/src/types.ts`):
```typescript
export enum MessageType {
  CLIENT_ID = "client_id",
  HEARTBEAT_PING = "ping",
  HEARTBEAT_PONG = "pong",
}

export interface BaseMessage {
  type: MessageType;
}

export interface ClientIdMessage extends BaseMessage {
  type: MessageType.CLIENT_ID;
  id: ClientId;
}

// Type guard
export function isClientIdMessage(data: unknown): data is ClientIdMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === MessageType.CLIENT_ID &&
    "id" in data &&
    typeof data.id === "string"
  );
}
```

**When adding new message types:**
1. Add to `MessageType` enum
2. Create interface extending `BaseMessage`
3. Add to `WebSocketMessage` union type
4. Create type guard function

### 5. Logging System

The project uses a **custom logger** with log levels and colored output:

**Log Levels** (in order of severity):
- `DEBUG` - Detailed diagnostic information (cyan)
- `INFO` - General informational messages (green)
- `WARN` - Warning messages (yellow)
- `ERROR` - Error messages (red)
- `CRITICAL` - Critical failures (magenta)

**Usage:**
```typescript
const logger = new Logger("PREFIX", LogLevel.INFO);
logger.debug("Debug message");   // Only shown if level <= DEBUG
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");
logger.critical("Critical error");
```

**Key Points:**
- Each component/connection should have its own logger instance
- Use appropriate prefixes (e.g., "SERVER", "CLIENT", client ID)
- Log level can be configured via config system
- Debug logs include detailed heartbeat and config info

### 6. Client ID Assignment

The server generates and assigns unique client IDs:

**Flow:**
1. Server generates random 10-character hex ID on connection (`generateClientId()`)
2. Server sends `CLIENT_ID` message to client with assigned ID
3. Client stores ID and uses it in logging
4. Server uses ID as logger prefix for that connection

**Implementation** (`common/src/websocket.ts`):
```typescript
export function generateClientId(): ClientId {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  const hexString = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hexString.substring(0, 10);
}
```

## Coding Conventions

### TypeScript Style

- Use explicit type annotations for function parameters and return types
- Prefer `interface` for parameter objects, `type` for unions/intersections
- Export types that are shared across modules
- Use `satisfies` operator for schema validation

### File Organization

- One responsibility per file (small, focused modules)
- Group related functionality in directories (e.g., `ws/events/`)
- Use index-style exports from coordinator files
- Import paths use relative imports within modules, absolute for cross-module

### Naming Conventions

- **Files**: lowercase with hyphens (e.g., `heartbeat.ts`, `events/open.ts`)
- **Classes**: PascalCase (e.g., `WebSocketEventHandler`, `Logger`)
- **Functions**: camelCase (e.g., `handleOpen`, `generateClientId`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `HEARTBEAT_INTERVAL`)
- **Types/Interfaces**: PascalCase (e.g., `ClientId`, `MessageType`)

### Error Handling

- Log errors with appropriate severity level
- Handle expected errors gracefully (e.g., "Unexpected EOF" on client disconnect)
- Clean up resources in error handlers (e.g., stop heartbeat intervals)
- Use try-catch for parsing operations (e.g., JSON.parse)

## Development Workflow

### Running the Project

**User workflow (default ports):**
```bash
# Run server only (port 8000)
make control-dev

# Run client only (connects to port 8000, web dashboard on port 3000)
make client-dev

# Run both with watch mode
make dev
```

**AI Agent workflow (alternative ports to avoid conflicts):**
```bash
# Server on port 8999
cd packages/control && deno task dev -- --server-port=8999

# Client connecting to port 8999 with web dashboard on port 3999
cd packages/client && deno task dev -- --server-port=8999 --web-port=3999
```

This separation ensures that:
- User can run their own server/client on default ports (8000/3000)
- AI agents can test changes on alternative ports (8999/3999) without conflicts
- Both can run simultaneously during development

### Deno Tasks

```bash
# Control Server
cd packages/control
deno task dev   # Development with watch mode
deno task run   # Production run

# Client
cd packages/client
deno task dev   # Development with watch mode
deno task run   # Production run
```

### Configuration Options

**Server:**
- `--server-host` - Server host address (default: 0.0.0.0)
- `--server-port` - Server port (default: 8000)
- `--server-max-connections` - Maximum concurrent connections (default: 1000)
- `--server-max-connections-per-ip` - Maximum connections per IP (default: 2)
- `--server-idle-timeout` - Idle connection timeout in ms (default: 300000 = 5 min)
- `--auth-enabled` - Enable JWT authentication (default: false)
- `--auth-secret` - JWT secret key (default: "change-me-in-production")
- `--log-level` - Log level (default: info)

**Client:**
- `--server-host` - Server host to connect to (default: 127.0.0.1)
- `--server-port` - Server port to connect to (default: 8000)
- `--server-reconnect-delay` - Initial connection delay in ms (default: 1000)
- `--server-reconnect-enabled` - Enable automatic reconnection (default: true)
- `--server-reconnect-interval` - Base reconnect interval in ms (default: 5000)
- `--server-reconnect-max-attempts` - Max reconnect attempts, 0 = infinite (default: 0)
- `--server-reconnect-backoff` - Enable exponential backoff (default: true)
- `--server-reconnect-max-delay` - Maximum reconnect delay in ms (default: 30000)
- `--server-connection-timeout` - Connection establishment timeout in ms (default: 10000)
- `--web-enabled` - Enable web dashboard server (default: true)
- `--web-host` - Web dashboard host address (default: 127.0.0.1)
- `--web-port` - Web dashboard port (default: 3000)
- `--log-level` - Log level (default: info)

**Note:** Configuration uses camelCase in config files and kebab-case for CLI arguments. For example:
- Config file: `server.maxConnections: 1000`
- CLI argument: `--server-max-connections=1000`
- Environment variable: `INTRAF_SERVER_MAX_CONNECTIONS=1000`

### Web Dashboard

The client includes a built-in web dashboard for monitoring and management:

**Access:** `http://127.0.0.1:3000` (or custom port via `--web-port`)

**Automatic Port Selection:**
If the requested web port is already in use (e.g., when running multiple clients), the web server will automatically try the next available port (3001, 3002, etc.). This allows multiple clients to run simultaneously without manual port configuration.

Example:
- Client 1 with `--web-port=3000` → Uses port 3001 if 3000 is busy
- Client 2 with `--web-port=3000` → Uses port 3002 if 3000 and 3001 are busy

**Features:**
- **Real-time connection status** - Shows connected/disconnected state with live updates
- **Connection details** - Client ID, server URL, reconnect attempts, last connected time
- **API endpoints:**
  - `GET /` - Dashboard HTML page
  - `GET /api/status` - JSON status endpoint (updates every 2 seconds)
  - `GET /api/tunnels` - Tunnel management (placeholder for future implementation)
- **Placeholders for future features:**
  - Tunnel management UI
  - Authentication/login system

**Disabling the web dashboard:**
```bash
cd client && deno task dev -- --web-enabled=false
```

## Common Tasks for AI Agents

### Testing Changes

When you make changes to the codebase, follow this testing workflow to avoid port conflicts with the user:

**Step 1: Start the test server (port 8999)**
```bash
cd packages/control && deno task dev -- --server-port=8999
```

**Step 2: Start the test client (connects to port 8999, web dashboard on port 3999)**
```bash
cd packages/client && deno task dev -- --server-port=8999 --web-port=3999
```

**Step 3: Verify the connection**
- Check server logs for client connection message
- Check client logs for "Connected!" and "Assigned Client ID" messages
- Test web dashboard: `curl http://127.0.0.1:3999/api/status`

**Step 4: Clean up after testing**
```bash
# Kill ONLY the test server on port 8999 (be specific!)
pkill -f "deno.*control.*--server-port=8999"

# Kill ONLY the test client connecting to port 8999 (be specific!)
pkill -f "deno.*client.*--server-port=8999"

# Verify cleanup (should NOT show port 8000 or user processes)
ps aux | grep deno | grep -E "(8999|3999)"
```

**Important:**
- Always use ports 8999 (server) and 3999 (web dashboard) for testing
- **NEVER** use `pkill -f "deno"` or `pkill -9 -f "deno"` - this kills the user's processes!
- Be very specific in your kill commands to target ONLY test processes on port 8999
- Always verify you only killed test processes, not user processes on ports 8000/3000
- The user runs their own server/client on default ports (8000/3000)

### Adding a New Message Type

1. Add to `MessageType` enum in `common/src/types.ts`
2. Create interface extending `BaseMessage`
3. Add to `WebSocketMessage` union type
4. Create type guard function
5. Handle in server `message.ts` handler
6. Handle in client `message.ts` handler

### Adding a Configuration Option

1. Add to schema in `control/src/config.ts` or `client/src/config.ts`
2. Provide default value and optional description
3. Use the config value in your code via the resolved config object
4. Document in `docs/CONFIGURATION.md` if user-facing

### Adding a New Event Handler

1. Create new file in `ws/events/` directory
2. Define params interface
3. Export handler function
4. Import and call from `WebSocketEventHandler` class
5. Update context if needed (e.g., new state to track)

### Modifying Heartbeat Behavior

1. Update constants in `common/src/constants.ts`
2. Modify logic in `client/src/ws/heartbeat.ts` (client-side)
3. Modify logic in `control/src/ws/heartbeat.ts` (server-side)
4. Test with multiple clients and network conditions

## Process Management for AI Agents

**CRITICAL**: The user runs their own server and client processes on default ports (8000/3000). You must NEVER kill these processes.

### Safe Process Cleanup

**DO:**
```bash
# Kill only test server on port 8999
pkill -f "deno.*control.*--server-port=8999"

# Kill only test client on port 8999
pkill -f "deno.*client.*--server-port=8999"
```

**NEVER DO:**
```bash
# ❌ WRONG - Kills user's processes too!
pkill -f "deno"
pkill -9 -f "deno"
pkill -f "deno.*control"  # Too broad
pkill -f "deno.*client"  # Too broad
```

### Verification Steps

Always verify you only killed test processes:
```bash
# This should show NO results (test processes should be gone)
ps aux | grep deno | grep -E "(8999|3999)"

# This should still show the user's processes on 8000/3000 (if running)
ps aux | grep deno | grep -E "(8000|3000)"
```

## Known Issues and Considerations

See `docs/STRANGE-AI.md` for notes on unusual design decisions made by previous AI agents.

**Resolved Issues:**
1. ✅ Initial implementation had clients select their own names → Fixed: Server-assigned IDs
2. ✅ Early config system hard-coded settings → Fixed: Schema-driven approach
3. ✅ No connection lifecycle management → Fixed: State machine in Phase 7
4. ✅ No resource limits or capacity management → Fixed: Connection pool in Phase 8
5. ✅ Poor error messages on connection rejection → Fixed: Immediate failure detection
6. ✅ CLI args didn't support camelCase→kebab-case → Fixed: `toKebabCase()` helper

**Current Known Issues:**
- LSP errors in unused TUI files (`client/src/console.ts`, `client/src/tui.ts`, `client/src/client-tui.ts`) - reference old auth message types, can be fixed or removed in future work

## Future Enhancements

Based on the codebase structure, potential areas for expansion:

1. **Database Integration** - Sequelize ORM with SQLite/MariaDB (see `docs/DATABASE.md`)
2. **Tunnel Management** - HTTP tunnel creation and routing
3. **Authentication** - Client authentication and authorization
4. **Admin API** - REST API for managing tunnels and clients
5. **Web Dashboard Enhancements** - Expand the existing dashboard with:
   - Login/authentication UI
   - Tunnel management interface (create, configure, delete tunnels)
   - Real-time WebSocket updates (replace polling with push notifications)
   - Settings page for client configuration
   - Log viewer displaying client logs in the browser

## Best Practices for AI Agents

1. **Maintain Consistency**: Follow existing patterns and conventions
2. **Incremental Changes**: Make small, focused changes that align with architecture
3. **Update Documentation**: Keep docs in sync with code changes
4. **Test Changes**: Consider edge cases, especially around disconnections and timeouts
5. **Respect the Schema**: Use the config system for new options rather than hard-coding
6. **Preserve Type Safety**: Maintain strict TypeScript types and guards
7. **Log Appropriately**: Use correct log levels and provide context in messages
8. **Clean Up Resources**: Always stop intervals, close connections, etc.

## Questions or Clarifications

If you encounter ambiguity or need to make a decision not covered by this guide:

1. Look for similar patterns in the existing codebase
2. Prioritize consistency with current architecture
3. Document unusual decisions in `docs/STRANGE-AI.md`
4. Ask the user if fundamentally changing architecture or patterns

---

**Last Updated**: January 2026
**Deno Version**: Compatible with Deno 2.x
**Target Audience**: AI coding agents, automated code generators, LLM-based development tools
