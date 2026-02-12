/**
 * VS Code Editor Adapter
 * 
 * Abstracts text editor operations
 * Part of Infrastructure Layer
 */

import * as vscode from 'vscode';

export interface EditorAdapter {
	/**
	 * Get current document text
	 */
	getText(editor: vscode.TextEditor): string;

	/**
	 * Get selected text
	 */
	getSelectedText(editor: vscode.TextEditor): string;

	/**
	 * Insert text at cursor position
	 */
	insertText(editor: vscode.TextEditor, text: string): Thenable<boolean>;

	/**
	 * Replace text in range
	 */
	replaceText(editor: vscode.TextEditor, range: vscode.Range, text: string): Thenable<boolean>;

	/**
	 * Get document language ID
	 */
	getLanguageId(editor: vscode.TextEditor): string;

	/**
	 * Get document file path
	 */
	getFilePath(editor: vscode.TextEditor): string;
}

export class VSCodeEditorAdapter implements EditorAdapter {
	getText(editor: vscode.TextEditor): string {
		return editor.document.getText();
	}

	getSelectedText(editor: vscode.TextEditor): string {
		return editor.document.getText(editor.selection);
	}

	async insertText(editor: vscode.TextEditor, text: string): Promise<boolean> {
		return editor.edit(editBuilder => {
			editBuilder.insert(editor.selection.active, text);
		});
	}

	async replaceText(editor: vscode.TextEditor, range: vscode.Range, text: string): Promise<boolean> {
		return editor.edit(editBuilder => {
			editBuilder.replace(range, text);
		});
	}

	getLanguageId(editor: vscode.TextEditor): string {
		return editor.document.languageId;
	}

	getFilePath(editor: vscode.TextEditor): string {
		return editor.document.uri.fsPath;
	}
}
