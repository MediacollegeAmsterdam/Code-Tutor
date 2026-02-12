import * as http from 'http';
import { Middleware } from '../Router';

/**
 * Error handler middleware - catches errors and sends appropriate response
 */
export const errorHandlerMiddleware: Middleware = async (req, res, next) => {
	try {
		await next();
	} catch (error) {
		console.error('HTTP Error:', error);
		
		if (!res.headersSent) {
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				error: 'Internal Server Error',
				message: error instanceof Error ? error.message : 'Unknown error'
			}));
		}
	}
};
