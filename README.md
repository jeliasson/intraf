# intraf
An open-source tunneling service

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
