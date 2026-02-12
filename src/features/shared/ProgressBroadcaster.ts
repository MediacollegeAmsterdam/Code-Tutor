import { StudentService } from '../../core/services/StudentService';
import { SimpleSSEManager } from '../../infrastructure/http';

/**
 * ProgressBroadcaster - Centralized progress tracking and broadcasting
 * 
 * Handles student progress updates and real-time SSE notifications.
 */
export class ProgressBroadcaster {
	private studentService: StudentService;
	private sseManager: SimpleSSEManager | undefined;
	
	constructor(
		studentService: StudentService,
		sseManager?: SimpleSSEManager
	) {
		this.studentService = studentService;
		this.sseManager = sseManager;
	}
	
	/**
	 * Update student progress for a command and broadcast to dashboard
	 */
	updateProgress(command: string, studentId?: string): void {
		const actualStudentId = studentId || this.studentService.getOrCreateStudentId();
		
		// Get all students' data from file
		const allStudentsData = this.studentService.loadStudentData();
		const metadata = this.studentService.loadStudentMetadata();
		
		// Initialize student data if not exists
		if (!allStudentsData[actualStudentId]) {
			allStudentsData[actualStudentId] = {};
		}
		
		// Update command count
		const currentCount = allStudentsData[actualStudentId][command] || 0;
		allStudentsData[actualStudentId][command] = currentCount + 1;
		
		// Save updated data
		this.studentService.saveStudentData(allStudentsData);
		
		// Calculate statistics
		const studentData = allStudentsData[actualStudentId];
		const totalCommands = Object.values(studentData).reduce((sum, count) => sum + count, 0);
		const favoriteCommand = Object.entries(studentData)
			.sort(([, a], [, b]) => b - a)[0]?.[0] || '';
		
		// Broadcast update via SSE
		this.broadcastSSEUpdate({
			studentId: actualStudentId,
			type: 'progress',
			command,
			details: {
				totalCommands,
				favoriteCommand,
				commandCounts: studentData
			},
			timestamp: new Date().toISOString()
		});
	}
	
	/**
	 * Broadcast update to all SSE clients
	 */
	broadcastSSEUpdate(data: any): void {
		if (this.sseManager) {
			this.sseManager.broadcast('update', data);
		}
	}
	
	/**
	 * Set SSE manager (for delayed initialization)
	 */
	setSSEManager(sseManager: SimpleSSEManager): void {
		this.sseManager = sseManager;
	}
}
