import { RouteHandler } from '../Router';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Discord bot integration route
 */

/**
 * GET /api/discord - Returns formatted data for Discord embeds
 */
export function createDiscordDataHandler(
	context: vscode.ExtensionContext,
	getSkillLevel: (total: number) => { level: string; emoji: string },
	calculateAchievements: (data: Record<string, number>) => any[]
): RouteHandler {
	return async (req, res, params, body) => {
		const userProfile = context.globalState.get<any>('userProfile') || { 
			yearLevel: 2 as const, 
			difficultyMultiplier: 1, 
			lastUpdated: new Date().toISOString() 
		};
		const yearKey = userProfile.yearLevel.toString();
		const allStudentsData = context.globalState.get<Record<string, Record<string, number>>>('studentProgress', {});
		const progressData = allStudentsData[yearKey] || {};
		const total = Object.values(progressData).reduce((a, b) => a + b, 0);

		const { level: skillLevel, emoji: skillEmoji } = getSkillLevel(total);
		const achievements = calculateAchievements(progressData);
		const topCommands = Object.entries(progressData)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([cmd, count]) => `/${cmd}: ${count}x`);

		const discordData = {
			username: 'VS Code User',
			totalInteractions: total,
			skillLevel,
			skillEmoji,
			commandsUsed: Object.keys(progressData).length,
			achievements,
			achievementCount: achievements.length,
			topCommands,
			yearLevel: userProfile?.yearLevel || 'Not set',
			difficulty: userProfile ? (userProfile.yearLevel === 2 ? 'Year 2' : 'Other') : 'Not set',
			rawData: progressData,
			lastUpdated: new Date().toISOString()
		};

		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify(discordData));
	};
}

/**
 * GET /api/history - Get daily interaction history and streak
 */
export function createHistoryHandler(
	context: vscode.ExtensionContext
): RouteHandler {
	return async (req, res, params, body) => {
		const dailyHistory = context.globalState.get<Record<string, number>>('dailyHistory', {});

		// Calculate streak
		let streak = 0;
		const today = new Date();
		for (let i = 0; i < 365; i++) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			const dateStr = d.toISOString().split('T')[0];
			if (dailyHistory[dateStr] && dailyHistory[dateStr] > 0) {
				streak++;
			} else if (i > 0) {
				break;
			}
		}

		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify({ daily: dailyHistory, streak }));
	};
}

/**
 * GET /api/paths - Get all learning paths with progress
 */
export function createPathsHandler(
	context: vscode.ExtensionContext,
	LEARNING_PATHS: any
): RouteHandler {
	return async (req, res, params, body) => {
		const pathProgress = context.globalState.get<Record<string, Record<string, boolean>>>('learningPathProgress', {});
		const pathsWithProgress = Object.values(LEARNING_PATHS).map((path: any) => {
			const progress = pathProgress[path.id] || {};
			const completedModules = path.modules.filter((m: any) => progress[m.id]).length;
			return {
				...path,
				completedModules,
				totalModules: path.modules.length,
				progressPercent: Math.round((completedModules / path.modules.length) * 100)
			};
		});
		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		res.end(JSON.stringify(pathsWithProgress));
	};
}

/**
 * GET /api/paths/:id - Get specific learning path with module progress
 */
export function createPathDetailHandler(
	context: vscode.ExtensionContext,
	LEARNING_PATHS: any
): RouteHandler {
	return async (req, res, params, body) => {
		const pathId = params.id;
		const path = LEARNING_PATHS[pathId];
		
		if (path) {
			const pathProgress = context.globalState.get<Record<string, Record<string, boolean>>>('learningPathProgress', {});
			const progress = pathProgress[path.id] || {};
			const pathWithProgress = {
				...path,
				modules: path.modules.map((m: any) => ({
					...m,
					completed: !!progress[m.id]
				}))
			};
			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify(pathWithProgress));
		} else {
			res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Path not found' }));
		}
	};
}

/**
 * GET /api/assignments - Get all assignments with metadata
 */
export function createAssignmentsListHandler(
	context: vscode.ExtensionContext
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const assignmentsDir = path.join(context.extensionPath, 'assignments');
			if (!fs.existsSync(assignmentsDir)) {
				res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
				res.end(JSON.stringify([]));
				return;
			}

			const files = fs.readdirSync(assignmentsDir).filter(f => f.endsWith('.md'));
			const assignments = files.map(file => {
				const filePath = path.join(assignmentsDir, file);
				const content = fs.readFileSync(filePath, 'utf8');
				const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
				const metadata: any = {};

				if (yamlMatch) {
					const yamlContent = yamlMatch[1];
					yamlContent.split('\n').forEach((line: string) => {
						const [key, ...valueParts] = line.split(':');
						if (key && valueParts.length > 0) {
							const value = valueParts.join(':').trim();
							metadata[key.trim()] = value;
						}
					});
				}

				return {
					id: file.replace('.md', ''),
					filename: file,
					title: metadata.title || file.replace('.md', ''),
					difficulty: metadata.difficulty || 'unknown',
					topic: metadata.topic || 'General',
					dueDate: metadata.dueDate || null,
					estimatedTime: metadata.estimatedTime ? parseInt(metadata.estimatedTime) : null
				};
			});

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify(assignments));
		} catch (error) {
			console.error('Error loading assignments:', error);
			res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Failed to load assignments' }));
		}
	};
}

/**
 * GET /api/assignments/:id - Get specific assignment content
 */
export function createAssignmentDetailHandler(
	context: vscode.ExtensionContext,
	getOrCreateStudentId: () => string
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const assignmentId = params.id;
			const filePath = path.join(context.extensionPath, 'assignments', assignmentId + '.md');

			if (!fs.existsSync(filePath)) {
				res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
				res.end(JSON.stringify({ error: 'Assignment not found' }));
				return;
			}

			const content = fs.readFileSync(filePath, 'utf8');
			const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
			const markdownContent = yamlMatch ? content.substring(yamlMatch[0].length).trim() : content;

			const metadata: any = {};
			if (yamlMatch) {
				const yamlContent = yamlMatch[1];
				yamlContent.split('\n').forEach((line: string) => {
					const [key, ...valueParts] = line.split(':');
					if (key && valueParts.length > 0) {
						const value = valueParts.join(':').trim();
						metadata[key.trim()] = value;
					}
				});
			}

			// Get highlight from student progress
			const studentId = getOrCreateStudentId();
			const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
			const studentProgress = assignmentProgress[studentId]?.[assignmentId];
			const highlight = studentProgress?.highlight || '';

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({
				id: assignmentId,
				metadata,
				content: markdownContent,
				highlight: highlight
			}));
		} catch (error) {
			console.error('Error loading assignment:', error);
			res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Failed to load assignment' }));
		}
	};
}
