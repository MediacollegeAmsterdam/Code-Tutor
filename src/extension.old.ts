import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { spawn, ChildProcess } from 'child_process';

// Infrastructure
import { FileSystemStorage, VSCodeStorage, StudentDataService } from './infrastructure/storage';
import { SimpleHttpServer, SimpleSSEManager } from './infrastructure/http';

// Features
import { DashboardFeature } from './features/dashboard';
import { AssignmentFeature } from './features/assignment';
import { LiveDemoFeature } from './features/livedemo';
import { SlideshowFeature } from './features/slideshow';

// Core Types
import type {
	Module,
	LearningPath,
	Resource,
	ResourceCategory,
	FeedbackSession,
	SkillLevelConfig,
	EducationalSlide,
	SlideCollection,
	CodeContext,
	UserProfile,
	StudentStats,
	ClassStats,
	TeacherDashboard,
	LiveDemoState,
	IntelligentComment
} from './core/types';

// Core Constants
import {
	SKILL_LEVELS,
	ACHIEVEMENTS_THRESHOLDS,
	COMMON_HEADERS,
	DASHBOARD_PORT,
	PROMPT_SERVER_PORT,
	YEAR_LEVEL_CONFIG,
	LEARNING_PATHS,
	RESOURCE_LIBRARY
} from './core/constants';

// Core Domain Logic
import {
	getSkillLevel,
	calculateAchievements,
	generateIntelligentComments,
	generateCommentPreview
} from './core/domain';

// Server and SSE clients for live updates
let server: http.Server | undefined;
let sseManager: SimpleSSEManager | undefined;
let dashboardFeature: DashboardFeature | undefined;
let assignmentFeature: AssignmentFeature | undefined;
let liveDemoFeature: LiveDemoFeature | undefined;
let slideshowFeature: SlideshowFeature | undefined;
let promptServer: ChildProcess | undefined;

// Live Demo State - kept for backward compatibility
let liveDemoState: LiveDemoState = {
	active: false,
	title: '',
	language: 'javascript',
	code: '',
	startedAt: '',
	viewerCount: 0
};

let liveDemoWatcher: vscode.Disposable | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "code-tutor" is now active!');

	// Track last assignment action for chat feedback
	let lastAssignmentAction: { action: string; assignmentId: string; timestamp: string } | null = null;

	// Start the prompt server
	const startPromptServer = () => {
		// Don't auto-spawn - just log that it should be running
		// User can manually start it like the Discord bot: node prompt-server.js
		console.log('📍 Prompt server should be running on port', PROMPT_SERVER_PORT);
		console.log('   If not started, run: node prompt-server.js');
	};

	// Helper function to check if prompt server is responding
	const isPromptServerReady = async (): Promise<boolean> => {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 1500);
			const response = await fetch(`http://localhost:${PROMPT_SERVER_PORT}/api/health`, {
				method: 'GET',
				signal: controller.signal
			});
			clearTimeout(timeout);
			return response.ok;
		} catch (error) {
			return false;
		}
	};

	// Wait for prompt server to be ready before returning
	const waitForPromptServer = async (maxAttempts: number = 3): Promise<boolean> => {
		console.log('🔍 Checking if prompt server is running...');
		for (let i = 0; i < maxAttempts; i++) {
			if (await isPromptServerReady()) {
				console.log('✅ Prompt server is running on port', PROMPT_SERVER_PORT);
				return true;
			}
			await new Promise(resolve => setTimeout(resolve, 500));
		}
		console.warn('⚠️  Prompt server is not responding on port', PROMPT_SERVER_PORT);
		console.warn('   Start it manually: node prompt-server.js');
		return false;
	};

	// Start the prompt server on activation
	startPromptServer();

	// Give the server a moment to start
	waitForPromptServer().catch(e => console.error('Error waiting for prompt server:', e));

	// Initialize storage adapters
	const fileStorage = new FileSystemStorage(context.globalStorageUri.fsPath);
	const vscodeStorage = new VSCodeStorage(context.globalState);
	const studentDataService = new StudentDataService(fileStorage, vscodeStorage);

	// Initialize assignment feature
	assignmentFeature = new AssignmentFeature({
		context,
		getStudentId: () => getOrCreateStudentId(),
		onProgressUpdate: (command) => updateProgress(command),
		onAssignmentAction: (action, assignmentId) => {
			lastAssignmentAction = { action, assignmentId, timestamp: new Date().toISOString() };
			
			const actionMessages: Record<string, string> = {
				'start': '▶️ Assignment started! Good luck!',
				'complete': '✅ Assignment completed! Great work!',
				'grade': '🏆 Assignment graded!'
			};

			// Broadcast SSE update
			broadcastSSEUpdate({
				type: 'assignmentUpdate',
				action,
				assignmentId,
				message: actionMessages[action] || 'Assignment action completed!'
			});

			// Open chat for complete and grade actions
			if (action === 'complete' || action === 'grade') {
				context.globalState.update('lastAssignmentAction', { action, assignmentId, timestamp: new Date().toISOString() });
				vscode.window.showInformationMessage(actionMessages[action] || 'Assignment updated!');

				setTimeout(async () => {
					try {
						await vscode.commands.executeCommand('workbench.action.chat.open', { query: '@tutor /assignment-feedback' });
					} catch (e) {
						try {
							await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
						} catch (e2) {
							console.log('[Chat] Could not open chat');
						}
					}
				}, 500);
			}
		}
	});

	// Initialize live demo feature
	liveDemoFeature = new LiveDemoFeature({
		onBroadcast: (data) => broadcastSSEUpdate(data)
	});

	// Initialize slideshow feature
	slideshowFeature = new SlideshowFeature(
		studentDataService,
		() => vscode.commands.executeCommand('code-tutor.openDashboard')
	);

	// Load prompts from JSON file for prompt server functionality
	const loadPrompts = () => {
		try {
			const promptsPath = path.join(context.extensionPath, 'prompts.json');
			if (fs.existsSync(promptsPath)) {
				const data = fs.readFileSync(promptsPath, 'utf8');
				return JSON.parse(data);
			}
		} catch (error) {
			console.error('Error loading prompts.json:', error);
		}
		return { prompts: {}, adaptivePrompts: {} };
	};

	// Wrapper functions for backward compatibility (async -> sync)
	const getOrCreateStudentId = (): string => {
		// This needs to be updated to async eventually, but for now use a cached value
		let cachedId: string | undefined;
		if (!cachedId) {
			studentDataService.getOrCreateStudentId().then(id => cachedId = id);
			// Temporary synchronous fallback
			cachedId = context.globalState.get<string>('studentId');
			if (!cachedId) {
				cachedId = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				context.globalState.update('studentId', cachedId);
			}
		}
		return cachedId;
	};

	const loadStudentData = (): Record<string, Record<string, number>> => {
		// Synchronous wrapper - to be migrated to async
		let result: Record<string, Record<string, number>> = {};
		studentDataService.loadStudentData().then(data => result = data);
		return result;
	};

	const loadStudentMetadata = (): Record<string, { name: string; yearLevel: number }> => {
		// Synchronous wrapper - to be migrated to async
		let result: Record<string, { name: string; yearLevel: number }> = {};
		studentDataService.loadStudentMetadata().then(data => result = data);
		return result;
	};

	const loadEducationalSlides = (): SlideCollection => {
		// Synchronous wrapper using slideshow feature
		return slideshowFeature?.loadSlidesSync() || { slides: [], lastUpdated: Date.now() };
	};

	const saveEducationalSlides = (collection: SlideCollection) => {
		// Synchronous wrapper using slideshow feature
		slideshowFeature?.saveSlidesSync(collection);
	};

	const saveStudentData = (data: Record<string, Record<string, number>>) => {
		studentDataService.saveStudentData(data).catch(e => 
			console.error('Error saving student data:', e)
		);
	};

	const saveStudentMetadata = (metadata: Record<string, { name: string; yearLevel: number }>) => {
		studentDataService.saveStudentMetadata(metadata).catch(e => 
			console.error('Error saving student metadata:', e)
		);
	};

	// Helper functions for progress calculations
	// Moved to src/core/domain/progress-calculator.ts

	// Broadcast update to all SSE clients
	const broadcastSSEUpdate = (data: any) => {
		if (sseManager) {
			sseManager.broadcast('update', data);
		}
	};

	// ========== LIVE DEMO HELPER FUNCTIONS ==========
	const startLiveDemoWatcher = () => {
		if (liveDemoFeature) {
			// Feature handles watching internally
			// Keep state in sync for backward compatibility
			liveDemoState = liveDemoFeature.getState();
		}
	};

	const stopLiveDemoWatcher = () => {
		if (liveDemoFeature) {
			// Feature handles cleanup internally
			liveDemoState = liveDemoFeature.getState();
		}
	};

	// ========== INTELLIGENT COMMENTS HELPER FUNCTIONS ==========
	// Moved to src/core/domain/comment-generator.ts

	const applyCommentsToEditor = async (editor: vscode.TextEditor, comments: IntelligentComment[]) => {
		// Sort comments by line number in descending order (to insert from bottom to top)
		const sortedComments = [...comments].sort((a, b) => b.line - a.line);

		await editor.edit(editBuilder => {
			sortedComments.forEach(comment => {
				const line = editor.document.lineAt(comment.line);
				const indentation = line.text.match(/^\s*/)?.[0] || '';
				const commentText = indentation + comment.comment + '\n';

				editBuilder.insert(new vscode.Position(comment.line, 0), commentText);
			});
		});
	};

	// Moved to src/core/domain/comment-generator.ts

	const removeAIComments = async (editor: vscode.TextEditor): Promise<number> => {
		const document = editor.document;
		const text = document.getText();
		const lines = text.split('\n');

		const linesToRemove: number[] = [];

		lines.forEach((line, index) => {
			if (line.includes('[AI]')) {
				linesToRemove.push(index);
			}
		});

		if (linesToRemove.length === 0) return 0;

		// Remove lines from bottom to top
		linesToRemove.reverse();

		await editor.edit(editBuilder => {
			linesToRemove.forEach(lineIndex => {
				const line = document.lineAt(lineIndex);
				const range = new vscode.Range(
					lineIndex, 0,
					lineIndex + 1, 0
				);
				editBuilder.delete(range);
			});
		});

		return linesToRemove.length;
	};

	// Teacher monitoring: Get all students' stats (simulated - in real app would query database)
	const getAllStudentsStats = (): StudentStats[] => {
		// Retrieve all student data from shared file storage
		const allStudentsData = loadStudentData();
		const metadata = loadStudentMetadata();

		const students: StudentStats[] = [];

		Object.entries(allStudentsData).forEach(([studentId, progressData]) => {
			const total = Object.values(progressData).reduce((a, b) => a + b, 0);
			const { level: skillLevel, emoji: skillEmoji } = getSkillLevel(total);
			const studentMeta = metadata[studentId] || { name: `Student ${studentId.slice(0, 8)}`, yearLevel: 2 };

			students.push({
				id: studentId,
				studentName: studentMeta.name,
				totalInteractions: total,
				skillLevel,
				skillEmoji,
				yearLevel: studentMeta.yearLevel,
				achievements: calculateAchievements(progressData),
				commandUsage: progressData,
				lastActive: new Date().toISOString(),
				engagementStatus: total > 0 ? 'active' : 'inactive'
			});
		});

		return students;
	};

	// Teacher monitoring: Calculate class-wide statistics
	const getClassStats = (): ClassStats => {
		const students = getAllStudentsStats();
		const totalInteractions = students.reduce((sum, s) => sum + s.totalInteractions, 0);
		const activeToday = students.filter(s => s.engagementStatus === 'active').length;
		const averageProgress = students.length > 0
			? Math.round((students.reduce((sum, s) => sum + s.totalInteractions, 0) / students.length / 10))
			: 0;

		// Aggregate command usage across class
		const commandFrequency: Record<string, number> = {};
		let totalCommandsUsed = 0;
		students.forEach(student => {
			Object.entries(student.commandUsage).forEach(([cmd, count]) => {
				commandFrequency[cmd] = (commandFrequency[cmd] || 0) + count;
				totalCommandsUsed += count;
			});
		});
		const avgCommandsPerStudent = students.length > 0 ? totalCommandsUsed / students.length : 0;

		// Year level breakdown
		const yearBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
		students.forEach(s => {
			yearBreakdown[s.yearLevel]++;
		});

		// Find struggling students
		const strugglingStudents = students
			.filter(s => s.totalInteractions < 10 || s.skillLevel === 'Beginner')
			.map(s => s.id);

		// Most used topics
		const topTopics = Object.entries(commandFrequency)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([topic]) => topic);

		return {
			totalStudents: students.length,
			activeToday,
			averageProgress,
			strugglingStudents,
			topTopics,
			commandFrequency,
			yearLevelBreakdown: yearBreakdown,
			totalCommandsUsed,
			avgCommandsPerStudent
		};
	};

	// Teacher monitoring: Generate early warnings for struggling students
	const getEarlyWarnings = (): Array<{ studentId: string; message: string; severity: 'low' | 'medium' | 'high' }> => {
		const students = getAllStudentsStats();
		const warnings: Array<{ studentId: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];

		students.forEach(student => {
			if (student.totalInteractions === 0) {
				warnings.push({
					studentId: student.id,
					message: 'Geen activiteit gedetecteerd',
					severity: 'high'
				});
			} else if (student.totalInteractions < 5) {
				warnings.push({
					studentId: student.id,
					message: 'Lage betrokkenheid - slechts ' + student.totalInteractions + ' interacties',
					severity: 'medium'
				});
			} else if (student.skillLevel === 'Beginner' && student.totalInteractions > 20) {
				warnings.push({
					studentId: student.id,
					message: 'Veel oefening maar beperkte vooruitgang',
					severity: 'medium'
				});
			}
		});

		return warnings;
	};

	// Function to start the dashboard server
	const startServer = () => {
		if (server) {
			return;
		}

		// Initialize SSE manager
		if (!sseManager) {
			sseManager = new SimpleSSEManager();
		}

		const httpServer = http.createServer(async (req, res) => {
			const url = req.url || '/';

			// SSE endpoint for live updates
			if (url === '/events') {
				const studentId = getOrCreateStudentId();
				const allStudentsData = loadStudentData();
				const progressData = allStudentsData[studentId] || {};
				
				const client = sseManager!.createClient(res);
				res.write(`data: ${JSON.stringify(progressData)}\n\n`);
				return;
			}

			// API endpoint for current data
			if (url === '/api/progress') {
				const studentId = getOrCreateStudentId();
				const allStudentsData = loadStudentData();
				const progressData = allStudentsData[studentId] || {};
				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify(progressData));
				return;
			}

			// Command endpoint - receives commands from Discord bot
			if (url === '/api/command' && req.method === 'POST') {
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				req.on('end', () => {
					try {
						const { command } = JSON.parse(body);
						let success = false;
						let message = '';

						switch (command) {
							case 'openDashboard':
								vscode.commands.executeCommand('code-tutor.openDashboard');
								success = true;
								message = 'Dashboard opened';
								break;
							case 'resetProgress':
								const userProfile = context.globalState.get<UserProfile>('userProfile') || { yearLevel: 2 as const, difficultyMultiplier: 1, lastUpdated: new Date().toISOString() };
								const yearKey = userProfile.yearLevel.toString();
								const allStudentsData = loadStudentData();
								allStudentsData[yearKey] = {};
								saveStudentData(allStudentsData);
								context.globalState.update('learningPathProgress', {});
								broadcastSSEUpdate({});
								success = true;
								message = 'Progress reset';
								break;
							case 'completeModule':
								const { pathId, moduleId } = JSON.parse(body);
								const pathProgress = context.globalState.get<Record<string, Record<string, boolean>>>('learningPathProgress', {});
								if (!pathProgress[pathId]) pathProgress[pathId] = {};
								pathProgress[pathId][moduleId] = true;
								context.globalState.update('learningPathProgress', pathProgress);
								success = true;
								message = `Module ${moduleId} completed`;
								break;
							default:
								message = 'Unknown command';
						}

						res.writeHead(200, {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*'
						});
						res.end(JSON.stringify({ success, message, command }));
					} catch (e) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
					}
				});
				return;
			}

			// Handle assignment actions (submit, start, etc)
			if (url === '/api/assignment-action' && req.method === 'POST') {
				console.log('[DEBUG] Assignment action endpoint called');
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				req.on('end', () => {
					try {
						console.log('[DEBUG] Body received:', body);
						const { action, assignmentId, status } = JSON.parse(body);
						console.log('[DEBUG] Parsed action:', action, 'assignmentId:', assignmentId);
						let success = false;
						let message = '';

						const studentId = getOrCreateStudentId();
						const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});

						if (!assignmentProgress[studentId]) {
							assignmentProgress[studentId] = {};
						}

						switch (action) {
							case 'start':
								assignmentProgress[studentId][assignmentId] = {
									status: 'in-progress',
									startedAt: new Date().toISOString(),
									completedAt: null
								};
								success = true;
								message = `Started assignment: ${assignmentId}`;
								break;
							case 'complete':
								assignmentProgress[studentId][assignmentId] = {
									...assignmentProgress[studentId][assignmentId],
									status: 'completed',
									completedAt: new Date().toISOString()
								};
								success = true;
								message = `Completed assignment: ${assignmentId}`;
								updateProgress('exercise');
								break;
							case 'grade':
								assignmentProgress[studentId][assignmentId] = {
									...assignmentProgress[studentId][assignmentId],
									status: 'graded',
									gradedAt: new Date().toISOString()
								};
								success = true;
								message = `Graded assignment: ${assignmentId}`;
								break;
							default:
								message = 'Unknown action';
						}

						console.log('[DEBUG] Updating progress, success:', success);
						context.globalState.update('assignmentProgress', assignmentProgress);

						// Store the action for chat feedback
						lastAssignmentAction = {
							action,
							assignmentId,
							timestamp: new Date().toISOString()
						};

						const actionMessages: Record<string, string> = {
							'start': '▶️ Assignment started! Good luck!',
							'complete': '✅ Assignment completed! Great work!',
							'grade': '🏆 Assignment graded!'
						};

						broadcastSSEUpdate({
							type: 'assignmentUpdate',
							action,
							assignmentId,
							status: assignmentProgress[studentId][assignmentId]?.status,
							message: actionMessages[action] || 'Assignment action completed!'
						});

						// Automatically open chat for complete and grade actions
						if (action === 'complete' || action === 'grade') {
							// Store the action for feedback display
							const feedbackAction = { action, assignmentId, timestamp: new Date().toISOString() };
							context.globalState.update('lastAssignmentAction', feedbackAction);

							// Show notification
							vscode.window.showInformationMessage(actionMessages[action] || 'Assignment updated!');

							// Open chat with pre-filled feedback command
							setTimeout(async () => {
								try {
									await vscode.commands.executeCommand('workbench.action.chat.open', {
										query: '@tutor /assignment-feedback'
									});
								} catch (e) {
									console.log('[Chat] Primary open failed, trying fallback');
									try {
										await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
									} catch (e2) {
										console.log('[Chat] Fallback failed too');
									}
								}
							}, 500);
						}

						res.writeHead(200, {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*'
						});
						res.end(JSON.stringify({ success, message, action, assignmentId }));
					} catch (e) {
						console.error('[DEBUG] Error in assignment-action:', e);
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
					}
				});
				return;
			}

			// Handle CORS preflight for POST/DELETE requests
			if (req.method === 'OPTIONS') {
				res.writeHead(200, {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type'
				});
				res.end();
				return;
			}

			// API: Get assignment completion status for current student
			if (url === '/api/assignment-status') {
				try {
					const studentId = getOrCreateStudentId();
					const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
					const studentProgress = assignmentProgress[studentId] || {};

					res.writeHead(200, COMMON_HEADERS.json);
					res.end(JSON.stringify(studentProgress));
				} catch (error) {
					console.error('Error loading assignment status:', error);
					res.writeHead(500, COMMON_HEADERS.json);
					res.end(JSON.stringify({ error: 'Failed to load assignment status' }));
				}
				return;
			}

			// API: Send chat message about assignment action
			if (url === '/api/send-chat-message' && req.method === 'POST') {
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				req.on('end', () => {
					try {
						const { action, assignmentId } = JSON.parse(body);

						// Store the message to be displayed
						const lastAssignmentMessage = {
							action,
							assignmentId,
							timestamp: new Date().toISOString()
						};
						context.globalState.update('lastAssignmentMessage', lastAssignmentMessage);

						// Store the action for chat feedback
						lastAssignmentAction = {
							action,
							assignmentId,
							timestamp: new Date().toISOString()
						};

						const actionMessages: Record<string, string> = {
							'start': '▶️ Assignment started! Good luck!',
							'complete': '✅ Assignment completed! Great work!',
							'grade': '🏆 Assignment graded!'
						};

						// Broadcast the message via SSE so dashboard shows notification
						broadcastSSEUpdate({
							type: 'assignmentMessage',
							action,
							assignmentId,
							message: actionMessages[action] || 'Assignment action completed!',
							timestamp: new Date().toISOString()
						});

						// Send direct message to chat via custom command
						setImmediate(async () => {
							try {
								console.log('[DEBUG] Triggering assignment feedback - action:', action);
								// Call the custom command that will show feedback
								await vscode.commands.executeCommand('code-tutor.showAssignmentFeedback', action, assignmentId);
							} catch (e) {
								console.log('[DEBUG] Error in feedback command:', e);
							}
						});

						res.writeHead(200, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: true, message: 'Message sent' }));
					} catch (e) {
						res.writeHead(400, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
					}
				});
				return;
			}

			// API: Save highlight/notes for an assignment
			if (url === '/api/save-highlight' && req.method === 'POST') {
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				req.on('end', () => {
					try {
						const { assignmentId, highlight } = JSON.parse(body);
						const studentId = getOrCreateStudentId();

						// Get existing progress
						const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});

						// Initialize student and assignment if needed
						if (!assignmentProgress[studentId]) {
							assignmentProgress[studentId] = {};
						}
						if (!assignmentProgress[studentId][assignmentId]) {
							assignmentProgress[studentId][assignmentId] = {};
						}

						// Save the highlight
						assignmentProgress[studentId][assignmentId].highlight = highlight;
						assignmentProgress[studentId][assignmentId].highlightUpdatedAt = new Date().toISOString();

						// Persist to globalState
						context.globalState.update('assignmentProgress', assignmentProgress);

						console.log('[Highlight] Saved for assignment:', assignmentId, 'length:', highlight?.length || 0);

						res.writeHead(200, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: true, message: 'Highlight saved' }));
					} catch (e) {
						console.error('[Highlight] Error saving:', e);
						res.writeHead(400, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
					}
				});
				return;
			}

			// API: Delete assignment
			if (url.startsWith('/api/delete-assignment/') && req.method === 'DELETE') {
				try {
					const assignmentId = url.split('/')[3];
					const studentId = getOrCreateStudentId();
					const filePath = path.join(context.extensionPath, 'assignments', assignmentId + '.md');

					// Check if assignment exists and is graded
					const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
					const studentProgress = assignmentProgress[studentId] || {};
					const assignmentStatus = studentProgress[assignmentId];

					if (!assignmentStatus || assignmentStatus.status !== 'graded') {
						res.writeHead(400, {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*'
						});
						res.end(JSON.stringify({
							success: false,
							message: 'Assignment must be graded before deletion'
						}));
						return;
					}

					// Delete the assignment file
					if (fs.existsSync(filePath)) {
						fs.unlinkSync(filePath);
						console.log('[DEBUG] Deleted assignment file:', filePath);
					}

					// Remove from progress tracking
					if (assignmentProgress[studentId] && assignmentProgress[studentId][assignmentId]) {
						delete assignmentProgress[studentId][assignmentId];
						context.globalState.update('assignmentProgress', assignmentProgress);
					}

					// Broadcast SSE update
					broadcastSSEUpdate({
						type: 'assignmentDeleted',
						assignmentId
					});

					res.writeHead(200, {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*'
					});
					res.end(JSON.stringify({
						success: true,
						message: 'Assignment deleted successfully'
					}));
				} catch (error) {
					console.error('Error deleting assignment:', error);
					res.writeHead(500, {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*'
					});
					res.end(JSON.stringify({
						error: 'Failed to delete assignment',
						details: error instanceof Error ? error.message : 'Unknown error'
					}));
				}
				return;
			}

			// Discord bot API endpoint - returns formatted data for Discord embeds
			if (url === '/api/discord') {
				const userProfile = context.globalState.get<UserProfile>('userProfile') || { yearLevel: 2 as const, difficultyMultiplier: 1, lastUpdated: new Date().toISOString() };
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
					difficulty: userProfile ? YEAR_LEVEL_CONFIG[userProfile.yearLevel].name : 'Not set',
					rawData: progressData,
					lastUpdated: new Date().toISOString()
				};

				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify(discordData));
				return;
			}

			// Daily history API endpoint
			if (url === '/api/history') {
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
					} else if (i > 0) { // Don't break on today if no activity yet
						break;
					}
				}

				res.writeHead(200, {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				});
				res.end(JSON.stringify({ daily: dailyHistory, streak }));
				return;
			}

			// Learning Paths API endpoints
			if (url === '/api/paths') {
				const pathProgress = context.globalState.get<Record<string, Record<string, boolean>>>('learningPathProgress', {});
				const pathsWithProgress = Object.values(LEARNING_PATHS).map(path => {
					const progress = pathProgress[path.id] || {};
					const completedModules = path.modules.filter(m => progress[m.id]).length;
					return {
						...path,
						completedModules,
						totalModules: path.modules.length,
						progressPercent: Math.round((completedModules / path.modules.length) * 100)
					};
				});
				res.writeHead(200, {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				});
				res.end(JSON.stringify(pathsWithProgress));
				return;
			}

			// Get specific path with module progress
			if (url?.startsWith('/api/paths/')) {
				const pathId = url.split('/api/paths/')[1];
				const path = LEARNING_PATHS[pathId as keyof typeof LEARNING_PATHS];
				if (path) {
					const pathProgress = context.globalState.get<Record<string, Record<string, boolean>>>('learningPathProgress', {});
					const progress = pathProgress[path.id] || {};
					const pathWithProgress = {
						...path,
						modules: path.modules.map(m => ({
							...m,
							completed: !!progress[m.id]
						}))
					};
					res.writeHead(200, {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*'
					});
					res.end(JSON.stringify(pathWithProgress));
				} else {
					res.writeHead(404, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Path not found' }));
				}
				return;
			}

			// Teacher Monitoring API: Get all students' statistics
			if (url === '/api/teacher/students') {
				const students = getAllStudentsStats();
				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify(students));
				return;
			}

			// Teacher Monitoring API: Get class-wide analytics
			if (url === '/api/teacher/class-stats') {
				const classStats = getClassStats();
				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify(classStats));
				return;
			}

			// Teacher Monitoring API: Get early warnings
			if (url === '/api/teacher/warnings') {
				const warnings = getEarlyWarnings();
				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify(warnings));
				return;
			}

			// Teacher Monitoring API: Get complete dashboard data
			if (url === '/api/teacher/dashboard') {
				const dashboard: TeacherDashboard = {
					classStats: getClassStats(),
					students: getAllStudentsStats(),
					warnings: getEarlyWarnings(),
					lastUpdated: new Date().toISOString()
				};
				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify(dashboard));
				return;
			}

			// ========== LIVE CODE DEMO API ==========
			// Start live demo
			if (url === '/api/teacher/live-demo/start' && req.method === 'POST') {
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				req.on('end', () => {
					try {
						const { title, language } = JSON.parse(body);

						// Store live demo state
						liveDemoState = {
							active: true,
							title: title || 'Live Demo',
							language: language || 'javascript',
							code: '',
							startedAt: new Date().toISOString(),
							viewerCount: 0
						};

						// Start watching the active editor
						startLiveDemoWatcher();

						// Broadcast to all students
						broadcastSSEUpdate({
							type: 'liveDemoStarted',
							title: liveDemoState.title,
							language: liveDemoState.language
						});

						res.writeHead(200, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: true, message: 'Live demo started' }));
					} catch (e) {
						res.writeHead(400, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
					}
				});
				return;
			}

			// Stop live demo
			if (url === '/api/teacher/live-demo/stop' && req.method === 'POST') {
				liveDemoState.active = false;
				stopLiveDemoWatcher();

				broadcastSSEUpdate({
					type: 'liveDemoStopped'
				});

				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify({ success: true, message: 'Live demo stopped' }));
				return;
			}

			// Get current live demo code
			if (url === '/api/teacher/live-demo/current') {
				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify({
					active: liveDemoState.active,
					code: liveDemoState.code,
					viewerCount: liveDemoState.viewerCount,
					title: liveDemoState.title,
					language: liveDemoState.language
				}));
				return;
			}

			// ========== INTELLIGENT CODE COMMENTS API ==========
			// Add smart comments to active file
			if (url === '/api/teacher/add-smart-comments' && req.method === 'POST') {
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				req.on('end', async () => {
					try {
						const { target, studentId, commentTypes, showInEditor } = JSON.parse(body);

						const editor = vscode.window.activeTextEditor;
						if (!editor) {
							res.writeHead(400, COMMON_HEADERS.json);
							res.end(JSON.stringify({ success: false, message: 'No active editor' }));
							return;
						}

						const document = editor.document;
						const code = document.getText();
						const language = document.languageId;

						// Generate intelligent comments using AI
						const comments = await generateIntelligentComments(code, language, commentTypes);

						if (comments.length > 0 && showInEditor) {
							// Apply comments to the editor
							await applyCommentsToEditor(editor, comments);
						}

						res.writeHead(200, COMMON_HEADERS.json);
						res.end(JSON.stringify({
							success: true,
							commentsAdded: comments.length,
							message: `Added ${comments.length} intelligent comments`
						}));
					} catch (e) {
						console.error('Error adding comments:', e);
						res.writeHead(500, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: false, message: 'Error adding comments' }));
					}
				});
				return;
			}

			// Preview comments without applying
			if (url === '/api/teacher/preview-comments' && req.method === 'POST') {
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				req.on('end', async () => {
					try {
						const { commentTypes } = JSON.parse(body);

						const editor = vscode.window.activeTextEditor;
						if (!editor) {
							res.writeHead(400, COMMON_HEADERS.json);
							res.end(JSON.stringify({ success: false, message: 'No active editor' }));
							return;
						}

						const code = editor.document.getText();
						const language = editor.document.languageId;

						const comments = await generateIntelligentComments(code, language, commentTypes);
						const preview = generateCommentPreview(code, comments);

						res.writeHead(200, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: true, preview }));
					} catch (e) {
						res.writeHead(500, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: false, message: 'Error generating preview' }));
					}
				});
				return;
			}

			// Remove AI-generated comments
			if (url === '/api/teacher/remove-comments' && req.method === 'POST') {
				(async () => {
					try {
						const editor = vscode.window.activeTextEditor;
						if (!editor) {
							res.writeHead(400, COMMON_HEADERS.json);
							res.end(JSON.stringify({ success: false, message: 'No active editor' }));
							return;
						}

						const removed = await removeAIComments(editor);

						res.writeHead(200, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: true, removed }));
					} catch (e) {
						res.writeHead(500, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: false, message: 'Error removing comments' }));
					}
				})();
				return;
			}

			// ========== BROADCAST MESSAGE API ==========
			if (url === '/api/teacher/broadcast' && req.method === 'POST') {
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				req.on('end', () => {
					try {
						const { message, type } = JSON.parse(body);

						// Show notification in VS Code
						const typeIcons: Record<string, string> = {
							'info': 'ℹ️',
							'warning': '⚠️',
							'success': '✅',
							'urgent': '🚨'
						};

						const fullMessage = `${typeIcons[type] || ''} ${message}`;

						// Show in VS Code notification
						if (type === 'urgent') {
							vscode.window.showErrorMessage(fullMessage);
						} else if (type === 'warning') {
							vscode.window.showWarningMessage(fullMessage);
						} else {
							vscode.window.showInformationMessage(fullMessage);
						}

						// Broadcast to dashboard SSE
						broadcastSSEUpdate({
							type: 'teacherBroadcast',
							message: fullMessage,
							messageType: type,
							timestamp: new Date().toISOString()
						});

						res.writeHead(200, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: true, recipientCount: 'all' }));
					} catch (e) {
						res.writeHead(400, COMMON_HEADERS.json);
						res.end(JSON.stringify({ success: false, message: 'Invalid request' }));
					}
				});
				return;
			}

			// API: Get assignments list
			if (url === '/api/assignments') {
				try {
					const assignmentsDir = path.join(context.extensionPath, 'assignments');
					if (!fs.existsSync(assignmentsDir)) {
						res.writeHead(200, COMMON_HEADERS.json);
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

					res.writeHead(200, COMMON_HEADERS.json);
					res.end(JSON.stringify(assignments));
				} catch (error) {
					console.error('Error loading assignments:', error);
					res.writeHead(500, COMMON_HEADERS.json);
					res.end(JSON.stringify({ error: 'Failed to load assignments' }));
				}
				return;
			}

			// API: Get specific assignment content
			if (url.startsWith('/api/assignments/')) {
				try {
					const assignmentId = url.split('/')[3];
					const filePath = path.join(context.extensionPath, 'assignments', assignmentId + '.md');

					if (!fs.existsSync(filePath)) {
						res.writeHead(404, COMMON_HEADERS.json);
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

					res.writeHead(200, COMMON_HEADERS.json);
					res.end(JSON.stringify({
						id: assignmentId,
						metadata,
						content: markdownContent,
						highlight: highlight
					}));
				} catch (error) {
					console.error('Error loading assignment:', error);
					res.writeHead(500, COMMON_HEADERS.json);
					res.end(JSON.stringify({ error: 'Failed to load assignment' }));
				}
				return;
			}

			// ========== PROMPT SERVER ENDPOINTS ==========
			const prompts = loadPrompts();

			// Handle GET /api/prompts
			if (req.method === 'GET' && url === '/api/prompts') {
				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify(prompts));
				return;
			}

			// Handle GET /api/prompts/:type
			if (req.method === 'GET' && url.startsWith('/api/prompts/')) {
				const promptType = url.split('/')[3];
				const prompt = prompts.prompts[promptType];

				if (prompt) {
					res.writeHead(200, COMMON_HEADERS.json);
					res.end(JSON.stringify({ type: promptType, content: prompt }));
				} else {
					res.writeHead(404, COMMON_HEADERS.json);
					res.end(JSON.stringify({ error: 'Prompt type not found' }));
				}
				return;
			}

			// Handle GET /api/adaptive-prompts/:yearLevel
			if (req.method === 'GET' && url.startsWith('/api/adaptive-prompts/')) {
				const yearLevel = url.split('/')[3];
				const adaptivePrompt = prompts.adaptivePrompts[yearLevel];

				if (adaptivePrompt) {
					res.writeHead(200, COMMON_HEADERS.json);
					res.end(JSON.stringify({ yearLevel, prompts: adaptivePrompt }));
				} else {
					res.writeHead(404, COMMON_HEADERS.json);
					res.end(JSON.stringify({ error: 'Year level not found' }));
				}
				return;
			}

			// Handle GET /api/health (health check)
			if (req.method === 'GET' && url === '/api/health') {
				res.writeHead(200, COMMON_HEADERS.json);
				res.end(JSON.stringify({ status: 'ok', message: 'Prompt server is running' }));
				return;
			}

			// Handle slides API endpoints
			if (url === '/api/slides') {
				if (req.method === 'GET') {
					// Get all slides using slideshow feature
					const slides = await slideshowFeature?.getSlides() || [];
					res.writeHead(200, COMMON_HEADERS.json);
					res.end(JSON.stringify(slides));
					return;
				}

				if (req.method === 'POST') {
					// Add new slide using slideshow feature
					let body = '';
					req.on('data', chunk => { body += chunk.toString(); });
					req.on('end', async () => {
						try {
							const newSlide = JSON.parse(body);
							const addedSlide = await slideshowFeature?.addSlide(newSlide);

							res.writeHead(201, COMMON_HEADERS.json);
							res.end(JSON.stringify({ success: true, slide: addedSlide }));
						} catch (error) {
							console.error('Error saving slide:', error);
							res.writeHead(400, COMMON_HEADERS.json);
							res.end(JSON.stringify({ error: 'Failed to save slide' }));
						}
					});
					return;
				}
			}

			// Handle DELETE /api/slides/:id
			if (req.method === 'DELETE' && url.startsWith('/api/slides/')) {
				try {
					const slideId = url.split('/')[3];
					const deleted = await slideshowFeature?.deleteSlide(slideId);

					if (!deleted) {
						res.writeHead(404, COMMON_HEADERS.json);
						res.end(JSON.stringify({ error: 'Slide not found' }));
						return;
					}

					res.writeHead(200, COMMON_HEADERS.json);
					res.end(JSON.stringify({ success: true, message: 'Slide deleted' }));
				} catch (error) {
					console.error('Error deleting slide:', error);
					res.writeHead(500, COMMON_HEADERS.json);
					res.end(JSON.stringify({ error: 'Failed to delete slide' }));
				}
				return;
			}

			// Handle POST /api/explain - Generate AI explanation for highlighted text
			if (url === '/api/explain' && req.method === 'POST') {
				let body = '';
				req.on('data', chunk => { body += chunk.toString(); });
				req.on('end', () => {
					try {
						const { text } = JSON.parse(body);

						// Fallback explanations for common programming concepts
						const fallbackExplanations: Record<string, string> = {
							'int': '**Integer (int)** - Een heel getal\\n\\nEen integer is gewoon een getal zonder kommagetallen.',
							'string': '**String** - Tekst/woorden\\n\\nEen string is tekst die je tussen aanhalingstekens zet.',
							'boolean': '**Boolean** - Waar of onwaar\\n\\nEen boolean kan maar twee waarden hebben: true of false.',
							'if': '**if-statement** - Doe iets ALS...\\n\\nEen if-statement laat je code controleren en uitvoeren als een voorwaarde waar is.',
							'for': '**for-loop** - Herhaal X aantal keer\\n\\nEen for-loop voert code uit een vastgesteld aantal keer.',
							'function': '**Function** - Herbruikbare code\\n\\nEen function laat je code schrijven, opslaan, en meerdere keren gebruiken!'
						};

						const lowerText = text.toLowerCase().trim();
						let explanation = fallbackExplanations[lowerText];

						if (!explanation) {
							explanation = `**"${text}"** is een belangrijk concept in programmeren. Bekijk voorbeelden online of test het uit in je editor.`;
						}

						res.writeHead(200, COMMON_HEADERS.json);
						res.end(JSON.stringify({
							explanation: explanation,
							message: explanation,
							success: true
						}));
					} catch (error) {
						console.error('Error in explain endpoint:', error);
						res.writeHead(400, COMMON_HEADERS.json);
						res.end(JSON.stringify({ error: 'Failed to generate explanation' }));
					}
				});
				return;
			}

			// Serve static files from dashboard folder
			let filePath = url === '/' ? '/index.html' : url;
			const fullPath = path.join(context.extensionPath, 'dashboard', filePath);

			// Determine content type based on file extension
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
		});

		server = httpServer;

		// Wrap server in DashboardFeature for better encapsulation
		dashboardFeature = new DashboardFeature({
			server: httpServer,
			sseManager: sseManager!,
			context
		});

		server.listen(DASHBOARD_PORT, () => {
			console.log(`Code Tutor Dashboard running at http://localhost:${DASHBOARD_PORT}`);
			console.log('✅ Integrated prompt server endpoints are active');
			console.log(`✅ Dashboard feature initialized with ${dashboardFeature!.getClientCount()} SSE clients`);
		});

		server.on('error', (e: NodeJS.ErrnoException) => {
			if (e.code === 'EADDRINUSE') {
				console.log('Dashboard port already in use, server may already be running');
				vscode.window.showWarningMessage(`Port ${DASHBOARD_PORT} is already in use. Server may already be running.`);
			} else {
				console.error('Server error:', e);
				vscode.window.showErrorMessage(`Failed to start server: ${e.message}`);
			}
		});

		server.on('listening', () => {
			console.log('✅ Server successfully started and listening');
		});
	};

	// Function to open the dashboard in browser
	const openDashboard = async () => {
		startServer();
		if (dashboardFeature) {
			await dashboardFeature.openInBrowser();
		} else {
			const url = `http://localhost:${DASHBOARD_PORT}`;
			vscode.env.openExternal(vscode.Uri.parse(url));
			console.log(`Dashboard opened at ${url}`);
		}
	};

	// Register the dashboard command
	const dashboardCommand = vscode.commands.registerCommand('code-tutor.openDashboard', openDashboard);
	context.subscriptions.push(dashboardCommand);

	// Register command to show assignment feedback directly
	const feedbackCommand = vscode.commands.registerCommand('code-tutor.showAssignmentFeedback', async (action?: string, assignmentId?: string) => {
		if (action && assignmentId) {
			console.log('[DEBUG] Direct feedback command - action:', action, 'id:', assignmentId);
			lastAssignmentAction = {
				action,
				assignmentId,
				timestamp: new Date().toISOString()
			};
		}

		// Force open the chat with assignment feedback
		try {
			// First, make sure the Copilot Chat View is visible
			await vscode.commands.executeCommand('workbench.view.chat');
			await new Promise(r => setTimeout(r, 200));

			// Use the chat API to send a message
			// This will open chat with the @tutor participant and show feedback
			const feedbackMessages: Record<string, string> = {
				'start': '▶️ Goed gedaan! Je bent begonnen met de opdracht. Veel sterkte! 💪',
				'complete': '✅ Gefeliciteerd! Je hebt de opdracht voltooid! 🎉',
				'grade': '🏆 Je opdracht is beoordeeld! Controleer je feedback en leer ervan! 📚'
			};

			if (lastAssignmentAction) {
				// Show a toast notification first
				const msg = feedbackMessages[lastAssignmentAction.action] || 'Opdracht bijgewerkt!';
				vscode.window.showInformationMessage(msg);

				// Then trigger the chat command
				await vscode.commands.executeCommand('workbench.action.quickOpen', '@tutor /assignment-feedback');
			}
		} catch (e) {
			console.log('[DEBUG] Error in feedback command:', e);
		}
	});
	context.subscriptions.push(feedbackCommand);

	// Register save code slide command
	const saveSlideCommand = vscode.commands.registerCommand('code-tutor.saveCodeSlide', async () => {
		await slideshowFeature?.createSlideFromSelection();
	});
	context.subscriptions.push(saveSlideCommand);

	// Register add slide command (for Ctrl+Shift+S keybinding)
	const addSlideCommand = vscode.commands.registerCommand('code-tutor.addSlide', async () => {
		await slideshowFeature?.quickAddSlideFromSelection();
	});
	context.subscriptions.push(addSlideCommand);	// The command has been defined in the package.json file

	// Register restart prompt server command
	const restartServerCommand = vscode.commands.registerCommand('code-tutor.restartPromptServer', async () => {
		console.log('🔄 Checking prompt server status...');

		const ready = await waitForPromptServer(2);
		if (ready) {
			vscode.window.showInformationMessage('✅ Prompt server is running and responsive!');
			console.log('✅ Prompt server is ready');
		} else {
			vscode.window.showErrorMessage(
				'❌ Prompt server is not running. Open a terminal and run: node prompt-server.js'
			);
			console.error('❌ Prompt server not responding');
		}
	});
	context.subscriptions.push(restartServerCommand);

	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('code-tutor.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Code Tutor!');
	});

	context.subscriptions.push(disposable);

	// Progressive Feedback System: Provides initial feedback, then tips, then examples
	interface FeedbackSession {
		attempts: number;
		lastFeedbackLevel: 'initial' | 'tips' | 'example';
		previousFeedback: string[];
	}

	const feedbackSessions = new Map<string, FeedbackSession>();

	/**
	 * Generates progressive feedback for code issues
	 * Level 1: Initial feedback with problem identification
	 * Level 2: Specific tips and hints (if user doesn't understand level 1)
	 * Level 3: Full example code solution (if user still struggles)
	 */
	const generateProgressiveFeedback = async (
		issue: string,
		code: string,
		language: string,
		model: vscode.LanguageModelChat,
		attempt: number = 1,
		sessionId?: string,
		token?: vscode.CancellationToken
	): Promise<string> => {
		// Get or create feedback session
		const sid = sessionId || `session-${Date.now()}`;
		let session = feedbackSessions.get(sid);

		if (!session) {
			session = {
				attempts: 0,
				lastFeedbackLevel: 'initial',
				previousFeedback: []
			};
			feedbackSessions.set(sid, session);
		}

		session.attempts++;

		// Level 1: Initial Feedback - Ask AI to identify the problem
		if (session.attempts === 1) {
			const initialPrompt = `Je bent een programmeer coach. Een student heeft een probleem met hun code.

			Probleem: ${issue}

			Code:
			\`\`\`${language}
			${code}
			\`\`\`

			Geef korte, begrijpelijke initiële feedback die:
			1. Het probleem duidelijk identificeert
			2. Een gerichte vraag stelt om ze zelf na te denken
			3. Hen aanmoedigt zelf de oplossing te zoeken
			4. Maximaal 150 woorden

			Spreek als een normale Nederlander, zonder emojis.`;

			const messages = [vscode.LanguageModelChatMessage.User(initialPrompt)];

			try {
				const response = await model.sendRequest(messages, {}, token);
				let fullResponse = '';
				for await (const fragment of response.text) {
					fullResponse += fragment;
				}

				session.lastFeedbackLevel = 'initial';
				session.previousFeedback.push(fullResponse);
				return fullResponse;
			} catch (e) {
				return 'Kon feedback niet genereren. Probeer opnieuw.';
			}
		}

		// Level 2: Specific Tips - Ask AI for concrete hints
		if (session.attempts === 2 || session.attempts === 3) {
			const tipsPrompt = `Je bent een programmeer coach. Een student snapt hun probleem nog niet.

				Origineel probleem: ${issue}

				Code:
				\`\`\`${language}
				${code}
				\`\`\`

				Geef nu concrete tips:
				1. 3-4 specifieke dingen om te controleren
				2. Debugtechnieken die helpen (bijv. logging)
				3. Vragen om hun denkproces te structureren
				4. Aanmoediging zonder direct antwoord te geven
				5. Maximaal 200 woorden

				Spreek als een normale Nederlander, zonder emojis.`;

			const messages = [vscode.LanguageModelChatMessage.User(tipsPrompt)];

			try {
				const response = await model.sendRequest(messages, {}, token);
				let fullResponse = '';
				for await (const fragment of response.text) {
					fullResponse += fragment;
				}

				session.lastFeedbackLevel = 'tips';
				session.previousFeedback.push(fullResponse);
				return fullResponse;
			} catch (e) {
				return 'Kon tips niet genereren. Probeer opnieuw.';
			}
		}

		// Level 3: Full Example - Ask AI to provide working solution with explanation
		if (session.attempts >= 4) {
			const examplePrompt = `Je bent een programmeer coach. Een student snapt het nog steeds niet. Nu geven we een volledig voorbeeld.

Origineel probleem: ${issue}

Originele code:
\`\`\`${language}
${code}
\`\`\`

Geef nu:
1. Een volledig werkend voorbeeld in ${language}
2. Regel-voor-regel uitleg van het voorbeeld
3. De kernprincipes die je toepast
4. Hoe ze dit patroon elders kunnen toepassen
5. 300-400 woorden max

Format:
**Werkend Voorbeeld:**
\`\`\`${language}
[code hier]
\`\`\`

**Uitleg:**
[uitleg hier]

Spreek als een normale Nederlander, zonder emojis.`;

			const messages = [vscode.LanguageModelChatMessage.User(examplePrompt)];

			try {
				const response = await model.sendRequest(messages, {}, token);
				let fullResponse = '';
				for await (const fragment of response.text) {
					fullResponse += fragment;
				}

				session.lastFeedbackLevel = 'example';
				session.previousFeedback.push(fullResponse);

				// Clean up old sessions after providing example
				setTimeout(() => {
					feedbackSessions.delete(sid);
				}, 30000); // Keep session for 30 seconds

				return fullResponse;
			} catch (e) {
				return 'Kon voorbeeld niet genereren. Probeer opnieuw.';
			}
		}

		return 'Vraag opnieuw - ik kan je beter helpen';
	};


	/**
	 * Quick feedback evaluator - checks if feedback was helpful
	 */
	const evaluateFeedbackHelpfulness = (sessionId: string): { helpful: boolean; nextStep: string } => {
		const session = feedbackSessions.get(sessionId);

		if (!session) {
			return {
				helpful: false,
				nextStep: 'Geen actieve feedbacksessie gevonden'
			};
		}

		return {
			helpful: session.lastFeedbackLevel !== 'initial',
			nextStep: session.lastFeedbackLevel === 'example'
				? 'Je hebt al heel wat tips gehad! Probeer je best en kom terug als je echt vast zit.'
				: `Vraag hierover meer voor meer begeleiding. Je zit nu op niveau: ${session.lastFeedbackLevel}`
		};
	};

	// Helper function to get code context from editor
	const getCodeContext = (): { code: string; language: string } | null => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return null;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		if (selectedText) {
			return {
				code: `\n\nGeselecteerde code:\n\`\`\`${editor.document.languageId}\n${selectedText}\n\`\`\``,
				language: editor.document.languageId
			};
		}

		const visibleRanges = editor.visibleRanges;
		if (visibleRanges.length > 0) {
			const visibleText = editor.document.getText(visibleRanges[0]);
			if (visibleText.length < 3000) {
				return {
					code: `\n\nZichtbare code in editor:\n\`\`\`${editor.document.languageId}\n${visibleText}\n\`\`\``,
					language: editor.document.languageId
				};
			}
		}

		return null;
	};

	// Helper to track progress and broadcast updates
	const updateProgress = (command: string) => {
		const studentId = getOrCreateStudentId();
		const userProfile = context.globalState.get<UserProfile>('userProfile') || {
			studentId,
			studentName: `Student ${studentId.slice(0, 8)}`,
			yearLevel: 2 as const,
			difficultyMultiplier: 1,
			lastUpdated: new Date().toISOString()
		};

		// Get all students' data from file
		const allStudentsData = loadStudentData();
		const metadata = loadStudentMetadata();

		// Ensure metadata exists for this student
		if (!metadata[studentId]) {
			metadata[studentId] = { name: userProfile.studentName, yearLevel: userProfile.yearLevel };
			saveStudentMetadata(metadata);
		}

		// Update current student's progress
		if (!allStudentsData[studentId]) {
			allStudentsData[studentId] = {};
		}
		allStudentsData[studentId][command] = (allStudentsData[studentId][command] || 0) + 1;
		saveStudentData(allStudentsData);

		// Track daily history
		const today = new Date().toISOString().split('T')[0];
		const dailyHistory = context.globalState.get<Record<string, number>>('dailyHistory', {});
		dailyHistory[today] = (dailyHistory[today] || 0) + 1;
		context.globalState.update('dailyHistory', dailyHistory);

		// Broadcast update to all connected dashboard clients
		broadcastSSEUpdate(allStudentsData[studentId]);
		return allStudentsData[studentId];
	};

	// Store the last used command for follow-up provider
	let lastCommand: string | undefined;

	// Helper function to check if model is "auto" or similar
	const isAutoModel = (model: vscode.LanguageModelChat | undefined): boolean => {
		if (!model) return true;
		const fields = [model.id, model.vendor, model.family, model.name].map(f => (f || '').toLowerCase());
		return fields.some(v => v === 'auto' || v.includes('/auto') || v.includes(' auto'));
	};

	// Helper function to score models by preference
	const scoreModel = (m: vscode.LanguageModelChat): number => {
		const vendorScore = (m.vendor || '').toLowerCase() === 'copilot' ? 1000 : 0;
		const familyScore = /(gpt-4|gpt4o|gpt-4o)/.test((m.family || '').toLowerCase()) ? 200 : 0;
		const tokenScore = Math.min(m.maxInputTokens || 0, 999);
		return vendorScore + familyScore + tokenScore;
	};

	// Get list of usable (non-"auto") models, sorted by preference
	const listConcreteModels = async (): Promise<vscode.LanguageModelChat[]> => {
		try {
			const all = await vscode.lm.selectChatModels();
			return all
				.filter(m => !isAutoModel(m))
				.sort((a, b) => scoreModel(b) - scoreModel(a));
		} catch (e) {
			console.error('Failed to list chat models:', e);
			return [];
		}
	};

	// Get a valid model (maps "auto" to a real model, with fallback)
	const getValidModel = async (model: vscode.LanguageModelChat | undefined): Promise<vscode.LanguageModelChat | null> => {
		try {
			const list = await listConcreteModels();
			if (list.length === 0) return null;

			if (model && !isAutoModel(model)) {
				const found = list.find(m => m.id === model.id);
				return found || list[0];
			}
			return list[0] ?? null;
		} catch (e) {
			console.error('Failed to select valid model:', e);
			return null;
		}
	};

	// define a chat handler
	const handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		chatContext: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	) => {

		lastCommand = request.command;

		// Get a valid model early in the handler
		const model = await getValidModel(request.model);
		if (!model) {
			stream.markdown('❌ Geen AI-model beschikbaar. Zorg ervoor dat je minstens één model hebt geselecteerd in VS Code.');
			return { metadata: { command: request.command || 'error' } };
		}

		// Handle special commands that don't use standard prompts
		const specialCommands = {
			setlevel: async () => {
				const yearPrompt = request.prompt.toLowerCase().trim();

				let yearLevel: 1 | 2 | 3 | 4 = 2; // default

				// First check for direct numbers 1-4
				const numberMatch = yearPrompt.match(/\b[1-4]\b/);
				if (numberMatch) {
					yearLevel = parseInt(numberMatch[0]) as 1 | 2 | 3 | 4;
				}
				// Then check for text keywords
				else if (yearPrompt.includes('first') || yearPrompt.includes('eerstejaars')) {
					yearLevel = 1;
				} else if (yearPrompt.includes('second') || yearPrompt.includes('tweedejaars')) {
					yearLevel = 2;
				} else if (yearPrompt.includes('third') || yearPrompt.includes('derdejaars')) {
					yearLevel = 3;
				} else if (yearPrompt.includes('fourth') || yearPrompt.includes('vierdejaars')) {
					yearLevel = 4;
				}

				const studentId = getOrCreateStudentId();
				const userProfile: UserProfile = {
					studentId,
					studentName: `Student ${studentId.slice(0, 8)}`,
					yearLevel,
					difficultyMultiplier: YEAR_LEVEL_CONFIG[yearLevel].multiplier,
					lastUpdated: new Date().toISOString()
				};

				context.globalState.update('userProfile', userProfile);

				// Also save the updated metadata to file so dashboard sees it
				const metadata = loadStudentMetadata();
				metadata[studentId] = {
					name: userProfile.studentName,
					yearLevel: yearLevel
				};
				saveStudentMetadata(metadata);

				const config = YEAR_LEVEL_CONFIG[yearLevel];
				stream.markdown(`## ${config.emoji} Jaar Level Ingesteld!\n\n`);
				stream.markdown(`**${config.name}**\n\n`);
				stream.markdown(`${config.description}\n\n`);
				stream.markdown(`Focus gebieden:\n`);
				config.focusAreas.forEach(area => {
					stream.markdown(`- ${area}\n`);
				});
				stream.markdown(`\nJouw difficulty multiplier: **${(config.multiplier * 100).toFixed(0)}%**\n`);
				stream.markdown(`\nDit past de oefeningen, uitlegingen en feedback aan je niveau aan!\n`);

				updateProgress('setlevel');
				// Broadcast the updated user profile so dashboard updates
				broadcastSSEUpdate({
					userProfile: userProfile,
					type: 'profileUpdate'
				});
				return { metadata: { command: 'setlevel' } };
			},

			help: async () => {
				stream.markdown(`## 📖 Code Tutor Commando's\n\n`);
				stream.markdown(`**📚 Leren:**\n`);
				stream.markdown(`- \`/explain\` - Concepten uitleggen\n`);
				stream.markdown(`- \`/exercise\` - Oefeningen genereren\n`);
				stream.markdown(`- \`/learn\` - Learning paths\n`);
				stream.markdown(`- \`/concept\` - Diep duiken in concepten\n`);
				stream.markdown(`- \`/add-slide\` - Code toevoegen aan slideshow\n\n`);

				stream.markdown(`**🔧 Development:\n`);
				stream.markdown(`- \`/debug\` - Debug hulp\n`);
				stream.markdown(`- \`/review\` - Code review\n`);
				stream.markdown(`- \`/refactor\` - Code verbeteren\n`);
				stream.markdown(`- \`/feedback\` - Progressieve feedback\n\n`);

				stream.markdown(`**📊 Voortgang:**\n`);
				stream.markdown(`- \`/progress\` - Voortgang bekijken\n`);
				stream.markdown(`- \`/dashboard\` - Visueel dashboard\n`);
				stream.markdown(`- \`/setlevel\` - Jaar level instellen (1-4)\n\n`);

				stream.markdown(`**📖 Resources:**\n`);
				stream.markdown(`- \`/resources\` - Resource library\n`);
				stream.markdown(`- \`/quiz\` - Quiz jezelf\n\n`);

				const userProfile = context.globalState.get<UserProfile>('userProfile');
				if (userProfile) {
					const config = YEAR_LEVEL_CONFIG[userProfile.yearLevel];
					stream.markdown(`**Jouw profiel:** ${config.emoji} ${config.name}\n`);
				} else {
					stream.markdown(`💡 Tip: Zet je jaar level met \`/setlevel 1\` (of 2, 3, 4) voor beter aangepaste hulp!\n`);
				}

				return { metadata: { command: 'help' } };
			},

			'add-slide': async () => {
				const editor = vscode.window.activeTextEditor;
				if (!editor) {
					stream.markdown('❌ **Geen editor actief**\\n\\nOpen een bestand en selecteer code om een slide toe te voegen.');
					return { metadata: { command: 'add-slide' } };
				}

				const selectedText = editor.document.getText(editor.selection);
				if (!selectedText.trim()) {
					stream.markdown('❌ **Geen code geselecteerd**\\n\\nSelecteer eerst code in de editor om een slide toe te voegen.');
					return { metadata: { command: 'add-slide' } };
				}

				try {
					// Get language from file extension
					const language = editor.document.languageId;

					// Create slide with AI-generated explanation
					stream.markdown('🎯 **Code geselecteerd voor slideshow!**\\n\\n');
					stream.markdown('📝 Genereer uitleg...');

					// Generate explanation for the code
					const explainPrompt = `Je bent een programmeertutor. Geef een korte, duidelijke uitleg (50-80 woorden) voor deze code voor eerstejaars studenten:\\n\\n\\\`\\\`\\\`${language}\\n${selectedText}\\n\\\`\\\`\\\`\\n\\nFocus op: Wat doet deze code? Welk concept wordt gedemonstreerd? Waarom is dit nuttig?\\n\\nAntwoord alleen met de uitleg, geen extra tekst.`;

					const messages = [vscode.LanguageModelChatMessage.User(explainPrompt)];
					let explanation = '';

					for await (const fragment of (await model.sendRequest(messages, {}, token)).text) {
						explanation += fragment;
					}

					// Create slide
					const slide = {
						id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						title: `${language.toUpperCase()} Code Snippet`,
						concept: language,
						code: selectedText,
						language,
						explanation: explanation.trim(),
						difficulty: 'beginner' as const,
						category: 'Code Examples',
						created: Date.now(),
						tags: [language, 'chat-generated', 'slideshow']
					};

					// Send to API server
					try {
						const response = await fetch(`http://localhost:${PROMPT_SERVER_PORT}/api/slides`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify(slide)
						});

						if (response.ok) {
							stream.markdown('\\n\\n✅ **Slide toegevoegd!**\\n\\n');
							stream.markdown(`📚 **Uitleg:** ${explanation.trim()}\\n\\n`);
							stream.markdown('💡 Bekijk je slides in het dashboard via `/dashboard`');

							updateProgress('add-slide');
						} else {
							const errorText = await response.text();
							throw new Error(`Server antwoordde met status: ${response.status}: ${errorText}`);
						}
					} catch (fetchError) {
						console.error('Error adding slide:', fetchError);
						stream.markdown(`\\n\\n❌ **Fout bij toevoegen slide**\\n\\nZorg ervoor dat de prompt server draait. Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
					}
				} catch (error) {
					console.error('Error adding slide:', error);
					stream.markdown('❌ **Fout bij toevoegen slide**\\n\\nZorg ervoor dat de prompt server draait (`node prompt-server.js`).');
				}

				return { metadata: { command: 'add-slide' } };
			},

			feedback: async () => {
				const ctx = getCodeContext();
				if (!ctx) {
					stream.markdown(`Selecteer code in je editor om feedback te krijgen.\n\nGebruik: Selecteer je code, typ \`@tutor /feedback\` en beschrijf je probleem.`);
					updateProgress('feedback');
					return { metadata: { command: 'feedback' } };
				}

				const feedbackResponse = await generateProgressiveFeedback(
					request.prompt,
					ctx.code.replace(/^.*?\`\`\`\w+\n/, '').replace(/\`\`\`$/, ''),
					ctx.language,
					model,
					1,
					undefined,
					token
				);

				stream.markdown(feedbackResponse);
				updateProgress('feedback');
				return { metadata: { command: 'feedback' } };
			},

			dashboard: async () => {
				vscode.commands.executeCommand('code-tutor.openDashboard');
				stream.markdown(`## 🎓 Dashboard\n\nHet dashboard wordt geopend in een nieuw tabblad!\n\nJe kunt het dashboard ook altijd openen via het Command Palette: \`Code Tutor: Open Dashboard\``);
				return { metadata: { command: 'dashboard' } };
			},

			'assignment-feedback': async () => {
				const studentId = getOrCreateStudentId();
				const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
				const studentAssignments = assignmentProgress[studentId] || {};

				if (Object.keys(studentAssignments).length === 0) {
					stream.markdown(`## 📋 Assignment Feedback\n\n`);
					stream.markdown(`> 💡 **Geen opdrachten gevonden**\n>\n`);
					stream.markdown(`> Je hebt nog geen opdrachten gestart. Ga naar het dashboard om te beginnen!\n\n`);
					stream.markdown(`---\n\n`);
					stream.markdown(`### 🚀 Aan de Slag\n\n`);
					stream.markdown(`1. Open het **Dashboard** via \`@tutor /dashboard\`\n`);
					stream.markdown(`2. Kies een opdracht die bij je niveau past\n`);
					stream.markdown(`3. Klik op **Start** om te beginnen\n\n`);
					stream.markdown(`*Succes met je eerste opdracht!* 🎯\n`);
					return { metadata: { command: 'assignment-feedback' } };
				}

				// Calculate statistics
				const totalAssignments = Object.keys(studentAssignments).length;
				const completedCount = Object.values(studentAssignments).filter((p: any) => p.status === 'completed' || p.status === 'graded').length;
				const gradedCount = Object.values(studentAssignments).filter((p: any) => p.status === 'graded').length;
				const inProgressCount = Object.values(studentAssignments).filter((p: any) => p.status === 'in-progress').length;
				const completionPercent = Math.round((completedCount / totalAssignments) * 100);
				const gradedPercent = Math.round((gradedCount / totalAssignments) * 100);

				// Create visual progress bar
				const progressBarLength = 10;
				const filledBlocks = Math.round((completionPercent / 100) * progressBarLength);
				const emptyBlocks = progressBarLength - filledBlocks;
				const progressBar = '🟩'.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);

				// Show feedback about the most recent action if available (from globalState or memory)
				const storedAction = context.globalState.get<{ action: string; assignmentId: string; timestamp: string }>('lastAssignmentAction');
				const currentAction = lastAssignmentAction || storedAction;

				if (currentAction) {
					console.log('[DEBUG] Showing feedback for action:', currentAction.action);

					const actionConfig: Record<string, { emoji: string; title: string; message: string; tip: string }> = {
						'start': {
							emoji: '🚀',
							title: 'Je bent begonnen!',
							message: 'Goed gedaan dat je aan de slag bent gegaan! Dit is de belangrijkste stap.',
							tip: 'Tip: Lees de opdracht goed door en verdeel het werk in kleine stappen.'
						},
						'submit': {
							emoji: '📤',
							title: 'Ingediend!',
							message: 'Geweldig dat je je opdracht hebt ingediend! Je werk wordt nu bekeken.',
							tip: 'Tip: Gebruik de wachttijd om je code nog eens te reviewen.'
						},
						'complete': {
							emoji: '🎉',
							title: 'Voltooid!',
							message: 'Fantastisch! Je hebt deze opdracht afgerond! Dit is echte vooruitgang.',
							tip: 'Tip: Vraag om een beoordeling via de Grade knop voor feedback.'
						},
						'grade': {
							emoji: '🏆',
							title: 'Beoordeeld!',
							message: 'Jouw opdracht is beoordeeld! Controleer de feedback hieronder.',
							tip: 'Tip: Pas de geleerde lessen toe op je volgende opdracht.'
						}
					};

					const config = actionConfig[currentAction.action];
					if (config) {
						stream.markdown(`## ${config.emoji} ${config.title}\n\n`);
						stream.markdown(`> **${config.message}**\n>\n`);
						stream.markdown(`> 💡 *${config.tip}*\n\n`);
						stream.markdown(`---\n\n`);
					}

					// Clear the stored action after showing it
					context.globalState.update('lastAssignmentAction', undefined);
					shouldAutoShowFeedback = false;
				}

				// Statistics Overview
				stream.markdown(`## 📊 Jouw Statistieken\n\n`);
				stream.markdown(`| Categorie | Aantal | Status |\n`);
				stream.markdown(`|-----------|--------|--------|\n`);
				stream.markdown(`| 📝 Totaal Opdrachten | **${totalAssignments}** | - |\n`);
				stream.markdown(`| ⏳ In Progress | **${inProgressCount}** | ${inProgressCount > 0 ? '🔄 Actief' : '✨ Geen'} |\n`);
				stream.markdown(`| ✅ Voltooid | **${completedCount}** | ${completedCount > 0 ? '👍 Goed bezig!' : '🎯 Begin nu'} |\n`);
				stream.markdown(`| 🏆 Beoordeeld | **${gradedCount}** | ${gradedCount > 0 ? '⭐ Excellent!' : '📋 Vraag feedback'} |\n\n`);

				// Visual Progress
				stream.markdown(`### 📈 Voortgang\n\n`);
				stream.markdown(`**Voltooiing:** ${progressBar} **${completionPercent}%**\n\n`);

				// Motivational message based on progress
				if (completionPercent === 100) {
					stream.markdown(`> 🌟 **PERFECTIE!** Je hebt alle opdrachten voltooid! Je bent een ster! 🌟\n\n`);
				} else if (completionPercent >= 75) {
					stream.markdown(`> 🔥 **Bijna daar!** Nog even doorzetten, je bent er bijna!\n\n`);
				} else if (completionPercent >= 50) {
					stream.markdown(`> 💪 **Halverwege!** Geweldig tempo, blijf zo doorgaan!\n\n`);
				} else if (completionPercent >= 25) {
					stream.markdown(`> 🌱 **Goede start!** Je bent op de goede weg!\n\n`);
				} else {
					stream.markdown(`> 🚀 **Begin je reis!** Elke opdracht brengt je dichter bij meesterschap!\n\n`);
				}

				stream.markdown(`---\n\n`);
				stream.markdown(`## 📋 Opdrachten Overzicht\n\n`);

				// Get assignment data to show titles with rich formatting
				try {
					const assignmentsDir = path.join(context.extensionPath, 'assignments');
					const assignmentEntries = Object.entries(studentAssignments);

					for (const [assignmentId, progress] of assignmentEntries) {
						const filePath = path.join(assignmentsDir, assignmentId + '.md');
						if (fs.existsSync(filePath)) {
							const content = fs.readFileSync(filePath, 'utf8');
							const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
							let title = assignmentId;
							let difficulty = 'intermediate';
							let topic = '';

							if (yamlMatch) {
								const titleMatch = yamlMatch[1].match(/title:\s*(.+)/);
								const diffMatch = yamlMatch[1].match(/difficulty:\s*(.+)/);
								const topicMatch = yamlMatch[1].match(/topic:\s*(.+)/);
								if (titleMatch) title = titleMatch[1].trim();
								if (diffMatch) difficulty = diffMatch[1].trim();
								if (topicMatch) topic = topicMatch[1].trim();
							}

							const status = (progress as any).status || 'unknown';
							const statusConfig: Record<string, { emoji: string; label: string; color: string }> = {
								'in-progress': { emoji: '⏳', label: 'In Progress', color: '🟡' },
								'completed': { emoji: '✅', label: 'Voltooid', color: '🟢' },
								'graded': { emoji: '🏆', label: 'Beoordeeld', color: '🟣' },
								'unknown': { emoji: '📋', label: 'Onbekend', color: '⚪' }
							};

							const difficultyConfig: Record<string, { emoji: string; label: string }> = {
								'beginner': { emoji: '🌱', label: 'Beginner' },
								'intermediate': { emoji: '🌿', label: 'Intermediate' },
								'advanced': { emoji: '🌳', label: 'Advanced' }
							};

							const sConfig = statusConfig[status] || statusConfig['unknown'];
							const dConfig = difficultyConfig[difficulty] || difficultyConfig['intermediate'];

							// Rich assignment card
							stream.markdown(`### ${sConfig.emoji} ${title}\n\n`);
							stream.markdown(`| Info | Details |\n`);
							stream.markdown(`|------|--------|\n`);
							stream.markdown(`| Status | ${sConfig.color} **${sConfig.label}** |\n`);
							stream.markdown(`| Difficulty | ${dConfig.emoji} ${dConfig.label} |\n`);
							if (topic) stream.markdown(`| Topic | 📚 ${topic} |\n`);

							// Time information
							const startedAt = (progress as any).startedAt;
							const completedAt = (progress as any).completedAt;
							const gradedAt = (progress as any).gradedAt;

							if (startedAt) {
								const startDate = new Date(startedAt);
								stream.markdown(`| Gestart | 📅 ${startDate.toLocaleDateString('nl-NL')} om ${startDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} |\n`);
							}
							if (completedAt) {
								const completeDate = new Date(completedAt);
								stream.markdown(`| Voltooid | 📅 ${completeDate.toLocaleDateString('nl-NL')} om ${completeDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} |\n`);

								// Calculate time spent
								if (startedAt) {
									const timeSpent = new Date(completedAt).getTime() - new Date(startedAt).getTime();
									const hours = Math.floor(timeSpent / (1000 * 60 * 60));
									const minutes = Math.floor((timeSpent % (1000 * 60 * 60)) / (1000 * 60));
									if (hours > 0) {
										stream.markdown(`| Tijd besteed | ⏱️ ${hours}u ${minutes}m |\n`);
									} else {
										stream.markdown(`| Tijd besteed | ⏱️ ${minutes} minuten |\n`);
									}
								}
							}
							if (gradedAt) {
								const gradeDate = new Date(gradedAt);
								stream.markdown(`| Beoordeeld | 📅 ${gradeDate.toLocaleDateString('nl-NL')} om ${gradeDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} |\n`);
							}

							stream.markdown(`\n`);

							// Show highlight/notes if present
							const highlight = (progress as any).highlight;
							if (highlight && highlight.trim().length > 0) {
								stream.markdown(`#### 💡 Jouw Highlight / Vraag\n\n`);
								stream.markdown(`> 📝 **Je hebt het volgende gemarkeerd:**\n\n`);

								// Check if it looks like code (contains common code patterns)
								const looksLikeCode = /[{};()=]|function|class|const|let|var|import|export|def |if |for |while /.test(highlight);

								if (looksLikeCode) {
									// Detect language from content
									let lang = 'text';
									if (/\b(function|const|let|var|=>|async|await)\b/.test(highlight)) lang = 'javascript';
									else if (/\bdef\s+\w+|import\s+\w+|print\(/.test(highlight)) lang = 'python';
									else if (/\b(public|private|class|void|int|String)\b/.test(highlight)) lang = 'java';
									else if (/\b(using|namespace|Console\.)\b/.test(highlight)) lang = 'csharp';

									stream.markdown(`\`\`\`${lang}\n${highlight}\n\`\`\`\n\n`);
								} else {
									stream.markdown(`> ${highlight.split('\n').join('\n> ')}\n\n`);
								}

								// Provide contextual help based on the highlight
								stream.markdown(`💬 **Tutor Tip:** Ik zie dat je iets hebt gemarkeerd! Wil je hier specifieke feedback over?\n`);
								stream.markdown(`- Typ \`@tutor /explain\` + selecteer de code voor uitleg\n`);
								stream.markdown(`- Typ \`@tutor /debug\` als je een fout hebt\n`);
								stream.markdown(`- Typ \`@tutor /review\` voor code review\n\n`);
							}

							// Show grade button suggestion if completed but not graded
							if (status === 'completed') {
								stream.markdown(`> 💡 *Klaar voor beoordeling! Klik op **Grade** in het dashboard voor feedback.*\n\n`);
							}

							stream.markdown(`---\n\n`);
						}
					}
				} catch (error) {
					console.error('Error loading assignment feedback:', error);
				}

				// Footer with tips
				stream.markdown(`### 💡 Tips voor Succes\n\n`);
				stream.markdown(`- 📖 Lees de opdracht **twee keer** voor je begint\n`);
				stream.markdown(`- 🧪 **Test je code** regelmatig tijdens het schrijven\n`);
				stream.markdown(`- 🤔 **Vraag om hulp** via \`@tutor /debug\` als je vastloopt\n`);
				stream.markdown(`- 📝 **Vraag feedback** met \`@tutor /review\` voor je code indient\n\n`);
				stream.markdown(`*Blijf leren, blijf groeien!* 🌟\n`);

				updateProgress('exercise');
				return { metadata: { command: 'assignment-feedback' } };
			},

			progress: async () => {
				const studentId = getOrCreateStudentId();
				const userProfile = context.globalState.get<UserProfile>('userProfile') || {
					studentId,
					studentName: `Student ${studentId.slice(0, 8)}`,
					yearLevel: 2 as const,
					difficultyMultiplier: 1,
					lastUpdated: new Date().toISOString()
				};
				const allStudentsData = loadStudentData();
				const progress = allStudentsData[studentId] || {};
				const total = Object.values(progress).reduce((a, b) => a + b, 0);
				stream.markdown(`## 📊 Jouw Voortgang\n\n`);
				stream.markdown(`**Totaal interacties:** ${total}\n\n`);
				for (const [cmd, count] of Object.entries(progress)) {
					stream.markdown(`- **${cmd}**: ${count} keer gebruikt\n`);
				}
				if (total >= 50) {
					stream.markdown(`\n🏆 **Achievement unlocked:** Code Meester!\n`);
				} else if (total >= 25) {
					stream.markdown(`\n🥈 **Achievement unlocked:** Gevorderde Leerling!\n`);
				} else if (total >= 10) {
					stream.markdown(`\n🥉 **Achievement unlocked:** Actieve Student!\n`);
				}

				if (userProfile) {
					const config = YEAR_LEVEL_CONFIG[userProfile.yearLevel];
					stream.markdown(`\n---\n\n**📊 Jouw Profiel:**\n`);
					stream.markdown(`Jaar level: ${config.emoji} ${config.name}\n`);
					stream.markdown(`Difficulty: ${(config.multiplier * 100).toFixed(0)}%\n`);
				}

				stream.markdown(`\n💡 *Tip: Gebruik \`/dashboard\` voor een visueel overzicht!*`);
				return { metadata: { command: 'progress' } };
			},

			learn: async () => {
				const pathProgress = context.globalState.get<Record<string, Record<string, boolean>>>('learningPathProgress', {});
				stream.markdown(`## 📚 Learning Paths\n\n`);
				stream.markdown(`Kies een leerpad om te beginnen met gestructureerd leren!\n\n`);

				for (const path of Object.values(LEARNING_PATHS)) {
					const prog = pathProgress[path.id] || {};
					const completedModules = path.modules.filter(m => prog[m.id]).length;
					const percent = Math.round((completedModules / path.modules.length) * 100);
					const progressBar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));

					stream.markdown(`### ${path.icon} ${path.name}\n`);
					stream.markdown(`*${path.description}*\n\n`);
					stream.markdown(`- **Niveau:** ${path.difficulty}\n`);
					stream.markdown(`- **Geschatte tijd:** ${path.estimatedHours} uur\n`);
					stream.markdown(`- **Voortgang:** [${progressBar}] ${percent}% (${completedModules}/${path.modules.length} modules)\n\n`);

					stream.markdown(`**Modules:**\n`);
					path.modules.forEach((m, i) => {
						const done = prog[m.id] ? '✅' : '⬜';
						stream.markdown(`${i + 1}. ${done} ${m.name} - ${m.exercises} oefeningen\n`);
					});
					stream.markdown(`\n---\n\n`);
				}

				stream.markdown(`💡 *Vraag om een specifiek topic te leren, bijv: "Leg uit hoe for loops werken in Python"*`);
				return { metadata: { command: 'learn' } };
			},

			exercise: async () => {
				const userQuery = request.prompt.toLowerCase();

				// Check if user is asking for a specific assignment
				const isGenerating = userQuery.includes('geef') || userQuery.includes('maak') ||
					userQuery.includes('give') || userQuery.includes('create') ||
					userQuery.includes('generate') || userQuery.includes('oefening') ||
					userQuery.includes('assignment') || userQuery.includes('exercise');

				if (isGenerating && userQuery.length > 5) {
					// Generate a new assignment based on the user's request
					stream.markdown(`## 🎯 Oefening aan het genereren...\n\n`);
					stream.markdown(`⏳ Ik ben een oefening voor je aan het maken...\n\n`);

					try {
						const userProfile = context.globalState.get<UserProfile>('userProfile');
						const yearLevel = userProfile?.yearLevel || 2;
						const difficultyMap = { 1: 'beginner', 2: 'intermediate', 3: 'advanced', 4: 'advanced' };
						const difficulty = difficultyMap[yearLevel];

						// Generate assignment using AI
						const assignmentPrompt = `Je bent een expert in het maken van programmeer oefeningen. 
					
Maak een compleet assignment in Markdown formaat op basis van dit verzoek: "${request.prompt}"

BELANGRIJK: Antwoord ALLEEN met het Markdown content. Geen extra tekst.

Format (gebruik exact dit format):
---
title: [Duidelijke titel]
difficulty: ${difficulty}
topic: [Topic/onderwerp]
dueDate: [YYYY-MM-DD, bijv 2026-01-25]
estimatedTime: [aantal minuten, bijv 45]
---

## Objective
[Doel van de oefening]

## Learning Outcomes
- [Leeruitkomst 1]
- [Leeruitkomst 2]
- [Leeruitkomst 3]

## Tasks
### Task 1: [Taaktitel]
[Taakbeschrijving]

### Task 2: [Taaktitel]
[Taakbeschrijving]

## Hints & Tips
- [Hint 1]
- [Hint 2]

## Resources
- [Resource 1](url)
- [Resource 2](url)

## Submission
[Submissie instructies]`;

						const messages = [vscode.LanguageModelChatMessage.User(assignmentPrompt)];
						let assignmentContent = '';

						for await (const fragment of (await model.sendRequest(messages, {}, token)).text) {
							assignmentContent += fragment;
						}

						// Extract metadata and generate filename
						const metadataMatch = assignmentContent.match(/^---\n([\s\S]*?)\n---/);
						let title = 'Custom Assignment';
						let difficulty_val = 'beginner';

						if (metadataMatch) {
							const metadata = metadataMatch[1];
							const titleMatch = metadata.match(/title:\s*(.+)/);
							const diffMatch = metadata.match(/difficulty:\s*(.+)/);
							if (titleMatch) title = titleMatch[1].trim();
							if (diffMatch) difficulty_val = diffMatch[1].trim();
						}

						// Generate filename with timestamp
						const now = new Date();
						const dateStr = now.toISOString().split('T')[0];
						const filename = `${dateStr}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
						const filepath = path.join(context.extensionPath, 'assignments', filename);

						// Save the assignment file
						fs.mkdirSync(path.dirname(filepath), { recursive: true });
						fs.writeFileSync(filepath, assignmentContent);

						stream.markdown(`## 🎯 Oefening Gegenereerd!\n\n`);
						stream.markdown(`✅ Jouw custom oefening is aangemaakt en verschijnt nu in het dashboard!\n\n`);
						stream.markdown(`📋 **${title}**\n`);
						stream.markdown(`- 📊 Niveau: ${difficulty_val}\n`);
						stream.markdown(`- 📂 Bestand: \`${filename}\`\n\n`);

						// Show the generated assignment content
						stream.markdown(`---\n\n`);
						stream.markdown(assignmentContent);
						stream.markdown(`\n\n---\n\n`);

						stream.markdown(`Ga naar het dashboard om de volledige oefening te bekijken en in te dienen!\n`);

						updateProgress('exercise');
						broadcastSSEUpdate({ type: 'assignmentGenerated', filename, title });
						return { metadata: { command: 'exercise' } };
					} catch (error) {
						console.error('Error generating assignment:', error);
						stream.markdown(`❌ Kon de oefening niet genereren. Probeer het opnieuw.\n`);
						updateProgress('exercise');
						return { metadata: { command: 'exercise' } };
					}
				} else {
					// List existing assignments
					try {
						const response = await fetch('http://localhost:51987/api/assignments');
						const assignments = await response.json();

						if (!assignments || assignments.length === 0) {
							stream.markdown(`## 🎯 Oefeningen\n\n`);
							stream.markdown(`Er zijn momenteel geen oefeningen beschikbaar.\n\n`);
							stream.markdown(`💡 *Tip: Vraag me om een oefening, bijv: "Geef me een oefening over loops"*\n`);
							updateProgress('exercise');
							return { metadata: { command: 'exercise' } };
						}

						const userProfile = context.globalState.get<UserProfile>('userProfile');
						const yearLevel = userProfile?.yearLevel || 2;
						const studentId = getOrCreateStudentId();
						const assignmentProgress = context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
						const studentAssignments = assignmentProgress[studentId] || {};

						stream.markdown(`## 🎯 Beschikbare Oefeningen\n\n`);

						assignments.forEach((assignment: any) => {
							const difficultyEmoji = assignment.difficulty === 'beginner' ? '🌱' :
								assignment.difficulty === 'intermediate' ? '📈' : '⭐';
							const dueDate = assignment.dueDate ? ` • 📅 ${assignment.dueDate}` : '';
							const time = assignment.estimatedTime ? ` • ⏱️ ${assignment.estimatedTime} min` : '';

							// Check if assignment is completed
							const status = studentAssignments[assignment.id]?.status;
							const completionIcon = status === 'completed' ? ' ✅' : status === 'graded' ? ' 🏆' : '';

							stream.markdown(`### ${difficultyEmoji} ${assignment.title}${completionIcon}\n`);
							stream.markdown(`**${assignment.topic}**${time}${dueDate}\n\n`);
						});

						stream.markdown(`\n💡 *Vraag om een specifieke oefening, bijv: "Geef me een oefening over variabelen"*\n`);
						updateProgress('exercise');
						return { metadata: { command: 'exercise' } };
					} catch (error) {
						stream.markdown(`## 🎯 Oefeningen\n\n`);
						stream.markdown(`Kon oefeningen niet laden. Zorg ervoor dat de server draait.\n\n`);
						stream.markdown(`Probeer: \`npm run watch\` in de terminal.\n`);
						updateProgress('exercise');
						return { metadata: { command: 'exercise' } };
					}
				}
			},

			resources: async () => {
				// Check if user asked for a specific category
				const userQuery = request.prompt.toLowerCase();
				const categories = Object.entries(RESOURCE_LIBRARY);

				// Try to match a category or show compact overview
				const matchedCategory = categories.find(([key, data]) =>
					userQuery.includes(key) ||
					userQuery.includes(data.name.toLowerCase()) ||
					data.resources.some(r => userQuery.includes(r.tags.join(' ').toLowerCase()))
				);

				if (matchedCategory) {
					// Show detailed view for specific category
					const [catKey, catData] = matchedCategory;
					stream.markdown(`## ${catData.icon} ${catData.name}\n\n`);

					catData.resources.forEach((resource) => {
						stream.markdown(`**[${resource.title}](${resource.url})** • ${resource.type} • ${resource.difficulty}\n`);
						stream.markdown(`${resource.description}\n\n`);
					});
				} else {
					// Show compact category overview
					stream.markdown(`## 📖 Resource Library\n\n`);
					stream.markdown(`Kies een categorie:\n\n`);

					categories.forEach(([key, data]) => {
						const resourceCount = data.resources.length;
						const typeSummary = [...new Set(data.resources.map(r => r.type))].join(', ');
						stream.markdown(`**${data.icon} ${data.name}** (${resourceCount})\n`);
						stream.markdown(`→ ${typeSummary}\n\n`);
					});

					stream.markdown(`Vraag bijvoorbeeld: "Resources voor Python" of "Debugging tools"\n`);
				}

				updateProgress('resources');
				return { metadata: { command: 'resources' } };
			}
		};

		// Execute special commands if applicable
		if (request.command && specialCommands[request.command as keyof typeof specialCommands]) {
			return await specialCommands[request.command as keyof typeof specialCommands]();
		}

		// Get user profile and adapt prompts accordingly
		const userProfile = context.globalState.get<UserProfile>('userProfile');
		const yearLevel = userProfile?.yearLevel || 2;

		// Create year-level aware base prompt
		const basePrompts: Record<number, string> = {
			1: 'Je bent een hulpzame programming coach voor eerstejaars studenten. Zorg dat je: 1) ALLES uitlegt - geen aannames over voorkennis, 2) Kleine stappen zet, 3) Veel voorbeelden geeft, 4) Moeilijke concepten vergelijkt met dagelijks leven, 5) Veel aanmoediging geeft. GEEN CODE TENZIJ HINTS GEVRAAGD. Het is oke als dingen simpel lijken - fundamentals zijn belangrijk! Spreek Nederlands.',
			2: 'Je bent een programming coach voor 2nd year studenten. Ze hebben basics, dus focus op: 1) Praktische projecten, 2) Best practices, 3) Code kwaliteit, 4) Kleine design patterns. Leg nog steeds uit maar aannames kunnen hoger. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			3: 'Je bent een programming mentor voor 3rd year studenten. Ze kunnen zelfstandig code schrijven. Focus op: 1) Advanced patterns, 2) System design, 3) Performance optimization, 4) Best practices op scale. Kan technische termen gebruiken. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			4: 'Je bent een expert programming mentor voor 4th year studenten / professionals. Focus op: 1) Research topics, 2) Cutting-edge tech, 3) Innovation, 4) Specialized domains. Kan aannames doen over diep kennis. GEEN CODE TENZIJ HINTS. Spreek Nederlands.'
		};
		const prompt = basePrompts[yearLevel] || basePrompts[2];

		// Track progress for commands
		if (request.command && !['dashboard', 'progress', 'learn', 'setlevel', 'help'].includes(request.command)) {
			updateProgress(request.command);
		} else if (!request.command) {
			updateProgress('general');
		}

		// Get code context if relevant
		const contextData = getCodeContext();
		const codeContext = contextData?.code || '';

		// initialize the messages array with the prompt
		const messages = [vscode.LanguageModelChatMessage.User(prompt)];

		// get all the previous participant messages
		const previousMessages = chatContext.history.filter(
			h => h instanceof vscode.ChatResponseTurn
		);

		// add the previous messages to the messages array
		previousMessages.forEach(m => {
			let fullMessage = '';
			m.response.forEach(r => {
				const mdPart = r as vscode.ChatResponseMarkdownPart;
				fullMessage += mdPart.value.value;
			});
			messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
		});

		// add in the user's message with code context
		const userMessage = request.prompt + codeContext;
		messages.push(vscode.LanguageModelChatMessage.User(userMessage));

		// send the request with the validated model, with a safety fallback if "auto" slipped through
		let chatResponse: vscode.LanguageModelChatResponse | undefined;
		const trySend = async (m: vscode.LanguageModelChat) => m.sendRequest(messages, {}, token);
		try {
			chatResponse = await trySend(model);
		} catch (err: any) {
			const msg = String(err?.message || '').toLowerCase();
			const isAutoIssue = msg.includes('endpoint not found') || msg.includes('model auto');
			const isUnsupported = msg.includes('unsupported') || (err?.code && String(err.code).toLowerCase().includes('unsupported'));
			if (isAutoIssue || isUnsupported) {
				// rotate through other concrete models and try again
				const list = await listConcreteModels();
				const currentIndex = list.findIndex(m => m.id === model.id);
				for (let i = 0; i < list.length; i++) {
					const candidate = list[i];
					if (i === currentIndex) { continue; }
					try {
						stream.markdown(`_(Andere model geprobeerd: ${candidate.name})_`);
						chatResponse = await trySend(candidate);
						break;
					} catch {
						continue;
					}
				}
				if (!chatResponse) {
					stream.markdown('❌ Geen geschikt AI-model werkte. Kies handmatig een ander model in de modelkeuze en probeer opnieuw.');
					return { metadata: { command: request.command || 'error' } };
				}
			} else {
				throw err;
			}
		}

		if (!chatResponse) {
			stream.markdown('❌ Kan geen antwoord genereren. Probeer een ander model of vraag het opnieuw.');
			return { metadata: { command: request.command || 'error' } };
		}

		// stream the response
		for await (const fragment of chatResponse.text) {
			stream.markdown(fragment);
		}

		return { metadata: { command: request.command } };
	};

	// Track assignment messages and automatically send feedback to chat
	// Note: lastAssignmentAction is declared at the top of activate()
	let shouldAutoShowFeedback = false;

	// Store reference to chat participant for sending messages
	let chatParticipantRef: vscode.ChatParticipant | null = null;

	// SSE listener for assignment updates - automatically show feedback in chat
	const originalBroadcast = broadcastSSEUpdate;
	function broadcastSSEUpdateWithNotification(data: any) {
		originalBroadcast(data);

		// Automatically show feedback for assignment actions
		if (data.type === 'assignmentMessage' || data.type === 'assignmentUpdate') {
			// Store the action for chat feedback
			lastAssignmentAction = {
				action: data.action,
				assignmentId: data.assignmentId,
				timestamp: new Date().toISOString()
			};

			// Create notification message based on action
			const actionMessages: Record<string, string> = {
				'start': '▶️ Assignment Started!',
				'complete': '✅ Assignment Completed!',
				'grade': '🏆 Assignment Graded!'
			};

			const message = actionMessages[data.action] || '📝 Assignment Updated!';

			// Show brief notification
			vscode.window.showInformationMessage(message);

			// Only open chat automatically for 'complete' and 'grade' actions
			if (data.action === 'complete' || data.action === 'grade') {
				// Automatically open chat panel with feedback
				setTimeout(async () => {
					try {
						// Open the chat panel with pre-filled message for @tutor
						await vscode.commands.executeCommand('workbench.action.chat.open', {
							query: '@tutor /assignment-feedback'
						});
					} catch (e) {
						console.log('[Chat] Failed to open chat with query, trying alternative:', e);
						// Fallback: just open chat panel
						try {
							await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
						} catch (e2) {
							console.log('[Chat] Fallback also failed:', e2);
						}
					}
				}, 300);
			}
		}
	}

	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection(() => {
			// This is kept for other uses but assignment notifications now use broadcastSSEUpdate
		})
	);

	// register the chat participant so @tutor requests are handled
	const chatParticipant = vscode.chat.createChatParticipant('chat-tutorial.code-tutor', handler);
	chatParticipantRef = chatParticipant;

	// Register follow-up provider
	chatParticipant.followupProvider = {
		provideFollowups(result: vscode.ChatResult, _context: vscode.ChatContext, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.ChatFollowup[]> {
			const command = (result.metadata as { command?: string })?.command;

			switch (command) {
				case 'exercise':
					return [
						{ prompt: 'Geef me een moeilijkere oefening', label: '🎯 Moeilijker' },
						{ prompt: 'Ik snap het niet, kun je het uitleggen?', label: '❓ Uitleg' },
						{ prompt: 'Geef me een hint', label: '💡 Hint' }
					];
				case 'explain':
					return [
						{ prompt: 'Kun je dat simpeler uitleggen?', label: '🔍 Simpeler' },
						{ prompt: 'Geef me een voorbeeld', label: '📝 Voorbeeld' },
						{ prompt: 'Wat zijn veelgemaakte fouten hierbij?', label: '⚠️ Valkuilen' }
					];
				case 'debug':
					return [
						{ prompt: 'Hoe kan ik dit in de toekomst voorkomen?', label: '🛡️ Preventie' },
						{ prompt: 'Zijn er nog andere mogelijke bugs?', label: '🔍 Meer bugs' },
						{ prompt: 'Leg de oplossing stap voor stap uit', label: '📋 Stappen' }
					];
				case 'feedback':
					return [
						{ prompt: 'Ik snap het niet, geef me meer tips', label: '💡 Meer tips' },
						{ prompt: 'Laat me een compleet voorbeeld zien', label: '📝 Voorbeeld' },
						{ prompt: 'Hoe kan ik dit patroon in andere code toepassen?', label: '🔄 Patroon' }
					];
				case 'refactor':
					return [
						{ prompt: 'Laat me de verbeterde versie zien', label: '✨ Toon code' },
						{ prompt: 'Waarom is dit beter?', label: '❓ Waarom' },
						{ prompt: 'Zijn er nog meer verbeteringen mogelijk?', label: '🔄 Meer' }
					];
				case 'quiz':
					return [
						{ prompt: 'Volgende vraag', label: '➡️ Volgende' },
						{ prompt: 'Ik weet het niet, geef het antwoord', label: '🏳️ Antwoord' },
						{ prompt: 'Wat is mijn score?', label: '📊 Score' }
					];
				case 'review':
					return [
						{ prompt: 'Wat is het belangrijkste om te fixen?', label: '🔴 Prioriteit' },
						{ prompt: 'Hoe zou de ideale versie eruitzien?', label: '⭐ Ideaal' },
						{ prompt: 'Geef me security tips', label: '🔒 Security' }
					];
				case 'concept':
					return [
						{ prompt: 'Geef me een praktisch voorbeeld', label: '💻 Voorbeeld' },
						{ prompt: 'Hoe verhoudt dit zich tot andere concepten?', label: '🔗 Relaties' },
						{ prompt: 'Test mijn begrip met een vraag', label: '❓ Test me' }
					];
				case 'progress':
					return [
						{ prompt: 'Start een nieuwe oefening', label: '🎯 Oefening' },
						{ prompt: 'Bekijk mijn learning paths', label: '📚 Learning Paths', command: 'learn' }
					];
				case 'learn':
					return [
						{ prompt: 'Start met Python Basics', label: '🐍 Python' },
						{ prompt: 'Start met JavaScript', label: '🌐 JavaScript' },
						{ prompt: 'Leer over algoritmen', label: '🧮 Algoritmen' },
						{ prompt: 'Start Clean Code', label: '✨ Clean Code' }
					];
				case 'refactor':
					return [
						{ prompt: 'Laat me de verbeterde versie zien', label: '✨ Toon code' },
						{ prompt: 'Waarom is dit beter?', label: '❓ Waarom' },
						{ prompt: 'Zijn er nog meer verbeteringen mogelijk?', label: '🔄 Meer' }
					];
				case 'quiz':
					return [
						{ prompt: 'Volgende vraag', label: '➡️ Volgende' },
						{ prompt: 'Ik weet het niet, geef het antwoord', label: '🏳️ Antwoord' },
						{ prompt: 'Wat is mijn score?', label: '📊 Score' }
					];
				case 'review':
					return [
						{ prompt: 'Wat is het belangrijkste om te fixen?', label: '🔴 Prioriteit' },
						{ prompt: 'Hoe zou de ideale versie eruitzien?', label: '⭐ Ideaal' },
						{ prompt: 'Geef me security tips', label: '🔒 Security' }
					];
				case 'learn':
					return [
						{ prompt: 'Start met Python Basics', label: '🐍 Python' },
						{ prompt: 'Start met JavaScript', label: '🌐 JavaScript' },
						{ prompt: 'Leer over algoritmen', label: '🧮 Algoritmen' },
						{ prompt: 'Start Clean Code', label: '✨ Clean Code' }
					];
				default:
					return [
						{ prompt: 'Leg dit verder uit', label: '📖 Meer uitleg' },
						{ prompt: 'Geef me een oefening hierover', label: '🎯 Oefening', command: 'exercise' },
						{ prompt: 'Review mijn code', label: '👀 Review', command: 'review' }
					];
			}
		}
	};

	// Start Discord bot and Dashboard server automatically when extension activates
	const { spawn } = require('child_process');
	const botPath = path.join(context.extensionPath, 'discord-bot', 'bot.js');

	let botProcess: any = null;

	// ========== DISCORD BOT MANAGEMENT ==========
	const startDiscordBot = () => {
		if (botProcess) {
			console.log('Discord bot is already running');
			return;
		}

		try {
			// Spawn the bot process
			botProcess = spawn('node', [botPath], {
				cwd: path.join(context.extensionPath, 'discord-bot'),
				detached: true,
				stdio: ['ignore', 'pipe', 'pipe']
			});

			// Unref allows the process to run independently
			botProcess.unref();

			// Capture stderr to see what goes wrong
			botProcess.stderr?.on('data', (data: Buffer) => {
				console.error('Bot stderr:', data.toString());
			});

			// Handle process errors
			botProcess.on('error', (error: Error) => {
				botProcess = null;
				vscode.window.showErrorMessage(`Failed to start bot: ${error.message}`);
				console.error('Bot process error:', error);
			});

			console.log('Discord bot started successfully');
		} catch (error) {
			console.error('Error starting Discord bot:', error);
		}
	};

	const stopDiscordBot = () => {
		if (botProcess) {
			botProcess.kill();
			botProcess = null;
			console.log('Discord bot stopped');
			vscode.window.showInformationMessage('Discord bot stopped');
		}
	};

	// Start services automatically
	console.log('Initializing Code Tutor services...');
	startDiscordBot();

	// Start dashboard server (with integrated prompt server)
	console.log('Starting dashboard server with integrated prompt server...');
	startServer();
	console.log('Dashboard server startup initiated');

	context.subscriptions.push(chatParticipant);

}

// This method is called when your extension is deactivated
export function deactivate() {
	if (dashboardFeature) {
		dashboardFeature.close().catch(e => console.error('Error closing dashboard:', e));
		dashboardFeature = undefined;
	}
	if (server) {
		server.close();
		server = undefined;
	}
	sseManager = undefined;

	// Stop prompt server if running
	if (promptServer) {
		promptServer.kill();
		promptServer = undefined;
	}

	try {
		console.log('Code Tutor services deactivated');
	} catch (error) {
		console.error('Error during deactivation:', error);
	}
}
