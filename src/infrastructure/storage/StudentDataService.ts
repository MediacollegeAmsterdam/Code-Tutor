/**
 * Student Data Service
 * 
 * Domain-specific storage operations for student data
 * Uses StorageAdapter for actual persistence
 * Part of Infrastructure Layer
 */

import type { StorageAdapter, StudentProgressData, AllStudentMetadata } from './StorageAdapter';
import type { SlideCollection } from '../../core/types';

/**
 * Keys for different data types in storage
 */
export const STORAGE_KEYS = {
	STUDENT_DATA: 'student-data',
	STUDENT_METADATA: 'student-metadata',
	EDUCATIONAL_SLIDES: 'educational-slides',
	STUDENT_ID: 'studentId'
} as const;

/**
 * Service for managing student data persistence
 */
export class StudentDataService {
	constructor(
		private storage: StorageAdapter,
		private idStorage: StorageAdapter
	) {}

	/**
	 * Get or create unique student ID
	 */
	async getOrCreateStudentId(): Promise<string> {
		let studentId = await this.idStorage.get<string>(STORAGE_KEYS.STUDENT_ID);
		if (!studentId) {
			studentId = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			await this.idStorage.set(STORAGE_KEYS.STUDENT_ID, studentId);
		}
		return studentId;
	}

	/**
	 * Load all student progress data
	 */
	async loadStudentData(): Promise<StudentProgressData> {
		const data = await this.storage.get<StudentProgressData>(STORAGE_KEYS.STUDENT_DATA);
		return data || {};
	}

	/**
	 * Save student progress data
	 */
	async saveStudentData(data: StudentProgressData): Promise<void> {
		await this.storage.set(STORAGE_KEYS.STUDENT_DATA, data);
	}

	/**
	 * Load all student metadata
	 */
	async loadStudentMetadata(): Promise<AllStudentMetadata> {
		const metadata = await this.storage.get<AllStudentMetadata>(STORAGE_KEYS.STUDENT_METADATA);
		return metadata || {};
	}

	/**
	 * Save student metadata
	 */
	async saveStudentMetadata(metadata: AllStudentMetadata): Promise<void> {
		await this.storage.set(STORAGE_KEYS.STUDENT_METADATA, metadata);
	}

	/**
	 * Load educational slides collection
	 */
	async loadEducationalSlides(): Promise<SlideCollection> {
		const slides = await this.storage.get<SlideCollection>(STORAGE_KEYS.EDUCATIONAL_SLIDES);
		return slides || { slides: [], lastUpdated: Date.now() };
	}

	/**
	 * Save educational slides collection
	 */
	async saveEducationalSlides(collection: SlideCollection): Promise<void> {
		collection.lastUpdated = Date.now();
		await this.storage.set(STORAGE_KEYS.EDUCATIONAL_SLIDES, collection);
	}

	/**
	 * Update progress for a specific student and command
	 */
	async updateProgress(studentId: string, command: string): Promise<void> {
		const data = await this.loadStudentData();
		
		if (!data[studentId]) {
			data[studentId] = {};
		}
		
		data[studentId][command] = (data[studentId][command] || 0) + 1;
		
		await this.saveStudentData(data);
	}

	/**
	 * Get progress data for a specific student
	 */
	async getStudentProgress(studentId: string): Promise<Record<string, number>> {
		const data = await this.loadStudentData();
		return data[studentId] || {};
	}

	/**
	 * Update metadata for a specific student
	 */
	async updateStudentMetadata(
		studentId: string, 
		name: string, 
		yearLevel: number
	): Promise<void> {
		const metadata = await this.loadStudentMetadata();
		metadata[studentId] = { name, yearLevel };
		await this.saveStudentMetadata(metadata);
	}

	/**
	 * Get metadata for a specific student
	 */
	async getStudentMetadata(studentId: string): Promise<{ name: string; yearLevel: number } | undefined> {
		const metadata = await this.loadStudentMetadata();
		return metadata[studentId];
	}
}
