import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import {spawn, ChildProcess} from 'child_process';

// Dependency Injection
import {ServiceContainer} from './di';

// Infrastructure
import {FileSystemStorage, VSCodeStorage, StudentDataService} from './infrastructure/storage';
import {SimpleHttpServer, SimpleSSEManager, initializeRouter, type RouteConfig} from './infrastructure/http';

// Features
import {DashboardFeature} from './features/dashboard';
import {AssignmentFeature} from './features/assignment';
import {LiveDemoFeature} from './features/livedemo';
import {SlideshowFeature} from './features/slideshow';
import {ChatParticipantFeature} from './features/chat-participant';
import {ProgressBroadcaster} from './features/shared/ProgressBroadcaster';
import {TeacherStatsService} from './features/shared/TeacherStatsService';

// Services
import {StudentService} from './core/services/StudentService';

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
export async function activate(context: vscode.ExtensionContext) {
	const activationStartMs = Date.now();
	const activationOutput = vscode.window.createOutputChannel('Code Tutor');
	context.subscriptions.push(activationOutput);
	const logActivation = (message: string) => {
		const elapsedMs = Date.now() - activationStartMs;
		const line = `[activation +${elapsedMs}ms] ${message}`;
		activationOutput.appendLine(line);
		console.log(line);
	};

	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Starting up Code Tutor",
		cancellable: false
	}, async (progress) => {
		try {
			const reportProgress = (message: string, increment: number) => {
				progress.report({ message, increment });
				logActivation(message);
			};

			// Use the console to output diagnostic information (console.log) and errors (console.error)
			// This line of code will only be executed once when your extension is activated
			console.log('Congratulations, your extension "code-tutor" is now active!');
			logActivation('Activation started');

			// Track last assignment action for chat feedback
			let lastAssignmentAction: { action: string; assignmentId: string; timestamp: string } | null = null;
			// Start the prompt server
			const startPromptServer = () => {
				// Auto-spawn the prompt server on activation
				try {
					if (promptServer) {
						console.log('Prompt server is already running');
						return;
					}

					const promptServerPath = path.join(context.extensionPath, 'prompt-server.js');
					promptServer = spawn('node', [promptServerPath], {
						cwd: context.extensionPath,
						detached: true,
						stdio: ['ignore', 'pipe', 'pipe']
					});

					promptServer.unref();

					promptServer.stderr?.on('data', (data: Buffer) => {
						console.error('[Prompt Server] stderr:', data.toString());
					});

					promptServer.on('error', (error: Error) => {
						promptServer = undefined;
						console.error('[Prompt Server] Failed to start:', error);
					});
				} catch (error) {
					console.log(error);
				}

				console.log('?? Prompt server should be running on port', PROMPT_SERVER_PORT);
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
				console.log('?? Checking if prompt server is running...');
				for (let i = 0; i < maxAttempts; i++) {
					if (await isPromptServerReady()) {
						console.log('? Prompt server is running on port', PROMPT_SERVER_PORT);
						return true;
					}
					await new Promise(resolve => setTimeout(resolve, 500));
				}
				console.warn('??  Prompt server is not responding on port', PROMPT_SERVER_PORT);
				console.warn('   Try: Code Tutor: Restart Prompt Server');
				return false;
			};

			// Start the prompt server on activation
			reportProgress('Starting prompt server...', 15);
			startPromptServer();

			// Give the server a moment to start
			waitForPromptServer().catch(e => console.error('Error waiting for prompt server:', e));

			reportProgress('Initializing storage...', 15);
			// Initialize storage adapters
			const fileStorage = new FileSystemStorage(context.globalStorageUri.fsPath);
			const vscodeStorage = new VSCodeStorage(context.globalState);
			const studentDataService = new StudentDataService(fileStorage, vscodeStorage);

			// Initialize StudentService (wraps StudentDataService with sync compatibility)
			const studentService = new StudentService(studentDataService, context);

			// Initialize ProgressBroadcaster (SSE manager set later after server starts)
			const progressBroadcaster = new ProgressBroadcaster(studentService);

			// Initialize TeacherStatsService (consolidates statistics and monitoring)
			const teacherStatsService = new TeacherStatsService(studentService);

			reportProgress('Initializing features...', 20);
			// Initialize assignment feature
			assignmentFeature = new AssignmentFeature({
				context,
				getStudentId: () => getOrCreateStudentId(),
				onProgressUpdate: (command) => updateProgress(command),
				onAssignmentAction: (action, assignmentId) => {
					lastAssignmentAction = {action, assignmentId, timestamp: new Date().toISOString()};

					const actionMessages: Record<string, string> = {
						'start': '?? Assignment started! Good luck!',
						'complete': '? Assignment completed! Great work!',
						'grade': '?? Assignment graded!'
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
						context.globalState.update('lastAssignmentAction', {
							action,
							assignmentId,
							timestamp: new Date().toISOString()
						});
						vscode.window.showInformationMessage(actionMessages[action] || 'Assignment updated!');

						setTimeout(async () => {
							try {
								await vscode.commands.executeCommand('workbench.action.chat.open', {query: '@tutor /assignment-feedback'});
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
			// IMPORTANT: Must be initialized before route registration (startServer)
			slideshowFeature = new SlideshowFeature(
				studentDataService,
				() => vscode.commands.executeCommand('code-tutor.openDashboard')
			);

			// Validate slideshow feature initialized
			if (!slideshowFeature) {
				console.error('Failed to initialize SlideshowFeature');
				vscode.window.showErrorMessage('Code Tutor: Failed to initialize slideshow feature');
			}

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
				return {prompts: {}, adaptivePrompts: {}};
			};

			// Wrapper functions for backward compatibility (async -> sync)
			// ========== HELPER WRAPPERS (Using StudentService & ProgressBroadcaster) ==========
			const getOrCreateStudentId = () => studentService.getOrCreateStudentId();
			const loadStudentData = () => studentService.loadStudentData();
			const saveStudentData = (data: Record<string, Record<string, number>>) => studentService.saveStudentData(data);
			const loadStudentMetadata = () => studentService.loadStudentMetadata();
			const saveStudentMetadata = (metadata: Record<string, {
				name: string;
				yearLevel: number
			}>) => studentService.saveStudentMetadata(metadata);
			const broadcastSSEUpdate = (data: any) => progressBroadcaster.broadcastSSEUpdate(data);
			const updateProgress = (command: string) => progressBroadcaster.updateProgress(command);

			// Duplicate helpers removed (already in chat-utils.ts):
			// - getCodeContext() => use chat-utils.getCodeContext()
			// - getValidModel() => use chat-utils.getValidModel()
			// - listConcreteModels() => use chat-utils.listConcreteModels()

			// Duplicate helpers removed (already in SlideshowFeature):
			// - loadEducationalSlides() => use slideshowFeature.loadSlidesSync()
			// - saveEducationalSlides() => use slideshowFeature.saveSlidesSync()

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
			const getAllStudentsStats = () => teacherStatsService.getAllStudentsStats();

			// Teacher monitoring: Calculate class-wide statistics
			const getClassStats = () => teacherStatsService.getClassStats();

			// Teacher monitoring: Generate early warnings for struggling students
			const getEarlyWarnings = () => teacherStatsService.getEarlyWarnings();

			// Live Demo State Management
			const getLiveDemoState = () => liveDemoState;
			const setLiveDemoState = (state: LiveDemoState) => {
				liveDemoState = state;
			};

			// Function to start the dashboard server
			const startServer = () => {
				if (server) {
					return;
				}

				// Initialize SSE manager
				if (!sseManager) {
					sseManager = new SimpleSSEManager();
					progressBroadcaster.setSSEManager(sseManager); // Connect broadcaster
				}

				// Configure router with all dependencies
				// IMPORTANT: All features must be initialized before this point
				const routeConfig: RouteConfig = {
					context,
					sseManager,
					getOrCreateStudentId,
					loadStudentData,
					broadcastSSEUpdate,
					getAllStudentsStats,
					getClassStats,
					getEarlyWarnings,
					slideshowFeature, // Initialized above, routes handle null gracefully
					getSkillLevel,
					calculateAchievements,
					LEARNING_PATHS,
					loadPrompts,
					liveDemoState,
					setLiveDemoState,
					getLiveDemoState
				};

				const router = initializeRouter(routeConfig);

				// Create HTTP server using Router
				const httpServer = http.createServer(async (req, res) => {
					await router.handle(req, res);
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
					console.log('? Integrated prompt server endpoints are active');
					console.log(`? Dashboard feature initialized with ${dashboardFeature!.getClientCount()} SSE clients`);
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
					console.log('? Server successfully started and listening');
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

			reportProgress('Registering commands...', 15);
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
						'start': '?? Goed gedaan! Je bent begonnen met de opdracht. Veel sterkte! ??',
						'complete': '? Gefeliciteerd! Je hebt de opdracht voltooid! ??',
						'grade': '?? Je opdracht is beoordeeld! Controleer je feedback en leer ervan! ??'
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
				console.log('?? Checking prompt server status...');

				const ready = await waitForPromptServer(2);
				if (ready) {
					vscode.window.showInformationMessage('? Prompt server is running and responsive!');
					console.log('? Prompt server is ready');
				} else {
					vscode.window.showErrorMessage(
						'? Prompt server is not responding. Try "Code Tutor: Restart Prompt Server" or reload the window.'
					);
					console.error('? Prompt server not responding');
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

			context.subscriptions.push(
				vscode.window.onDidChangeTextEditorSelection(() => {
					// This is kept for other uses but assignment notifications now use broadcastSSEUpdate
				})
			);
			// ========== NEW: CHAT PARTICIPANT FEATURE ==========
			// Initialize chat participant with retry logic
			reportProgress('Registering chat participant...', 5);
			const chatServices = {
				updateProgress,
				broadcastSSEUpdate,
				getOrCreateStudentId,
				loadStudentData,
				saveStudentData,
				loadStudentMetadata,
				saveStudentMetadata
			};

			const chatFeature = new ChatParticipantFeature(context, chatServices);

			// Register participant asynchronously with verification
			chatFeature.initialize().then(chatParticipant => {
				if (chatParticipant) {
					context.subscriptions.push(chatParticipant);
					console.log('[Extension] Chat participant registered and added to subscriptions');
				} else {
					console.warn('[Extension] Chat participant registration failed - feature unavailable');
				}
			}).catch(error => {
				console.error('[Extension] Unexpected error during chat participant initialization:', error);
				vscode.window.showWarningMessage(
					'Code Tutor: Chat participant may not be available. Some features may be limited.'
				);
			});
			// ========== END NEW FEATURE ==========

			// Start Discord bot and Dashboard server automatically when extension activates
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

			reportProgress('Starting background services...', 20);
			// Start services automatically
			console.log('Initializing Code Tutor services...');
			startDiscordBot();

			// Start dashboard server (with integrated prompt server)
			reportProgress('Starting dashboard server...', 10);
			console.log('Starting dashboard server with integrated prompt server...');
			startServer();
			console.log('Dashboard server startup initiated');

			reportProgress('Ready', 15);
			const activationElapsedMs = Date.now() - activationStartMs;
			logActivation(`Activation completed in ${activationElapsedMs}ms`);
		} catch (error) {
			const activationElapsedMs = Date.now() - activationStartMs;
			const errorMessage = error instanceof Error ? error.message : String(error);
			logActivation(`Activation failed after ${activationElapsedMs}ms: ${errorMessage}`);
			progress.report({ message: 'Activation failed', increment: 0 });
			const action = await vscode.window.showErrorMessage(
				'Code Tutor failed to activate. Check Output: Code Tutor for details.',
				'Open Output'
			);
			if (action === 'Open Output') {
				activationOutput.show(true);
			}
			throw error;
		}
	});
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