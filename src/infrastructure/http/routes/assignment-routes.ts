import { RouteHandler } from '../Router';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Assignment routes for managing student assignments
 */

/**
 * GET /api/assignment-status - Get completion status for current student
 */
export function createAssignmentStatusHandler(
	getOrCreateStudentId: () => string,
	context: vscode.ExtensionContext
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const studentId = getOrCreateStudentId();
			const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
			const studentProgress = assignmentProgress[studentId] || {};

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify(studentProgress));
		} catch (error) {
			console.error('Error loading assignment status:', error);
			res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Failed to load assignment status' }));
		}
	};
}

/**
 * POST /api/send-chat-message - Send chat notification for assignment actions
 */
export function createSendChatMessageHandler(
	context: vscode.ExtensionContext,
	broadcastSSEUpdate: (data: any) => void
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const { action, assignmentId } = body;

			// Store message for display
			const lastAssignmentMessage = {
				action,
				assignmentId,
				timestamp: new Date().toISOString()
			};
			context.globalState.update('lastAssignmentMessage', lastAssignmentMessage);

			const actionMessages: Record<string, string> = {
				'start': '▶️ Assignment started! Good luck!',
				'complete': '✅ Assignment completed! Great work!',
				'grade': '🏆 Assignment graded!'
			};

			// Broadcast via SSE
			broadcastSSEUpdate({
				type: 'assignmentMessage',
				action,
				assignmentId,
				message: actionMessages[action] || 'Assignment action completed!',
				timestamp: new Date().toISOString()
			});

			// Trigger feedback command
			setImmediate(async () => {
				try {
					console.log('[DEBUG] Triggering assignment feedback - action:', action);
					await vscode.commands.executeCommand('code-tutor.showAssignmentFeedback', action, assignmentId);
				} catch (e) {
					console.log('[DEBUG] Error in feedback command:', e);
				}
			});

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: true, message: 'Message sent' }));
		} catch (e) {
			res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
		}
	};
}

/**
 * POST /api/save-highlight - Save highlight/notes for assignment
 */
export function createSaveHighlightHandler(
	getOrCreateStudentId: () => string,
	context: vscode.ExtensionContext
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const { assignmentId, highlight } = body;
			const studentId = getOrCreateStudentId();

			// Get existing progress
			const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});

			// Initialize if needed
			if (!assignmentProgress[studentId]) {
				assignmentProgress[studentId] = {};
			}
			if (!assignmentProgress[studentId][assignmentId]) {
				assignmentProgress[studentId][assignmentId] = {};
			}

			// Save highlight
			assignmentProgress[studentId][assignmentId].highlight = highlight;
			assignmentProgress[studentId][assignmentId].highlightUpdatedAt = new Date().toISOString();

			// Persist
			context.globalState.update('assignmentProgress', assignmentProgress);

			console.log('[Highlight] Saved for assignment:', assignmentId, 'length:', highlight?.length || 0);

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: true, message: 'Highlight saved' }));
		} catch (e) {
			console.error('[Highlight] Error saving:', e);
			res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
		}
	};
}

/**
 * DELETE /api/delete-assignment/:id - Delete a graded assignment
 */
export function createDeleteAssignmentHandler(
	getOrCreateStudentId: () => string,
	context: vscode.ExtensionContext,
	broadcastSSEUpdate: (data: any) => void
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const assignmentId = params.id;
			const studentId = getOrCreateStudentId();
			const filePath = path.join(context.extensionPath, 'assignments', assignmentId + '.md');

			// Check if graded
			const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
			const studentProgress = assignmentProgress[studentId] || {};
			const assignmentStatus = studentProgress[assignmentId];

			if (!assignmentStatus || assignmentStatus.status !== 'graded') {
				res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
				res.end(JSON.stringify({
					success: false,
					message: 'Assignment must be graded before deletion'
				}));
				return;
			}

			// Delete file
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
				console.log('[DEBUG] Deleted assignment file:', filePath);
			}

			// Remove from progress
			if (assignmentProgress[studentId] && assignmentProgress[studentId][assignmentId]) {
				delete assignmentProgress[studentId][assignmentId];
				context.globalState.update('assignmentProgress', assignmentProgress);
			}

			// Broadcast update
			broadcastSSEUpdate({
				type: 'assignmentDeleted',
				assignmentId
			});

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({
				success: true,
				message: 'Assignment deleted successfully'
			}));
		} catch (error) {
			console.error('Error deleting assignment:', error);
			res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({
				error: 'Failed to delete assignment',
				details: error instanceof Error ? error.message : 'Unknown error'
			}));
		}
	};
}
