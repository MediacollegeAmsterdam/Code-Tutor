/**
 * Port Manager - Detects and manages port conflicts
 *
 * Handles automatic port detection, conflict resolution, and persistence
 * Part of Core Services - Minimal external dependencies
 */

import * as net from 'net';

export interface PortConfig {
	preferredPort: number;
	minPort: number;
	maxPort: number;
	serviceId: string;
}

export interface PortAllocationResult {
	port: number;
	isPreferred: boolean;
	portWasChanged: boolean;
}

/**
 * Check if a port is available (not in use)
 */
export async function isPortAvailable(port: number): Promise<boolean> {
	// Validate port number
	if (port < 0 || port > 65535) {
		return false;
	}

	return new Promise((resolve) => {
		const server = net.createServer();

		server.once('error', (err: any) => {
			if (err.code === 'EADDRINUSE') {
				resolve(false);
			} else {
				resolve(false);
			}
		});

		server.once('listening', () => {
			server.close();
			resolve(true);
		});

		server.listen(port, '127.0.0.1');
	});
}

/**
 * Find an available port within a range
 */
export async function findAvailablePort(config: PortConfig): Promise<PortAllocationResult> {
	// Check preferred port first
	if (await isPortAvailable(config.preferredPort)) {
		return {
			port: config.preferredPort,
			isPreferred: true,
			portWasChanged: false
		};
	}

	// Try alternative ports
	for (let port = config.minPort; port <= config.maxPort; port++) {
		if (port === config.preferredPort) {
			continue; // Skip preferred port (already checked)
		}

		if (await isPortAvailable(port)) {
			return {
				port,
				isPreferred: false,
				portWasChanged: true
			};
		}
	}

	// No available port found - return preferred port anyway
	// The caller will get a more helpful error message
	return {
		port: config.preferredPort,
		isPreferred: false,
		portWasChanged: false
	};
}

/**
 * Get list of ports in use on the system (for diagnostics)
 * Note: This is a best-effort check and may not be 100% accurate
 */
export async function getPortsInUse(ports: number[]): Promise<Map<number, boolean>> {
	const results = new Map<number, boolean>();

	for (const port of ports) {
		results.set(port, !(await isPortAvailable(port)));
	}

	return results;
}

