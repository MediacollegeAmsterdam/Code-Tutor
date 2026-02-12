/**
 * VS Code Command Adapter
 * 
 * Abstracts VS Code command registration and execution
 * Part of Infrastructure Layer
 */

import * as vscode from 'vscode';

export interface CommandAdapter {
	/**
	 * Register a command with VS Code
	 * Returns a disposable for cleanup
	 */
	register(commandId: string, handler: (...args: any[]) => any): vscode.Disposable;

	/**
	 * Execute a VS Code command
	 */
	execute<T = any>(commandId: string, ...args: any[]): Thenable<T>;

	/**
	 * Check if a command exists
	 */
	exists(commandId: string): Thenable<boolean>;
}

export class VSCodeCommandAdapter implements CommandAdapter {
	register(commandId: string, handler: (...args: any[]) => any): vscode.Disposable {
		return vscode.commands.registerCommand(commandId, handler);
	}

	execute<T = any>(commandId: string, ...args: any[]): Thenable<T> {
		return vscode.commands.executeCommand<T>(commandId, ...args);
	}

	async exists(commandId: string): Promise<boolean> {
		const commands = await vscode.commands.getCommands();
		return commands.includes(commandId);
	}
}
