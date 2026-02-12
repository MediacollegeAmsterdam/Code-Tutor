/**
 * Simple HTTP Server Implementation
 * 
 * Basic HTTP server for dashboard and API endpoints
 * Part of Infrastructure Layer
 */

import * as http from 'http';
import type { HttpServerAdapter, RouteHandler } from './HttpServerAdapter';

interface Route {
	method: string;
	path: string;
	handler: RouteHandler;
}

export class SimpleHttpServer implements HttpServerAdapter {
	private server: http.Server | undefined;
	private routes: Route[] = [];
	private port: number | undefined;

	on(method: string, path: string, handler: RouteHandler): void {
		this.routes.push({ method, path, handler });
	}

	async start(port: number): Promise<void> {
		if (this.server) {
			throw new Error('Server already running');
		}

		this.port = port;
		
		this.server = http.createServer(async (req, res) => {
			const url = req.url || '/';
			const method = req.method || 'GET';

			// Find matching route
			const route = this.routes.find(r => 
				r.method === method && this.matchPath(r.path, url)
			);

			if (route) {
				try {
					await route.handler(req, res);
				} catch (error) {
					console.error('Route handler error:', error);
					if (!res.headersSent) {
						res.writeHead(500, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Internal server error' }));
					}
				}
			} else {
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('Not Found');
			}
		});

		return new Promise((resolve, reject) => {
			this.server!.listen(port, () => {
				console.log(`Server started on port ${port}`);
				resolve();
			});

			this.server!.on('error', (error: any) => {
				if (error.code === 'EADDRINUSE') {
					console.log(`Port ${port} is already in use`);
					resolve(); // Resolve anyway - server might already be running
				} else {
					reject(error);
				}
			});
		});
	}

	async stop(): Promise<void> {
		if (!this.server) {
			return;
		}

		return new Promise((resolve, reject) => {
			this.server!.close((err) => {
				if (err) {
					reject(err);
				} else {
					this.server = undefined;
					this.port = undefined;
					resolve();
				}
			});
		});
	}

	isRunning(): boolean {
		return this.server !== undefined;
	}

	getPort(): number | undefined {
		return this.port;
	}

	private matchPath(routePath: string, requestPath: string): boolean {
		// Simple exact match or wildcard support
		if (routePath === requestPath) {
			return true;
		}

		// Extract just the path without query string
		const cleanPath = requestPath.split('?')[0];
		return routePath === cleanPath;
	}

	/**
	 * Get the underlying http.Server instance
	 * Useful for advanced configurations
	 */
	getServer(): http.Server | undefined {
		return this.server;
	}
}
