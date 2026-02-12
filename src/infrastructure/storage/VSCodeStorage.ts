/**
 * VS Code Storage Implementation
 * 
 * Uses VS Code's globalState for data persistence
 * Suitable for extension-specific data
 * Part of Infrastructure Layer
 */

import * as vscode from 'vscode';
import type { StorageAdapter } from './StorageAdapter';

export class VSCodeStorage implements StorageAdapter {
	private state: vscode.Memento;

	/**
	 * Create VS Code storage adapter
	 * @param state - VS Code globalState or workspaceState
	 */
	constructor(state: vscode.Memento) {
		this.state = state;
	}

	async get<T>(key: string): Promise<T | undefined> {
		return this.state.get<T>(key);
	}

	async set<T>(key: string, value: T): Promise<void> {
		await this.state.update(key, value);
	}

	async has(key: string): Promise<boolean> {
		return this.state.get(key) !== undefined;
	}

	async delete(key: string): Promise<void> {
		await this.state.update(key, undefined);
	}

	async keys(): Promise<string[]> {
		// VS Code Memento doesn't provide a keys() method
		// This would need to be tracked separately if needed
		return [];
	}

	async clear(): Promise<void> {
		// VS Code Memento doesn't provide a clear() method
		// Would need to track keys separately to implement this
		throw new Error('Clear not supported by VSCodeStorage');
	}
}
