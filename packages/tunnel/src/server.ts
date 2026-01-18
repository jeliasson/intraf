/**
 * Tunnel Server (Data Plane)
 * 
 * This server will handle the actual traffic tunneling for clients.
 * It will be responsible for:
 * - Accepting HTTP/TCP connections from the public internet
 * - Routing traffic to connected clients via the control plane
 * - Managing tunnel sessions and forwarding data
 * 
 * Architecture:
 * - Control Plane (packages/control): Manages client connections and tunnel registration
 * - Data Plane (packages/tunnel): Handles actual traffic tunneling (this server)
 * - Client (packages/client): Connects to control plane and receives tunneled traffic
 * 
 * TODO: Implement tunnel server
 */

import { Logger } from "@intraf/common/src/cli/logger.ts";

const logger = new Logger("TUNNEL");

logger.info("Tunnel server (data plane) - Coming soon!");
logger.info("This will handle the actual traffic tunneling");
logger.info("See packages/control for the control plane server");

Deno.exit(0);
