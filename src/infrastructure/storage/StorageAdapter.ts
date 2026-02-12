/**
 * Storage Adapter Interface
 * 
 * Abstracts storage operations from implementation details
 * Enables testing with mock storage and switching storage backends
 * Part of Infrastructure Layer
 */

/**
 * Generic storage interface for key-value data persistence
 */
export interface StorageAdapter {
	/**
	 * Retrieve data by key
	 * @param key - Storage key
	 * @returns Stored value or undefined if not found
	 */
	get<T>(key: string): Promise<T | undefined>;

	/**
	 * Store data with key
	 * @param key - Storage key
	 * @param value - Value to store (must be JSON-serializable)
	 */
	set<T>(key: string, value: T): Promise<void>;

	/**
	 * Check if key exists
	 * @param key - Storage key
	 * @returns True if key exists
	 */
	has(key: string): Promise<boolean>;

	/**
	 * Delete data by key
	 * @param key - Storage key
	 */
	delete(key: string): Promise<void>;

	/**
	 * List all keys (optional, for debugging/migration)
	 * @returns Array of all storage keys
	 */
	keys?(): Promise<string[]>;

	/**
	 * Clear all data (optional, for testing)
	 */
	clear?(): Promise<void>;
}

/**
 * Student progress data structure
 */
export interface StudentProgressData {
	[studentId: string]: Record<string, number>;
}

/**
 * Student metadata structure
 */
export interface StudentMetadata {
	name: string;
	yearLevel: number;
}

/**
 * All student metadata
 */
export interface AllStudentMetadata {
	[studentId: string]: StudentMetadata;
}
