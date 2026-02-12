import { RouteHandler } from '../Router';

/**
 * Prompts server routes for adaptive prompt retrieval
 */

/**
 * GET /api/prompts - Get all prompts
 */
export function createPromptsHandler(
	loadPrompts: () => any
): RouteHandler {
	return async (req, res, params, body) => {
		const prompts = loadPrompts();
		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify(prompts));
	};
}

/**
 * GET /api/prompts/:type - Get specific prompt by type
 */
export function createPromptTypeHandler(
	loadPrompts: () => any
): RouteHandler {
	return async (req, res, params, body) => {
		const promptType = params.type;
		const prompts = loadPrompts();
		const prompt = prompts.prompts[promptType];

		if (prompt) {
			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ type: promptType, content: prompt }));
		} else {
			res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Prompt type not found' }));
		}
	};
}

/**
 * GET /api/adaptive-prompts/:yearLevel - Get adaptive prompts by year level
 */
export function createAdaptivePromptsHandler(
	loadPrompts: () => any
): RouteHandler {
	return async (req, res, params, body) => {
		const yearLevel = params.yearLevel;
		const prompts = loadPrompts();
		const adaptivePrompt = prompts.adaptivePrompts[yearLevel];

		if (adaptivePrompt) {
			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ yearLevel, prompts: adaptivePrompt }));
		} else {
			res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Year level not found' }));
		}
	};
}

/**
 * GET /api/health - Health check endpoint
 */
export function createHealthHandler(): RouteHandler {
	return async (req, res, params, body) => {
		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify({ status: 'ok', message: 'Prompt server is running' }));
	};
}
