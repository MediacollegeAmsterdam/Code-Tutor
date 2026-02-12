import * as vscode from 'vscode';
import { ChatContext } from './ChatContext';

/**
 * Command Pattern Interface for Chat Participant Commands
 * 
 * Each command is responsible for:
 * - Validating inputs
 * - Executing its specific logic
 * - Streaming responses to the chat
 */
export interface ICommand {
	/** Unique command name (e.g., 'setlevel', 'help', 'explain') */
	readonly name: string;
	
	/** Human-readable description of what this command does */
	readonly description: string;
	
	/** Optional aliases for command invocation */
	readonly aliases?: string[];
	
	/**
	 * Execute the command logic
	 * @param context Shared chat context with state and services
	 * @param stream Chat response stream for output
	 * @param token Cancellation token
	 */
	execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<void>;
	
	/**
	 * Validate command prerequisites (optional)
	 * @param context Chat context for validation
	 * @returns Error message if invalid, undefined if valid
	 */
	validate?(context: ChatContext): string | undefined;
}
