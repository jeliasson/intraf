# Configuration System Examples

This document demonstrates the schema-driven configuration system with practical examples.

## Example: Adding a New Configuration Field

Let's say you want to add a timeout setting for the server.

### 1. Add to Schema

Edit `server/src/server.ts`:

```typescript
const serverSchema = {
  server: {
    host: { default: "0.0.0.0", description: "Server host address" },
    port: { default: 8000, description: "Server port" },
    timeout: { default: 30000, description: "Connection timeout in ms" }, // ← NEW
  },
  logLevel: { 
    default: parseLogLevel("info"),
    transform: parseLogLevel,
  },
} satisfies ConfigSchema;
```

### 2. Use the Configuration

The config is automatically available with full TypeScript support:

```typescript
const config = await loadConfig(serverSchema, "./intraf.yaml", "INTRAF", tempLogger);

// Access the new field (fully type-safe!)
console.log(config.server.timeout); // TypeScript knows this is a number
```

### 3. That's It!

You can now set this value via:

**Config file** (`intraf.yaml`):
```yaml
server:
  timeout: 60000
```

**Environment variable**:
```bash
export INTRAF_SERVER_TIMEOUT=60000
```

**CLI argument**:
```bash
deno task dev --server-timeout=60000
```

## Example: Type Transformations

For values that need parsing or transformation, use the `transform` function:

```typescript
const schema = {
  server: {
    // String that needs to be parsed as URL
    apiEndpoint: {
      default: "https://api.example.com",
      transform: (value: string) => new URL(value), // Transform to URL object
    },
    // String list that needs splitting
    allowedOrigins: {
      default: "localhost,example.com",
      transform: (value: string) => value.split(","), // Transform to array
    },
  },
} satisfies ConfigSchema;
```

## Example: Nested Configuration

The system supports arbitrary nesting:

```typescript
const schema = {
  database: {
    host: { default: "localhost" },
    port: { default: 5432 },
  },
  cache: {
    host: { default: "localhost" },
    port: { default: 6379 },
  },
  logLevel: { 
    default: parseLogLevel("info"),
    transform: parseLogLevel,
  },
} satisfies ConfigSchema;

// Results in:
// CLI args: --database-host, --database-port, --cache-host, --cache-port, --log-level
// Env vars: INTRAF_DATABASE_HOST, INTRAF_DATABASE_PORT, INTRAF_CACHE_HOST, etc.
// Config access: config.database.host, config.cache.port, etc.
```

## Example: Schema Separation

Client and server have separate schemas for clarity:

**Server Schema** (`server/src/server.ts`):
```typescript
const serverSchema = {
  server: {
    host: { default: "0.0.0.0" },
    port: { default: 8000 },
  },
  logLevel: { default: parseLogLevel("info"), transform: parseLogLevel },
} satisfies ConfigSchema;
```

**Client Schema** (`client/src/client.ts`):
```typescript
const clientSchema = {
  client: {
    serverUrl: { default: "ws://127.0.0.1:8000" },
    reconnectDelay: { default: 1000 },
  },
  logLevel: { default: parseLogLevel("info"), transform: parseLogLevel },
} satisfies ConfigSchema;
```

This means:
- The server doesn't know about client-specific config
- The client doesn't know about server-specific config
- Each can be configured independently
- Type safety is maintained across both

## Benefits

1. **No Duplication**: Define config structure once
2. **Auto-Generated**: CLI args and env vars automatically created
3. **Type-Safe**: Full TypeScript inference for config values
4. **Consistent**: Same naming convention everywhere
5. **Self-Documenting**: Schema serves as documentation
6. **Flexible**: Easy to extend with new options
