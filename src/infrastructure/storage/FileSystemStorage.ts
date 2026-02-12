/**
 * File System Storage Implementation
 * 
 * Persists data to JSON files on disk
 * Suitable for shared data across extension instances
 * Part of Infrastructure Layer
 */

import * as fs from 'fs';
import * as path from 'path';
import type { StorageAdapter } from './StorageAdapter';

export class FileSystemStorage implements StorageAdapter {
	private baseDir: string;

	/**
	 * Create file system storage
	 * @param baseDir - Base directory for storage files
	 */
	constructor(baseDir: string) {
		this.baseDir = baseDir;
		this.ensureDir();
	}

	/**
	 * Ensure storage directory exists
	 */
	private ensureDir(): void {
		if (!fs.existsSync(this.baseDir)) {
			fs.mkdirSync(this.baseDir, { recursive: true });
		}
	}

	/**
	 * Get file path for key
	 */
	private getFilePath(key: string): string {
		// Sanitize key for filename
		const sanitized = key.replace(/[^a-zA-Z0-9-_]/g, '-');
		return path.join(this.baseDir, `${sanitized}.json`);
	}

	async get<T>(key: string): Promise<T | undefined> {
		const filePath = this.getFilePath(key);
		
		try {
			if (!fs.existsSync(filePath)) {
				return undefined;
			}
			
			const data = fs.readFileSync(filePath, 'utf8');
			return JSON.parse(data) as T;
		} catch (error) {
			console.error(`Error reading ${key}:`, error);
			return undefined;
		}
	}

	async set<T>(key: string, value: T): Promise<void> {
		const filePath = this.getFilePath(key);
		
		try {
			this.ensureDir();
			const data = JSON.stringify(value, null, 2);
			fs.writeFileSync(filePath, data, 'utf8');
		} catch (error) {
			console.error(`Error writing ${key}:`, error);
			throw error;
		}
	}

	async has(key: string): Promise<boolean> {
		const filePath = this.getFilePath(key);
		return fs.existsSync(filePath);
	}

	async delete(key: string): Promise<void> {
		const filePath = this.getFilePath(key);
		
		try {
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		} catch (error) {
			console.error(`Error deleting ${key}:`, error);
			throw error;
		}
	}

	async keys(): Promise<string[]> {
		try {
			if (!fs.existsSync(this.baseDir)) {
				return [];
			}
			
			const files = fs.readdirSync(this.baseDir);
			return files
				.filter(f => f.endsWith('.json'))
				.map(f => f.replace('.json', ''));
		} catch (error) {
			console.error('Error listing keys:', error);
			return [];
		}
	}

	async clear(): Promise<void> {
		try {
			if (!fs.existsSync(this.baseDir)) {
				return;
			}
			
			const files = fs.readdirSync(this.baseDir);
			for (const file of files) {
				if (file.endsWith('.json')) {
					fs.unlinkSync(path.join(this.baseDir, file));
				}
			}
		} catch (error) {
			console.error('Error clearing storage:', error);
			throw error;
		}
	}
}
