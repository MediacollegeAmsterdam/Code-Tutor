import { Router } from './Router';
import { corsMiddleware, errorHandlerMiddleware, loggerMiddleware } from './middleware';
import * as vscode from 'vscode';
import { LiveDemoState } from '../../core/types/common';

// Import all route handlers
import * as sseRoutes from './routes/sse-routes';
import * as progressRoutes from './routes/progress-routes';
import * as assignmentRoutes from './routes/assignment-routes';
import * as teacherRoutes from './routes/teacher-routes';
import * as slideRoutes from './routes/slide-routes';
import * as explainRoutes from './routes/explain-routes';
import * as staticRoutes from './routes/static-routes';
import * as livedemoRoutes from './routes/livedemo-routes';
import * as miscRoutes from './routes/misc-routes';
import * as promptsRoutes from './routes/prompts-routes';

/**
 * Configuration object for initializing routes with all necessary dependencies
 */
export interface RouteConfig {
	context: vscode.ExtensionContext;
	sseManager: any;
	getOrCreateStudentId: () => string;
	loadStudentData: () => Record<string, any>;
	broadcastSSEUpdate: (data: any) => void;
	getAllStudentsStats: () => any[];
	getClassStats: () => any;
	getEarlyWarnings: () => any[];
	slideshowFeature: any;
	getSkillLevel: (total: number) => { level: string; emoji: string };
	calculateAchievements: (data: Record<string, number>) => any[];
	LEARNING_PATHS: any;
	loadPrompts: () => any;
	liveDemoState: LiveDemoState;
	setLiveDemoState: (state: LiveDemoState) => void;
	getLiveDemoState: () => LiveDemoState;
}

/**
 * Create and configure the HTTP router with all routes and middleware
 */
export function initializeRouter(config: RouteConfig): Router {
	const router = new Router();

	// Register global middleware
	router.use(corsMiddleware);
	router.use(loggerMiddleware);
	router.use(errorHandlerMiddleware);

	// ========== SSE Route ==========
	router.get('/events', sseRoutes.createSSEHandler(
		config.sseManager,
		config.getOrCreateStudentId,
		config.loadStudentData
	));

	// ========== Progress Route ==========
	router.get('/api/progress', progressRoutes.createProgressHandler(
		config.getOrCreateStudentId,
		config.loadStudentData
	));

	// ========== Assignment Routes ==========
	router.get('/api/assignment-status', assignmentRoutes.createAssignmentStatusHandler(
		config.getOrCreateStudentId,
		config.context
	));

	router.post('/api/send-chat-message', assignmentRoutes.createSendChatMessageHandler(
		config.context,
		config.broadcastSSEUpdate
	));

	router.post('/api/save-highlight', assignmentRoutes.createSaveHighlightHandler(
		config.getOrCreateStudentId,
		config.context
	));

	router.delete('/api/delete-assignment/:id', assignmentRoutes.createDeleteAssignmentHandler(
		config.getOrCreateStudentId,
		config.context,
		config.broadcastSSEUpdate
	));

	router.get('/api/assignments', miscRoutes.createAssignmentsListHandler(config.context));
	router.get('/api/assignments/:id', miscRoutes.createAssignmentDetailHandler(
		config.context,
		config.getOrCreateStudentId
	));

	// ========== Teacher Routes ==========
	router.get('/api/teacher/students', teacherRoutes.createStudentsHandler(
		config.getAllStudentsStats
	));

	router.get('/api/teacher/class-stats', teacherRoutes.createClassStatsHandler(
		config.getClassStats
	));

	router.get('/api/teacher/warnings', teacherRoutes.createWarningsHandler(
		config.getEarlyWarnings
	));

	router.get('/api/teacher/dashboard', teacherRoutes.createTeacherDashboardHandler(
		config.getClassStats,
		config.getAllStudentsStats,
		config.getEarlyWarnings
	));

	router.post('/api/teacher/broadcast', teacherRoutes.createBroadcastHandler(
		config.broadcastSSEUpdate
	));

	// ========== Slide Routes ==========
	router.get('/api/slides', slideRoutes.createGetSlidesHandler(config.slideshowFeature));
	router.post('/api/slides', slideRoutes.createAddSlideHandler(config.slideshowFeature));
	router.delete('/api/slides/:id', slideRoutes.createDeleteSlideHandler(config.slideshowFeature));

	// ========== Live Demo Routes ==========
	router.post('/api/teacher/live-demo/start', livedemoRoutes.createStartLiveDemoHandler(
		config.getLiveDemoState,
		config.setLiveDemoState,
		config.broadcastSSEUpdate
	));

	router.post('/api/teacher/live-demo/stop', livedemoRoutes.createStopLiveDemoHandler(
		config.getLiveDemoState,
		config.setLiveDemoState,
		config.broadcastSSEUpdate
	));

	router.get('/api/teacher/live-demo/current', livedemoRoutes.createGetLiveDemoStateHandler(
		config.getLiveDemoState
	));

	router.post('/api/teacher/live-demo/update', livedemoRoutes.createUpdateLiveDemoHandler(
		config.getLiveDemoState,
		config.setLiveDemoState,
		config.broadcastSSEUpdate
	));

	// ========== Misc Routes ==========
	router.get('/api/discord', miscRoutes.createDiscordDataHandler(
		config.context,
		config.getSkillLevel,
		config.calculateAchievements
	));

	router.get('/api/history', miscRoutes.createHistoryHandler(config.context));

	router.get('/api/paths', miscRoutes.createPathsHandler(
		config.context,
		config.LEARNING_PATHS
	));

	router.get('/api/paths/:id', miscRoutes.createPathDetailHandler(
		config.context,
		config.LEARNING_PATHS
	));

	// ========== Prompts Routes ==========
	router.get('/api/prompts', promptsRoutes.createPromptsHandler(config.loadPrompts));
	router.get('/api/prompts/:type', promptsRoutes.createPromptTypeHandler(config.loadPrompts));
	router.get('/api/adaptive-prompts/:yearLevel', promptsRoutes.createAdaptivePromptsHandler(config.loadPrompts));
	router.get('/api/health', promptsRoutes.createHealthHandler());

	// ========== Explain Route ==========
	router.post('/api/explain', explainRoutes.createExplainHandler());

	// ========== Static Files (fallback) ==========
	// This matches all remaining paths for static file serving
	router.get('*', staticRoutes.createStaticFileHandler(config.context));

	return router;
}
