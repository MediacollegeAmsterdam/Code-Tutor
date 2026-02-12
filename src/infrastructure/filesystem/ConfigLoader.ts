/**
 * Configuration Loader
 * 
 * Loads and parses configuration files
 * Part of Infrastructure Layer
 */

import * as path from 'path';
import type { FileSystemAdapter } from './FileSystemAdapter';

export interface ConfigLoader {
	/**
	 * Load JSON configuration file
	 */
	loadJSON<T = any>(filePath: string): Promise<T>;

	/**
	 * Load and parse prompts.json
	 */
	loadPrompts(): Promise<{
		prompts: Record<string, string>;
		adaptivePrompts: Record<string, any>;
	}>;

	/**
	 * Load and parse slides.json
	 */
	loadSlides(): Promise<any>;
}

export class JSONConfigLoader implements ConfigLoader {
	constructor(
		private fileSystem: FileSystemAdapter,
		private basePath: string
	) {}

	async loadJSON<T = any>(filePath: string): Promise<T> {
		const fullPath = path.join(this.basePath, filePath);
		const content = await this.fileSystem.readFile(fullPath);
		return JSON.parse(content);
	}

	async loadPrompts(): Promise<{
		prompts: Record<string, string>;
		adaptivePrompts: Record<string, any>;
	}> {
		return this.loadJSON('prompts.json');
	}

	async loadSlides(): Promise<any> {
		return this.loadJSON('slides.json');
	}
}

/**
 * Synchronous Config Loader
 * For legacy code requiring sync operations
 */
export class SyncConfigLoader {
	constructor(
		private basePath: string
	) {}

	private readFileSync(filePath: string): string {
		const fs = require('fs');
		const fullPath = path.join(this.basePath, filePath);
		return fs.readFileSync(fullPath, 'utf8');
	}

	loadJSON<T = any>(filePath: string): T {
		const content = this.readFileSync(filePath);
		return JSON.parse(content);
	}

	loadPrompts(): {
		prompts: Record<string, string>;
		adaptivePrompts: Record<string, any>;
	} {
		return this.loadJSON('prompts.json');
	}

	loadSlides(): any {
		return this.loadJSON('slides.json');
	}
}
