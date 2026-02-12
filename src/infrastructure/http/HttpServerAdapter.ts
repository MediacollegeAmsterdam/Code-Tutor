/**
 * HTTP Server Adapter Interface
 * 
 * Abstracts HTTP server operations for dashboard and API endpoints
 * Part of Infrastructure Layer
 */

import type * as http from 'http';

/**
 * Route handler function
 */
export type RouteHandler = (
	req: http.IncomingMessage,
	res: http.ServerResponse
) => void | Promise<void>;

/**
 * HTTP Server interface
 */
export interface HttpServerAdapter {
	/**
	 * Register a route handler
	 */
	on(method: string, path: string, handler: RouteHandler): void;

	/**
	 * Start the server
	 */
	start(port: number): Promise<void>;

	/**
	 * Stop the server
	 */
	stop(): Promise<void>;

	/**
	 * Check if server is running
	 */
	isRunning(): boolean;

	/**
	 * Get the server port
	 */
	getPort(): number | undefined;
}

/**
 * SSE (Server-Sent Events) Client
 */
export interface SSEClient {
	write(data: string): void;
	end(): void;
}

/**
 * SSE Manager Interface
 */
export interface SSEManager {
	/**
	 * Add a client to the SSE connection pool
	 */
	addClient(client: SSEClient): void;

	/**
	 * Remove a client from the pool
	 */
	removeClient(client: SSEClient): void;

	/**
	 * Broadcast a message to all connected clients
	 */
	broadcast(event: string, data: any): void;

	/**
	 * Get the number of connected clients
	 */
	getClientCount(): number;
}
