/**
 * SSE (Server-Sent Events) Manager
 * 
 * Manages SSE connections for real-time updates
 * Part of Infrastructure Layer
 */

import type * as http from 'http';
import type { SSEClient, SSEManager } from './HttpServerAdapter';

/**
 * Wrapper for http.ServerResponse to implement SSEClient
 */
class SSEClientWrapper implements SSEClient {
	constructor(private response: http.ServerResponse) {}

	write(data: string): void {
		try {
			this.response.write(data);
		} catch (e) {
			// Client disconnected
		}
	}

	end(): void {
		try {
			this.response.end();
		} catch (e) {
			// Already ended
		}
	}
}

export class SimpleSSEManager implements SSEManager {
	private clients: Set<SSEClient> = new Set();

	addClient(client: SSEClient): void {
		this.clients.add(client);
	}

	removeClient(client: SSEClient): void {
		this.clients.delete(client);
	}

	broadcast(event: string, data: any): void {
		const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
		
		const deadClients: SSEClient[] = [];
		
		for (const client of this.clients) {
			try {
				client.write(message);
			} catch (e) {
				// Mark for removal
				deadClients.push(client);
			}
		}

		// Clean up dead clients
		for (const client of deadClients) {
			this.removeClient(client);
		}
	}

	getClientCount(): number {
		return this.clients.size;
	}

	/**
	 * Create SSE client from http.ServerResponse
	 * Sets appropriate headers for SSE
	 */
	createClient(res: http.ServerResponse): SSEClient {
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*'
		});

		const client = new SSEClientWrapper(res);
		this.addClient(client);

		// Clean up on connection close
		res.on('close', () => {
			this.removeClient(client);
		});

		return client;
	}
}
