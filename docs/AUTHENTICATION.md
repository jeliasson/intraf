# Authentication System

The intraf project includes a JWT token-based authentication system with interactive login to secure WebSocket connections.

## Overview

- **Authentication Flow**: Server requests authentication → Client sends token or prompts for login → Server validates → Connection allowed/denied
- **Interactive Login**: If no token exists or token is invalid, client prompts for username/password
- **Token Storage**: Cross-platform credentials file (`~/.local/state/intraf/credentials.json` on Linux)
- **Token Format**: JWT (JSON Web Tokens) with HMAC-SHA256 signing
- **Auto-save**: Newly issued tokens are automatically saved to credentials file

## Configuration

### Server Configuration

Add to `server/intraf.yaml` or use environment variables/CLI arguments:

```yaml
auth:
  enabled: true
  secret: "your-secret-key-here"  # Change this in production!
```

CLI arguments:
- `--auth-enabled=true` - Enable authentication
- `--auth-secret=your-secret` - JWT secret key

Environment variables:
- `INTRAF_AUTH_ENABLED=true`
- `INTRAF_AUTH_SECRET=your-secret`

## Authentication Flow

### With Valid Token

1. **Client connects** to server via WebSocket
2. **Server sends** `CLIENT_ID` message with assigned client ID
3. **Server sends** `AUTH_REQUEST` message (if auth enabled)
4. **Client sends** `AUTH_RESPONSE` with stored JWT token
5. **Server validates** token and sends `AUTH_RESULT`:
   - Success (200): Client is authenticated, connection continues
   - Failure (401): Client prompts for login (see below)

### Without Token or Invalid Token

1. **Client connects** to server via WebSocket
2. **Server sends** `AUTH_REQUEST` message
3. **Client sends** `AUTH_RESPONSE` with `null` token (no token available)
4. **Server sends** `AUTH_RESULT` with 401 status
5. **Client prompts** user for username and password via stdin
6. **Client sends** `LOGIN_REQUEST` with credentials
7. **Server validates** credentials and sends `LOGIN_RESPONSE`:
   - Success: Includes JWT token, client saves it and continues
   - Failure: Connection closes

### Token Expiration Flow

1. **Client connects** with expired token
2. **Server validates** and rejects expired token with `AUTH_RESULT` (401)
3. **Client detects** auth failure and prompts for login
4. **Client sends** `LOGIN_REQUEST` with fresh credentials
5. **Server issues** new token via `LOGIN_RESPONSE`
6. **Client saves** new token and continues

## Message Types

### AUTH_REQUEST
Server → Client
```json
{
  "type": "auth.request"
}
```

### AUTH_RESPONSE
Client → Server
```json
{
  "type": "auth.response",
  "token": "<jwt-token>" // or null if no token available
}
```

### AUTH_RESULT
Server → Client
```json
{
  "type": "auth.result",
  "success": true,
  "status": 200,
  "message": "Authentication successful"
}
```

### LOGIN_REQUEST
Client → Server
```json
{
  "type": "login.request",
  "username": "myusername",
  "password": "mypassword"
}
```

### LOGIN_RESPONSE
Server → Client
```json
{
  "type": "login.response",
  "success": true,
  "token": "<jwt-token>",
  "message": "Login successful"
}
```

## Credentials File

The client stores credentials in a platform-specific location:

- **Linux**: `~/.local/state/intraf/credentials.json` (or `$XDG_STATE_HOME/intraf/credentials.json`)
- **macOS**: `~/Library/Application Support/intraf/credentials.json`
- **Windows**: `%LOCALAPPDATA%\intraf\credentials.json`

Format:
```json
{
  "token": "<jwt-token>"
}
```

## Generating Tokens

Use the helper script to generate and save a token:

```bash
# Generate token for a subject (user/client identifier)
deno run --allow-write --allow-read --allow-env scripts/generate-token.ts test-user

# With custom secret
deno run --allow-write --allow-read --allow-env scripts/generate-token.ts test-user my-secret-key

# With custom expiry (in seconds)
deno run --allow-write --allow-read --allow-env scripts/generate-token.ts test-user my-secret-key 3600
```

The token will be saved to the credentials file automatically.

## Testing Authentication

### Test 1: Interactive Login (No Token)

1. **Start server with auth enabled:**
```bash
cd server
deno task run -- --auth-enabled=true --auth-secret=test-secret
```

2. **Connect client (without any token):**
```bash
cd client
deno task run
```

3. **Client will prompt for credentials:**
```
=== Authentication Required ===
Username: myuser
Password: mypassword
```

4. **Enter any username/password** (currently accepts all credentials)

5. **Observe the flow:**
   - Client: `Login successful! Token received and saved.`
   - Server: `Login successful for user: myuser`
   - Token is automatically saved to credentials file

### Test 2: Token Authentication (With Saved Token)

1. **Start server** (same as above)

2. **Connect client** (token from previous login is now saved):
```bash
cd client
deno task run
```

3. **Observe automatic authentication:**
   - Client: `Authentication successful (200)`
   - Server: `Client authenticated (sub: myuser)`
   - No prompt appears - uses saved token

### Test 3: Expired/Invalid Token

1. **Start server with different secret** (invalidates existing token):
```bash
cd server
deno task run -- --auth-enabled=true --auth-secret=different-secret
```

2. **Connect client:**
```bash
cd client
deno task run
```

3. **Observe re-authentication:**
   - Client: `Authentication failed (401): Invalid or expired token`
   - Client: `Token invalid or expired, prompting for login`
   - Prompts for username/password
   - Issues new token with correct secret

### Test 4: Manual Token Generation

You can also pre-generate tokens using the helper script:

```bash
# Generate token for a subject
deno run --allow-write --allow-read --allow-env scripts/generate-token.ts test-user test-secret
```

The client will automatically load and send the token. Check the logs:
- Client: `Authentication successful (200)` or `Authentication failed (401)`
- Server: `Client authenticated (sub: test-user)` or `Authentication failed: invalid token`

## API Reference

### Common Module

**`common/src/auth.ts`**
- `createToken(subject, secret, expiresInSeconds)` - Generate JWT token
- `verifyToken(token, secret)` - Verify and decode JWT token
- `getKey(secret)` - Generate cryptographic key from secret

**`common/src/credentials.ts`**
- `loadCredentials()` - Load credentials from file
- `saveCredentials(credentials)` - Save credentials to file
- `deleteCredentials()` - Delete credentials file
- `getCredentialsPath()` - Get path to credentials file

**`common/src/types.ts`**
- `MessageType.AUTH_REQUEST` - Auth request message type
- `MessageType.AUTH_RESPONSE` - Auth response message type
- `MessageType.AUTH_RESULT` - Auth result message type
- `isAuthRequestMessage(data)` - Type guard for auth request
- `isAuthResponseMessage(data)` - Type guard for auth response
- `isAuthResultMessage(data)` - Type guard for auth result

## Security Considerations

1. **Change the default secret** in production environments
2. **Use environment variables** or secure config files for secrets
3. **Set appropriate token expiry** based on your security requirements
4. **Token format**: Currently stores tokens in plaintext - consider encryption for production
5. **HTTPS/WSS**: Use secure WebSocket connections (wss://) in production

## Future Enhancements

Potential improvements for the authentication system:

- Token refresh mechanism
- Multiple authentication methods (API keys, OAuth, etc.)
- User management and registration
- Role-based access control (RBAC)
- Token revocation/blacklisting
- Encrypted credential storage
- Two-factor authentication (2FA)

---

**Last Updated**: January 2026
