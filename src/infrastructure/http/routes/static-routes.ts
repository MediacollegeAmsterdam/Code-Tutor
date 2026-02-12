import { RouteHandler } from '../Router';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Static file serving routes for dashboard assets
 * 
 * URL Pattern:
 * - `/` and `/dashboard` both serve index.html (consistent user experience)
 * - All other paths serve static files from the dashboard/ directory
 * - Supports .html, .css, .js, .json, .png, .jpg, .svg files
 */

/**
 * Serve static files from dashboard folder
 * This handler receives the full URL path via req.url
 */
export function createStaticFileHandler(
	context: vscode.ExtensionContext
): RouteHandler {
	return async (req, res, params, body) => {
		// Get URL from request object (not params, since this is a fallback route)
		const url = req.url || '/';
		// Serve dashboard for both root and /dashboard paths
		let filePath = (url === '/' || url === '/dashboard') ? '/index.html' : url;
		const fullPath = path.join(context.extensionPath, 'dashboard', filePath);

		// Determine content type
		const ext = path.extname(filePath).toLowerCase();
		const contentTypes: Record<string, string> = {
			'.html': 'text/html',
			'.css': 'text/css',
			'.js': 'application/javascript',
			'.json': 'application/json',
			'.png': 'image/png',
			'.jpg': 'image/jpeg',
			'.svg': 'image/svg+xml'
		};
		const contentType = contentTypes[ext] || 'text/plain';

		try {
			const fileContent = fs.readFileSync(fullPath);
			res.writeHead(200, { 'Content-Type': contentType });
			res.end(fileContent);
		} catch (e) {
			res.writeHead(404);
			res.end('File not found');
		}
	};
}
