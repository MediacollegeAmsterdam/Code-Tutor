import * as http from 'http';
import { Middleware } from '../Router';

/**
 * Logger middleware - logs all incoming requests
 */
export const loggerMiddleware: Middleware = async (req, res, next) => {
	const start = Date.now();
	const method = req.method || 'UNKNOWN';
	const url = req.url || '/';

	// Log request
	console.log(`[${new Date().toISOString()}] ${method} ${url}`);

	await next();

	// Log response time
	const duration = Date.now() - start;
	console.log(`[${new Date().toISOString()}] ${method} ${url} - ${duration}ms`);
};
