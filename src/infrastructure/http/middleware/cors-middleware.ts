import * as http from 'http';
import { Middleware } from '../Router';

/**
 * CORS middleware - adds CORS headers to all responses
 */
export const corsMiddleware: Middleware = async (req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	// Handle preflight OPTIONS requests
	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	await next();
};
