import { RouteHandler } from '../Router';

/**
 * Progress routes for student progress data
 */

/**
 * GET /api/progress - Get current student progress data
 */
export function createProgressHandler(
	getOrCreateStudentId: () => string,
	loadStudentData: () => Record<string, any>
): RouteHandler {
	return async (req, res, params, body) => {
		const studentId = getOrCreateStudentId();
		const allStudentsData = loadStudentData();
		const progressData = allStudentsData[studentId] || {};
		
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(progressData));
	};
}
