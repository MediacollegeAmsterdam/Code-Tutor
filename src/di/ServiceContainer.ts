import * as vscode from 'vscode';
import * as http from 'http';

// Infrastructure
import { FileSystemStorage, VSCodeStorage, StudentDataService } from '../infrastructure/storage';
import { SimpleHttpServer, SimpleSSEManager } from '../infrastructure/http';

// Features
import { DashboardFeature } from '../features/dashboard';
import { AssignmentFeature } from '../features/assignment';
import { LiveDemoFeature } from '../features/livedemo';
import { SlideshowFeature } from '../features/slideshow';

/**
 * ServiceContainer - Dependency Injection Container
 * 
 * Manages lifecycle and dependencies of all services and features.
 * Implements Singleton pattern for centralized service access.
 * 
 * Initialization Order:
 * 1. Infrastructure services (storage, HTTP, SSE)
 * 2. Feature modules (assignment, livestream, slideshow, dashboard)
 * 3. Route registration (depends on all features being ready)
 * 
 * All features are guaranteed to be initialized before the constructor returns.
 */
export class ServiceContainer {
	private static instance: ServiceContainer | undefined;
	
	// Infrastructure services
	public readonly fileStorage: FileSystemStorage;
	public readonly vscodeStorage: VSCodeStorage;
	public readonly studentDataService: StudentDataService;
	public readonly httpServer: http.Server;
	public readonly sseManager: SimpleSSEManager;
	
	// Feature modules
	public readonly dashboardFeature: DashboardFeature;
	public readonly assignmentFeature: AssignmentFeature;
	public readonly liveDemoFeature: LiveDemoFeature;
	public readonly slideshowFeature: SlideshowFeature;
	
	private constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly getStudentId: () => string,
		httpServer: http.Server,
		sseManager: SimpleSSEManager
	) {
		// Initialize infrastructure layer
		this.fileStorage = new FileSystemStorage(context.globalStorageUri.fsPath);
		this.vscodeStorage = new VSCodeStorage(context.globalState);
		this.studentDataService = new StudentDataService(this.fileStorage, this.vscodeStorage);
		
		this.httpServer = httpServer;
		this.sseManager = sseManager;
		
		// Initialize feature modules with dependencies
		this.assignmentFeature = new AssignmentFeature({
			context,
			getStudentId,
			onProgressUpdate: (command) => this.handleProgressUpdate(command),
			onAssignmentAction: (action, assignmentId) => this.handleAssignmentAction(action, assignmentId)
		});
		
		this.liveDemoFeature = new LiveDemoFeature({
			onBroadcast: (data) => this.broadcastSSEUpdate(data)
		});
		
		this.slideshowFeature = new SlideshowFeature(
			this.studentDataService,
			() => vscode.commands.executeCommand('code-tutor.openDashboard')
		);
		
		this.dashboardFeature = new DashboardFeature({
			server: this.httpServer,
			sseManager: this.sseManager,
			context
		});
		
		// Validate all features initialized
		this.validateInitialization();
	}
	
	/**
	 * Validate that all features are properly initialized
	 * @throws Error if any feature is not initialized
	 */
	private validateInitialization(): void {
		const features = {
			assignmentFeature: this.assignmentFeature,
			liveDemoFeature: this.liveDemoFeature,
			slideshowFeature: this.slideshowFeature,
			dashboardFeature: this.dashboardFeature
		};
		
		for (const [name, feature] of Object.entries(features)) {
			if (!feature) {
				throw new Error(`ServiceContainer: ${name} failed to initialize`);
			}
		}
	}
	
	/**
	 * Initialize the service container
	 */
	static initialize(
		context: vscode.ExtensionContext,
		getStudentId: () => string,
		httpServer: http.Server,
		sseManager: SimpleSSEManager
	): ServiceContainer {
		if (ServiceContainer.instance) {
			throw new Error('ServiceContainer already initialized');
		}
		
		ServiceContainer.instance = new ServiceContainer(
			context,
			getStudentId,
			httpServer,
			sseManager
		);
		
		return ServiceContainer.instance;
	}
	
	/**
	 * Get the service container instance
	 */
	static getInstance(): ServiceContainer {
		if (!ServiceContainer.instance) {
			throw new Error('ServiceContainer not initialized. Call initialize() first.');
		}
		return ServiceContainer.instance;
	}
	
	/**
	 * Reset the service container (for testing)
	 */
	static reset(): void {
		ServiceContainer.instance = undefined;
	}
	
	/**
	 * Broadcast SSE update to all connected clients
	 */
	private broadcastSSEUpdate(data: any): void {
		this.sseManager.broadcast('update', data);
	}
	
	/**
	 * Handle progress update from assignment feature
	 */
	private handleProgressUpdate(command: string): void {
		// Update progress tracking
		const studentId = this.getStudentId();
		const currentData = this.context.globalState.get<Record<string, Record<string, number>>>('studentData', {});
		
		if (!currentData[studentId]) {
			currentData[studentId] = {};
		}
		
		currentData[studentId][command] = (currentData[studentId][command] || 0) + 1;
		this.context.globalState.update('studentData', currentData);
		
		// Broadcast to dashboard
		this.broadcastSSEUpdate({
			type: 'progressUpdate',
			studentId,
			command,
			count: currentData[studentId][command]
		});
	}
	
	/**
	 * Handle assignment action (start, complete, grade)
	 */
	private handleAssignmentAction(action: string, assignmentId: string): void {
		const actionMessages: Record<string, string> = {
			'start': '▶️ Assignment started! Good luck!',
			'complete': '✅ Assignment completed! Great work!',
			'grade': '🏆 Assignment graded!'
		};
		
		// Store last action for chat feedback
		this.context.globalState.update('lastAssignmentAction', {
			action,
			assignmentId,
			timestamp: new Date().toISOString()
		});
		
		// Broadcast SSE update
		this.broadcastSSEUpdate({
			type: 'assignmentUpdate',
			action,
			assignmentId,
			message: actionMessages[action] || 'Assignment action completed!'
		});
		
		// Show notification
		vscode.window.showInformationMessage(actionMessages[action] || 'Assignment updated!');
		
		// Open chat for complete and grade actions
		if (action === 'complete' || action === 'grade') {
			setTimeout(async () => {
				try {
					await vscode.commands.executeCommand('workbench.action.chat.open', { 
						query: '@tutor /assignment-feedback' 
					});
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
	
	/**
	 * Cleanup resources on deactivation
	 */
	async dispose(): Promise<void> {
		await this.dashboardFeature.close();
		ServiceContainer.reset();
	}
}
