/**
 * VS Code Workspace Adapter
 * 
 * Abstracts VS Code workspace operations
 * Part of Infrastructure Layer
 */

import * as vscode from 'vscode';

export interface WorkspaceAdapter {
	/**
	 * Get workspace folders
	 */
	getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;

	/**
	 * Open external URL in browser
	 */
	openExternal(url: string): Thenable<boolean>;

	/**
	 * Get configuration value
	 */
	getConfiguration<T = any>(section: string, key: string): T | undefined;

	/**
	 * Update configuration value
	 */
	updateConfiguration(section: string, key: string, value: any, global?: boolean): Thenable<void>;

	/**
	 * Register text document change listener
	 */
	onDidChangeTextDocument(listener: (event: vscode.TextDocumentChangeEvent) => any): vscode.Disposable;

	/**
	 * Register active editor change listener
	 */
	onDidChangeActiveEditor(listener: (editor: vscode.TextEditor | undefined) => any): vscode.Disposable;
}

export class VSCodeWorkspaceAdapter implements WorkspaceAdapter {
	getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined {
		return vscode.workspace.workspaceFolders;
	}

	openExternal(url: string): Thenable<boolean> {
		return vscode.env.openExternal(vscode.Uri.parse(url));
	}

	getConfiguration<T = any>(section: string, key: string): T | undefined {
		return vscode.workspace.getConfiguration(section).get<T>(key);
	}

	updateConfiguration(section: string, key: string, value: any, global: boolean = false): Thenable<void> {
		return vscode.workspace.getConfiguration(section).update(key, value, global);
	}

	onDidChangeTextDocument(listener: (event: vscode.TextDocumentChangeEvent) => any): vscode.Disposable {
		return vscode.workspace.onDidChangeTextDocument(listener);
	}

	onDidChangeActiveEditor(listener: (editor: vscode.TextEditor | undefined) => any): vscode.Disposable {
		return vscode.window.onDidChangeActiveTextEditor(listener);
	}
}
