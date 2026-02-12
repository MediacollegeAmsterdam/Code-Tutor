import { RouteHandler } from '../Router';

/**
 * Teacher monitoring routes for class stats and student tracking
 */

/**
 * GET /api/teacher/students - Get all students' statistics
 */
export function createStudentsHandler(
	getAllStudentsStats: () => any[]
): RouteHandler {
	return async (req, res, params, body) => {
		const students = getAllStudentsStats();
		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify(students));
	};
}

/**
 * GET /api/teacher/class-stats - Get class-wide analytics
 */
export function createClassStatsHandler(
	getClassStats: () => any
): RouteHandler {
	return async (req, res, params, body) => {
		const classStats = getClassStats();
		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify(classStats));
	};
}

/**
 * GET /api/teacher/warnings - Get early warning indicators
 */
export function createWarningsHandler(
	getEarlyWarnings: () => any[]
): RouteHandler {
	return async (req, res, params, body) => {
		const warnings = getEarlyWarnings();
		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify(warnings));
	};
}

/**
 * GET /api/teacher/dashboard - Get complete teacher dashboard data
 */
export function createTeacherDashboardHandler(
	getClassStats: () => any,
	getAllStudentsStats: () => any[],
	getEarlyWarnings: () => any[]
): RouteHandler {
	return async (req, res, params, body) => {
		const dashboard = {
			classStats: getClassStats(),
			students: getAllStudentsStats(),
			warnings: getEarlyWarnings(),
			lastUpdated: new Date().toISOString()
		};
		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify(dashboard));
	};
}

/**
 * POST /api/teacher/broadcast - Broadcast message to all students
 */
export function createBroadcastHandler(
	broadcastSSEUpdate: (data: any) => void
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const { message, type } = body;

			const typeIcons: Record<string, string> = {
				'info': 'ℹ️',
				'warning': '⚠️',
				'success': '✅',
				'urgent': '🚨'
			};

			const fullMessage = `${typeIcons[type] || ''} ${message}`;

			// Show in VS Code notification
			const vscode = require('vscode');
			if (type === 'urgent') {
				vscode.window.showErrorMessage(fullMessage);
			} else if (type === 'warning') {
				vscode.window.showWarningMessage(fullMessage);
			} else {
				vscode.window.showInformationMessage(fullMessage);
			}

			// Broadcast via SSE
			broadcastSSEUpdate({
				type: 'teacherBroadcast',
				message: fullMessage,
				messageType: type,
				timestamp: new Date().toISOString()
			});

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: true, recipientCount: 'all' }));
		} catch (e) {
			res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
		}
	};
}
