# intraf
An open-source tunneling service

## Configuration

Intraf uses a flexible configuration system that supports multiple sources with the following precedence (highest to lowest):

1. **CLI Arguments** (highest priority)
2. **Environment Variables**
3. **Config File** (lowest priority)

### Config File

Both client and server look for an `intraf.yaml` file in their respective directories. A warning will be logged if the file is not found.

Example `intraf.yaml`:

```yaml
# Server configuration
server:
  host: 0.0.0.0
  port: 8000

# Client configuration
client:
  serverUrl: ws://127.0.0.1:8000
  reconnectDelay: 1000

# Common configuration
logLevel: info
```

### Environment Variables

All environment variables are prefixed with `INTRAF_`:

```bash
# Server settings
export INTRAF_SERVER_HOST=0.0.0.0
export INTRAF_SERVER_PORT=8000

# Client settings
export INTRAF_CLIENT_SERVER_URL=ws://127.0.0.1:8000
export INTRAF_CLIENT_RECONNECT_DELAY=1000

# Common settings
export INTRAF_LOG_LEVEL=debug
```

### CLI Arguments

```bash
# Server
deno task dev --server-host=0.0.0.0 --server-port=8000 --log-level=debug

# Client
deno task dev --server=ws://127.0.0.1:8000 --reconnect-delay=1000 --log-level=debug
```

### Configuration Debug

When running with `--log-level=debug`, you'll see a detailed breakdown of all configuration sources and the final resolved values.

## Development

### Running the project

```bash
# Run both client and server in development mode (with watch)
make dev

# Run client only
make client-dev

# Run server only
make server-dev
```

### Log Levels

The project supports the following log levels (in order of verbosity):
- `DEBUG` - Detailed information for debugging (includes heartbeat ping/pong)
- `INFO` - General informational messages (default)
- `WARN` - Warning messages
- `ERROR` - Error messages
- `CRITICAL` - Critical errors

#### Setting log level

You can set the log level using the `--log-level` or `-l` flag:

```bash
# Run server with debug logging
cd server && deno task dev --log-level=debug

# Run client with debug logging
cd client && deno task dev --log-level=debug

# Or use the shorthand
cd server && deno task dev -l debug

# Convenience tasks for debug mode
cd server && deno task dev:debug
cd client && deno task dev:debug
```

#### Log format

Logs include:
- **Timestamp** - ISO 8601 format
- **Log level** - Color-coded for easy identification
- **Prefix** - Component identifier (CLIENT, SERVER, or client ID)
- **Message** - The log message

Example:
```
2025-11-28T12:34:56.789Z INFO     [SERVER] Starting server with log level: 1
2025-11-28T12:34:57.123Z INFO     [a1b2c3d4e5] Client connected
2025-11-28T12:34:57.456Z DEBUG    [a1b2c3d4e5] Received ping, sending pong
```
