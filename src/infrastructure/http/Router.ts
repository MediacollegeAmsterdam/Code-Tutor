import * as http from 'http';

/**
 * Route handler function signature
 */
export type RouteHandler = (
	req: http.IncomingMessage,
	res: http.ServerResponse,
	params: Record<string, string>,
	body?: any
) => Promise<void> | void;

/**
 * Middleware function signature
 */
export type Middleware = (
	req: http.IncomingMessage,
	res: http.ServerResponse,
	next: () => Promise<void>
) => Promise<void> | void;

/**
 * Route match result
 */
interface RouteMatch {
	handler: RouteHandler;
	params: Record<string, string>;
}

/**
 * Express-like HTTP router with path matching and middleware support
 */
export class Router {
	private routes: Map<string, Map<string, RouteHandler>> = new Map();
	private middleware: Middleware[] = [];

	constructor() {
		// Initialize method maps
		this.routes.set('GET', new Map());
		this.routes.set('POST', new Map());
		this.routes.set('PUT', new Map());
		this.routes.set('DELETE', new Map());
	}

	/**
	 * Register middleware
	 */
	use(middleware: Middleware): void {
		this.middleware.push(middleware);
	}

	/**
	 * Register GET route
	 */
	get(path: string, handler: RouteHandler): void {
		this.routes.get('GET')!.set(path, handler);
	}

	/**
	 * Register POST route
	 */
	post(path: string, handler: RouteHandler): void {
		this.routes.get('POST')!.set(path, handler);
	}

	/**
	 * Register PUT route
	 */
	put(path: string, handler: RouteHandler): void {
		this.routes.get('PUT')!.set(path, handler);
	}

	/**
	 * Register DELETE route
	 */
	delete(path: string, handler: RouteHandler): void {
		this.routes.get('DELETE')!.set(path, handler);
	}

	/**
	 * Handle incoming HTTP request
	 */
	async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
		try {
			// Run middleware chain
			await this.runMiddleware(req, res);

			// Find matching route
			const method = req.method || 'GET';
			const url = req.url || '/';
			const match = this.findRoute(method, url);

			if (match) {
				// Parse body if POST/PUT
				let body: any = undefined;
				if (method === 'POST' || method === 'PUT') {
					body = await this.parseBody(req);
				}

				// Execute handler
				await match.handler(req, res, match.params, body);
			} else {
				// 404 Not Found
				res.writeHead(404, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Not Found' }));
			}
		} catch (error) {
			// 500 Internal Server Error
			console.error('Router error:', error);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Internal Server Error' }));
		}
	}

	/**
	 * Run middleware chain
	 */
	private async runMiddleware(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
		for (const mw of this.middleware) {
			let nextCalled = false;
			const next = async () => { nextCalled = true; };
			
			await mw(req, res, next);
			
			if (!nextCalled && res.writableEnded) {
				// Middleware ended response, stop chain
				return;
			}
		}
	}

	/**
	 * Find matching route
	 */
	private findRoute(method: string, url: string): RouteMatch | null {
		const methodRoutes = this.routes.get(method);
		if (!methodRoutes) {
			return null;
		}

		// Extract path without query string
		const path = url.split('?')[0];

		// Try exact match first
		if (methodRoutes.has(path)) {
			return {
				handler: methodRoutes.get(path)!,
				params: {}
			};
		}

		// Try pattern matching with :id params
		let wildcardHandler: RouteHandler | null = null;
		for (const [pattern, handler] of methodRoutes.entries()) {
			// Check for wildcard pattern (fallback)
			if (pattern === '*') {
				wildcardHandler = handler;
				continue;
			}

			const match = this.matchPath(pattern, path);
			if (match) {
				return {
					handler,
					params: match
				};
			}
		}

		// Use wildcard handler as fallback
		if (wildcardHandler) {
			return {
				handler: wildcardHandler,
				params: {}
			};
		}

		return null;
	}

	/**
	 * Match path pattern with :param syntax
	 * Example: /api/assignments/:id matches /api/assignments/123
	 */
	private matchPath(pattern: string, path: string): Record<string, string> | null {
		const patternParts = pattern.split('/');
		const pathParts = path.split('/');

		if (patternParts.length !== pathParts.length) {
			return null;
		}

		const params: Record<string, string> = {};

		for (let i = 0; i < patternParts.length; i++) {
			const patternPart = patternParts[i];
			const pathPart = pathParts[i];

			if (patternPart.startsWith(':')) {
				// Parameter match
				const paramName = patternPart.slice(1);
				params[paramName] = pathPart;
			} else if (patternPart !== pathPart) {
				// Literal doesn't match
				return null;
			}
		}

		return params;
	}

	/**
	 * Parse request body as JSON
	 */
	private parseBody(req: http.IncomingMessage): Promise<any> {
		return new Promise((resolve, reject) => {
			let body = '';
			req.on('data', chunk => { body += chunk.toString(); });
			req.on('end', () => {
				try {
					const parsed = body ? JSON.parse(body) : undefined;
					resolve(parsed);
				} catch (error) {
					reject(error);
				}
			});
			req.on('error', reject);
		});
	}
}
