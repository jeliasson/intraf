# Tunnel Server (Data Plane)

This package will contain the tunnel endpoint server responsible for handling actual traffic tunneling.

## Architecture

The intraf system is split into two server components:

### Control Server (`packages/control`)
- Manages client connections via WebSocket
- Handles authentication and authorization
- Maintains client registry and tunnel mappings
- Coordinates tunnel creation and management

### Tunnel Server (`packages/tunnel`) - THIS PACKAGE
- Accepts incoming HTTP/TCP traffic from the internet
- Routes traffic to appropriate clients
- Handles data forwarding and proxying
- Manages tunnel sessions

## Status

🚧 **Under Development** - This is a placeholder for the future data plane implementation.

## Planned Features

- HTTP/HTTPS tunnel endpoints
- TCP tunnel support
- Traffic routing based on control plane coordination
- Multiple tunnel servers for load balancing
- SSL/TLS termination
- Traffic metrics and monitoring

## See Also

- Control server: `packages/control/`
- Client implementation: `packages/client/`
- Common library: `packages/common/`
