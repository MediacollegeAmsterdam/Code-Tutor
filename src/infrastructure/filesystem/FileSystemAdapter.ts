/**
 * File System Adapter
 * 
 * Abstracts file system operations
 * Part of Infrastructure Layer
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FileSystemAdapter {
	/**
	 * Read file as UTF-8 text
	 */
	readFile(filePath: string): Promise<string>;

	/**
	 * Write file as UTF-8 text
	 */
	writeFile(filePath: string, content: string): Promise<void>;

	/**
	 * Check if file exists
	 */
	fileExists(filePath: string): Promise<boolean>;

	/**
	 * Check if directory exists
	 */
	directoryExists(dirPath: string): Promise<boolean>;

	/**
	 * Create directory (recursive)
	 */
	createDirectory(dirPath: string): Promise<void>;

	/**
	 * List files in directory
	 */
	listFiles(dirPath: string): Promise<string[]>;

	/**
	 * Delete file
	 */
	deleteFile(filePath: string): Promise<void>;

	/**
	 * Get file stats
	 */
	getStats(filePath: string): Promise<fs.Stats>;
}

export class NodeFileSystemAdapter implements FileSystemAdapter {
	async readFile(filePath: string): Promise<string> {
		return fs.promises.readFile(filePath, 'utf8');
	}

	async writeFile(filePath: string, content: string): Promise<void> {
		await fs.promises.writeFile(filePath, content, 'utf8');
	}

	async fileExists(filePath: string): Promise<boolean> {
		try {
			const stats = await fs.promises.stat(filePath);
			return stats.isFile();
		} catch {
			return false;
		}
	}

	async directoryExists(dirPath: string): Promise<boolean> {
		try {
			const stats = await fs.promises.stat(dirPath);
			return stats.isDirectory();
		} catch {
			return false;
		}
	}

	async createDirectory(dirPath: string): Promise<void> {
		await fs.promises.mkdir(dirPath, { recursive: true });
	}

	async listFiles(dirPath: string): Promise<string[]> {
		return fs.promises.readdir(dirPath);
	}

	async deleteFile(filePath: string): Promise<void> {
		await fs.promises.unlink(filePath);
	}

	async getStats(filePath: string): Promise<fs.Stats> {
		return fs.promises.stat(filePath);
	}
}

/**
 * Synchronous File System Adapter
 * For legacy code that requires sync operations
 */
export class SyncFileSystemAdapter {
	readFile(filePath: string): string {
		return fs.readFileSync(filePath, 'utf8');
	}

	writeFile(filePath: string, content: string): void {
		fs.writeFileSync(filePath, content, 'utf8');
	}

	fileExists(filePath: string): boolean {
		return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
	}

	directoryExists(dirPath: string): boolean {
		return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
	}

	createDirectory(dirPath: string): void {
		fs.mkdirSync(dirPath, { recursive: true });
	}

	listFiles(dirPath: string): string[] {
		return fs.readdirSync(dirPath);
	}

	deleteFile(filePath: string): void {
		fs.unlinkSync(filePath);
	}

	getStats(filePath: string): fs.Stats {
		return fs.statSync(filePath);
	}
}
