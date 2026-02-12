/**
 * VS Code Window Adapter
 * 
 * Abstracts VS Code UI operations (messages, input boxes, etc.)
 * Part of Infrastructure Layer
 */

import * as vscode from 'vscode';

export interface WindowAdapter {
	/**
	 * Show information message
	 */
	showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>;

	/**
	 * Show warning message
	 */
	showWarningMessage(message: string, ...items: string[]): Thenable<string | undefined>;

	/**
	 * Show error message
	 */
	showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined>;

	/**
	 * Show input box for user text input
	 */
	showInputBox(options?: vscode.InputBoxOptions): Thenable<string | undefined>;

	/**
	 * Show quick pick for user selection
	 */
	showQuickPick(items: string[] | Thenable<string[]>, options?: vscode.QuickPickOptions): Thenable<string | undefined>;

	/**
	 * Get active text editor
	 */
	getActiveEditor(): vscode.TextEditor | undefined;
}

export class VSCodeWindowAdapter implements WindowAdapter {
	showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined> {
		return vscode.window.showInformationMessage(message, ...items);
	}

	showWarningMessage(message: string, ...items: string[]): Thenable<string | undefined> {
		return vscode.window.showWarningMessage(message, ...items);
	}

	showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined> {
		return vscode.window.showErrorMessage(message, ...items);
	}

	showInputBox(options?: vscode.InputBoxOptions): Thenable<string | undefined> {
		return vscode.window.showInputBox(options);
	}

	showQuickPick(items: string[] | Thenable<string[]>, options?: vscode.QuickPickOptions): Thenable<string | undefined> {
		return vscode.window.showQuickPick(items, options);
	}

	getActiveEditor(): vscode.TextEditor | undefined {
		return vscode.window.activeTextEditor;
	}
}
