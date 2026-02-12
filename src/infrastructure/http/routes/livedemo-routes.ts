import { RouteHandler } from '../Router';
import { LiveDemoState } from '../../../core/types/common';

/**
 * Live demo routes for teacher-led live coding sessions
 */

/**
 * POST /api/teacher/live-demo/start - Start a live demo session
 */
export function createStartLiveDemoHandler(
	getLiveDemoState: () => LiveDemoState,
	setLiveDemoState: (state: LiveDemoState) => void,
	broadcastSSEUpdate: (data: any) => void
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const { title, language } = body;

			// Create new live demo state
			const newState: LiveDemoState = {
				active: true,
				title,
				language,
				code: '',
				startedAt: new Date().toISOString(),
				viewerCount: 0
			};

			setLiveDemoState(newState);

			// Broadcast to all students
			broadcastSSEUpdate({
				type: 'liveDemoStart',
				...newState
			});

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: true, state: newState }));
		} catch (e) {
			res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
		}
	};
}

/**
 * POST /api/teacher/live-demo/stop - Stop live demo session
 */
export function createStopLiveDemoHandler(
	getLiveDemoState: () => LiveDemoState,
	setLiveDemoState: (state: LiveDemoState) => void,
	broadcastSSEUpdate: (data: any) => void
): RouteHandler {
	return async (req, res, params, body) => {
		const currentState = getLiveDemoState();
		const newState: LiveDemoState = {
			...currentState,
			active: false
		};

		setLiveDemoState(newState);

		// Broadcast stop
		broadcastSSEUpdate({
			type: 'liveDemoStop'
		});

		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify({ success: true }));
	};
}

/**
 * GET /api/teacher/live-demo/state - Get current live demo state
 */
export function createGetLiveDemoStateHandler(
	getLiveDemoState: () => LiveDemoState
): RouteHandler {
	return async (req, res, params, body) => {
		const state = getLiveDemoState();
		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify(state));
	};
}

/**
 * POST /api/teacher/live-demo/update - Update live demo code
 */
export function createUpdateLiveDemoHandler(
	getLiveDemoState: () => LiveDemoState,
	setLiveDemoState: (state: LiveDemoState) => void,
	broadcastSSEUpdate: (data: any) => void
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const { code } = body;
			const currentState = getLiveDemoState();

			if (!currentState.active) {
				res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
				res.end(JSON.stringify({ success: false, message: 'No active live demo' }));
				return;
			}

			const newState: LiveDemoState = {
				...currentState,
				code
			};

			setLiveDemoState(newState);

			// Broadcast update
			broadcastSSEUpdate({
				type: 'liveDemoUpdate',
				code
			});

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: true }));
		} catch (e) {
			res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
		}
	};
}
