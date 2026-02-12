import * as vscode from 'vscode';
import { StudentDataService } from '../../infrastructure/storage';

/**
 * StudentService - High-level student data operations
 * 
 * Provides synchronous wrappers around StudentDataService for extension.ts compatibility.
 * Eventually should migrate all consumers to async operations.
 */
export class StudentService {
	private studentDataService: StudentDataService;
	private extensionContext: vscode.ExtensionContext;
	private cachedStudentId: string | undefined;
	
	constructor(
		studentDataService: StudentDataService,
		extensionContext: vscode.ExtensionContext
	) {
		this.studentDataService = studentDataService;
		this.extensionContext = extensionContext;
	}
	
	/**
	 * Get or create a unique student ID
	 * Provides synchronous wrapper with caching for legacy compatibility
	 */
	getOrCreateStudentId(): string {
		if (!this.cachedStudentId) {
			// Trigger async load but use fallback
			this.studentDataService.getOrCreateStudentId().then(id => this.cachedStudentId = id);
			
			// Synchronous fallback
			this.cachedStudentId = this.extensionContext.globalState.get<string>('studentId');
			if (!this.cachedStudentId) {
				this.cachedStudentId = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				this.extensionContext.globalState.update('studentId', this.cachedStudentId);
			}
		}
		return this.cachedStudentId;
	}
	
	/**
	 * Load all student data (command usage statistics)
	 * Synchronous wrapper - eventually migrate to async
	 */
	loadStudentData(): Record<string, Record<string, number>> {
		let result: Record<string, Record<string, number>> = {};
		this.studentDataService.loadStudentData().then(data => result = data);
		return result;
	}
	
	/**
	 * Save student data (command usage statistics)
	 */
	saveStudentData(data: Record<string, Record<string, number>>): void {
		this.studentDataService.saveStudentData(data).catch(e => 
			console.error('Error saving student data:', e)
		);
	}
	
	/**
	 * Load student metadata (names, year levels)
	 * Synchronous wrapper - eventually migrate to async
	 */
	loadStudentMetadata(): Record<string, { name: string; yearLevel: number }> {
		let result: Record<string, { name: string; yearLevel: number }> = {};
		this.studentDataService.loadStudentMetadata().then(data => result = data);
		return result;
	}
	
	/**
	 * Save student metadata (names, year levels)
	 */
	saveStudentMetadata(metadata: Record<string, { name: string; yearLevel: number }>): void {
		this.studentDataService.saveStudentMetadata(metadata).catch(e => 
			console.error('Error saving student metadata:', e)
		);
	}
	
	/**
	 * Async version of getOrCreateStudentId for new code
	 */
	async getOrCreateStudentIdAsync(): Promise<string> {
		return await this.studentDataService.getOrCreateStudentId();
	}
	
	/**
	 * Async version of loadStudentData for new code
	 */
	async loadStudentDataAsync(): Promise<Record<string, Record<string, number>>> {
		return await this.studentDataService.loadStudentData();
	}
	
	/**
	 * Async version of loadStudentMetadata for new code
	 */
	async loadStudentMetadataAsync(): Promise<Record<string, { name: string; yearLevel: number }>> {
		return await this.studentDataService.loadStudentMetadata();
	}
}
