/**
 * Dashboard Feature
 * 
 * Manages the dashboard HTTP server with all routes and SSE broadcasting
 * Part of Features Layer - wraps existing server logic for now
 */

import * as vscode from 'vscode';
import * as http from 'http';
import type { SimpleSSEManager } from '../../infrastructure/http';
import { DASHBOARD_PORT } from '../../core/constants';

export interface DashboardOptions {
	server: http.Server;
	sseManager: SimpleSSEManager;
	context: vscode.ExtensionContext;
}

/**
 * DashboardFeature - Manages the dashboard server lifecycle
 * 
 * This is a lightweight wrapper around the existing HTTP server
 * Future: Extract all route handlers into this class
 */
export class DashboardFeature {
	private server: http.Server;
	private sseManager: SimpleSSEManager;
	private context: vscode.ExtensionContext;

	constructor(options: DashboardOptions) {
		this.server = options.server;
		this.sseManager = options.sseManager;
		this.context = options.context;
	}

	/**
	 * Check if server is running
	 */
	isRunning(): boolean {
		return this.server.listening;
	}

	/**
	 * Open dashboard in browser
	 */
	async openInBrowser(): Promise<void> {
		const url = `http://localhost:${DASHBOARD_PORT}`;
		await vscode.env.openExternal(vscode.Uri.parse(url));
		console.log(`Dashboard opened at ${url}`);
	}

	/**
	 * Broadcast SSE update to all connected clients
	 */
	broadcastUpdate(data: any): void {
		this.sseManager.broadcast('update', data);
	}

	/**
	 * Get SSE client count
	 */
	getClientCount(): number {
		return this.sseManager.getClientCount();
	}

	/**
	 * Close the server
	 */
	async close(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.close((err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}
