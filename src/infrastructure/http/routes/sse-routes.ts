import * as http from 'http';
import { RouteHandler } from '../Router';
import { SimpleSSEManager } from '../SimpleSSEManager';

/**
 * SSE routes for real-time dashboard updates
 */

/**
 * GET /events - Server-Sent Events endpoint for live dashboard updates
 * 
 * Factory function that creates SSE handler with injected dependencies
 */
export function createSSEHandler(
	sseManager: SimpleSSEManager,
	getOrCreateStudentId: () => string,
	loadStudentData: () => Record<string, any>
): RouteHandler {
	return async (req, res, params, body) => {
		const studentId = getOrCreateStudentId();
		const allStudentsData = loadStudentData();
		const progressData = allStudentsData[studentId] || {};
		
		// Create SSE client and send initial data
		const client = sseManager.createClient(res);
		res.write(`data: ${JSON.stringify(progressData)}\n\n`);
	};
}
