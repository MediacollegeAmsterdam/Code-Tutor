import * as vscode from 'vscode';
import { getCodeContext } from './chat-utils';

/**
 * Chat Context - Shared state and services for command execution
 * 
 * Provides a clean API for commands to access:
 * - Student identification and profile
 * - VS Code request/context
 * - Code context from editor
 * - Service dependencies (injected from ServiceContainer)
 * - Helper methods for common tasks
 */
export class ChatContext {
	// Student identity
	readonly studentId: string;
	readonly yearLevel: number;
	
	// VS Code context
	readonly request: vscode.ChatRequest;
	readonly chatContext: vscode.ChatContext;
	readonly token: vscode.CancellationToken;
	readonly extensionContext: vscode.ExtensionContext;
	
	// Code context (from editor)
	readonly codeContext: { code: string; language: string } | null;
	
	// AI model
	readonly model: vscode.LanguageModelChat;
	
	// Services (to be injected)
	readonly services: {
		updateProgress: (command: string) => any;
		broadcastSSEUpdate: (data: any) => void;
		getOrCreateStudentId: () => string;
		loadStudentData: () => Record<string, any>;
		saveStudentData: (data: Record<string, any>) => void;
		loadStudentMetadata: () => Record<string, any>;
		saveStudentMetadata: (data: Record<string, any>) => void;
	};
	
	private constructor(
		studentId: string,
		yearLevel: number,
		request: vscode.ChatRequest,
		chatContext: vscode.ChatContext,
		token: vscode.CancellationToken,
		extensionContext: vscode.ExtensionContext,
		codeContext: { code: string; language: string } | null,
		model: vscode.LanguageModelChat,
		services: any
	) {
		this.studentId = studentId;
		this.yearLevel = yearLevel;
		this.request = request;
		this.chatContext = chatContext;
		this.token = token;
		this.extensionContext = extensionContext;
		this.codeContext = codeContext;
		this.model = model;
		this.services = services;
	}
	
	/**
	 * Factory method to create ChatContext with all dependencies
	 */
	static async create(
		request: vscode.ChatRequest,
		chatContext: vscode.ChatContext,
		token: vscode.CancellationToken,
		extensionContext: vscode.ExtensionContext,
		model: vscode.LanguageModelChat,
		services: any
	): Promise<ChatContext> {
		// Get student identification
		const studentId = services.getOrCreateStudentId();
		
		// Get year level from profile
		const userProfile = extensionContext.globalState.get<any>('userProfile');
		const yearLevel = userProfile?.yearLevel || 2;
		
		// Get code context from editor
		const codeContext = getCodeContext();
		
		return new ChatContext(
			studentId,
			yearLevel,
			request,
			chatContext,
			token,
			extensionContext,
			codeContext,
			model,
			services
		);
	}
	
	/**
	 * Get user profile from global state
	 */
	getUserProfile(): any {
		return this.extensionContext.globalState.get('userProfile');
	}
	
	/**
	 * Update user profile in global state
	 */
	async updateUserProfile(profile: any): Promise<void> {
		await this.extensionContext.globalState.update('userProfile', profile);
	}
	
	/**
	 * Get assignment progress for current student
	 */
	getAssignmentProgress(): Record<string, any> {
		const allProgress = this.extensionContext.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
		return allProgress[this.studentId] || {};
	}
	
	/**
	 * Update assignment progress
	 */
	async updateAssignmentProgress(progress: Record<string, any>): Promise<void> {
		const allProgress = this.extensionContext.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
		allProgress[this.studentId] = progress;
		await this.extensionContext.globalState.update('assignmentProgress', allProgress);
	}
	
	/**
	 * Get learning path progress
	 */
	getLearningPathProgress(): Record<string, Record<string, boolean>> {
		return this.extensionContext.globalState.get<Record<string, Record<string, boolean>>>('learningPathProgress', {});
	}
	
	/**
	 * Track command usage and update progress
	 */
	trackProgress(command: string): any {
		return this.services.updateProgress(command);
	}
}
