# intraf


An open-source tunneling service built with Deno and WebSockets.

## Quick Start

```bash
# Run server (uses SQLite by default)
cd server && deno task dev

# Run client (in another terminal)
cd client && deno task dev

# Or run both with watch mode
make dev
```

## Development

```bash
make dev          # Run both client and server with watch mode
make server-dev   # Run server only
make client-dev   # Run client only
```

## Configuration

Both client and server use `intraf.yaml` config files with CLI and environment variable support.

```bash
# CLI arguments
deno task dev --log-level=debug --server-port=9000

# Environment variables
export INTRAF_LOG_LEVEL=debug
export INTRAF_SERVER_PORT=9000
```

### Client Configuration

The client supports automatic reconnection with configurable retry behavior:

```yaml
server:
  host: 127.0.0.1
  port: 8000
  reconnectDelay: 1000          # Initial delay before first connection (ms)
  reconnectEnabled: true         # Enable automatic reconnection
  reconnectInterval: 5000        # Delay between reconnection attempts (ms)
  reconnectMaxAttempts: 0        # Max attempts (0 = infinite)
  reconnectBackoff: true         # Use exponential backoff
  reconnectMaxDelay: 30000       # Max reconnection delay (ms)

log:
  level: info
```

Available CLI options:
- `--server-reconnect-enabled=false` - Disable automatic reconnection
- `--server-reconnect-interval=10000` - Set reconnection interval
- `--server-reconnect-max-attempts=5` - Limit reconnection attempts

## Documentation

See [AGENTS.md](./AGENTS.md) for detailed information:
- Project architecture and conventions for AI agents
- Core design patterns and coding conventions
- Common development tasks
