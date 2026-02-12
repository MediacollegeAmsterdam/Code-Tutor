/**
 * Assignment Feature
 * 
 * Manages student assignments including creation, tracking, and feedback
 * Part of Features Layer
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface AssignmentMetadata {
	id: string;
	filename: string;
	title: string;
	difficulty: string;
	topic: string;
	dueDate: string | null;
	estimatedTime: number | null;
}

export interface AssignmentStatus {
	status: 'not-started' | 'in-progress' | 'completed' | 'graded';
	startedAt?: string;
	completedAt?: string;
	gradedAt?: string;
	highlight?: string;
	highlightUpdatedAt?: string;
}

export interface AssignmentDependencies {
	context: vscode.ExtensionContext;
	getStudentId: () => string;
	onProgressUpdate?: (command: string) => void;
	onAssignmentAction?: (action: string, assignmentId: string) => void;
}

export class AssignmentFeature {
	private deps: AssignmentDependencies;

	constructor(deps: AssignmentDependencies) {
		this.deps = deps;
	}

	/**
	 * Get all assignments with metadata
	 */
	getAssignments(): AssignmentMetadata[] {
		const assignmentsDir = path.join(this.deps.context.extensionPath, 'assignments');
		
		if (!fs.existsSync(assignmentsDir)) {
			return [];
		}

		const files = fs.readdirSync(assignmentsDir).filter(f => f.endsWith('.md'));
		
		return files.map(file => {
			const filePath = path.join(assignmentsDir, file);
			const content = fs.readFileSync(filePath, 'utf8');
			const metadata = this.parseMetadata(content);

			return {
				id: file.replace('.md', ''),
				filename: file,
				title: metadata.title || file.replace('.md', ''),
				difficulty: metadata.difficulty || 'unknown',
				topic: metadata.topic || 'General',
				dueDate: metadata.dueDate || null,
				estimatedTime: metadata.estimatedTime ? parseInt(metadata.estimatedTime) : null
			};
		});
	}

	/**
	 * Get specific assignment content
	 */
	getAssignment(assignmentId: string): { id: string; metadata: Record<string, string>; content: string; highlight: string } | null {
		const filePath = path.join(this.deps.context.extensionPath, 'assignments', assignmentId + '.md');

		if (!fs.existsSync(filePath)) {
			return null;
		}

		const content = fs.readFileSync(filePath, 'utf8');
		const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
		const markdownContent = yamlMatch ? content.substring(yamlMatch[0].length).trim() : content;

		const metadata = this.parseMetadata(content);

		// Get highlight from student progress
		const studentId = this.deps.getStudentId();
		const assignmentProgress = this.deps.context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
		const studentProgress = assignmentProgress[studentId]?.[assignmentId];
		const highlight = studentProgress?.highlight || '';

		return {
			id: assignmentId,
			metadata,
			content: markdownContent,
			highlight
		};
	}

	/**
	 * Get assignment status for current student
	 */
	getAssignmentStatus(assignmentId?: string): Record<string, AssignmentStatus> | AssignmentStatus | null {
		const studentId = this.deps.getStudentId();
		const assignmentProgress = this.deps.context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
		const studentProgress = assignmentProgress[studentId] || {};

		if (assignmentId) {
			return studentProgress[assignmentId] || null;
		}

		return studentProgress;
	}

	/**
	 * Start an assignment
	 */
	async startAssignment(assignmentId: string): Promise<{ success: boolean; message: string }> {
		const studentId = this.deps.getStudentId();
		const assignmentProgress = this.deps.context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});

		if (!assignmentProgress[studentId]) {
			assignmentProgress[studentId] = {};
		}

		assignmentProgress[studentId][assignmentId] = {
			status: 'in-progress',
			startedAt: new Date().toISOString(),
			completedAt: null
		};

		await this.deps.context.globalState.update('assignmentProgress', assignmentProgress);

		if (this.deps.onAssignmentAction) {
			this.deps.onAssignmentAction('start', assignmentId);
		}

		return {
			success: true,
			message: `Started assignment: ${assignmentId}`
		};
	}

	/**
	 * Complete an assignment
	 */
	async completeAssignment(assignmentId: string): Promise<{ success: boolean; message: string }> {
		const studentId = this.deps.getStudentId();
		const assignmentProgress = this.deps.context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});

		if (!assignmentProgress[studentId]) {
			assignmentProgress[studentId] = {};
		}

		assignmentProgress[studentId][assignmentId] = {
			...assignmentProgress[studentId][assignmentId],
			status: 'completed',
			completedAt: new Date().toISOString()
		};

		await this.deps.context.globalState.update('assignmentProgress', assignmentProgress);

		if (this.deps.onProgressUpdate) {
			this.deps.onProgressUpdate('exercise');
		}

		if (this.deps.onAssignmentAction) {
			this.deps.onAssignmentAction('complete', assignmentId);
		}

		return {
			success: true,
			message: `Completed assignment: ${assignmentId}`
		};
	}

	/**
	 * Grade an assignment
	 */
	async gradeAssignment(assignmentId: string): Promise<{ success: boolean; message: string }> {
		const studentId = this.deps.getStudentId();
		const assignmentProgress = this.deps.context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});

		if (!assignmentProgress[studentId]) {
			assignmentProgress[studentId] = {};
		}

		assignmentProgress[studentId][assignmentId] = {
			...assignmentProgress[studentId][assignmentId],
			status: 'graded',
			gradedAt: new Date().toISOString()
		};

		await this.deps.context.globalState.update('assignmentProgress', assignmentProgress);

		if (this.deps.onAssignmentAction) {
			this.deps.onAssignmentAction('grade', assignmentId);
		}

		return {
			success: true,
			message: `Graded assignment: ${assignmentId}`
		};
	}

	/**
	 * Save highlight/notes for an assignment
	 */
	async saveHighlight(assignmentId: string, highlight: string): Promise<{ success: boolean; message: string }> {
		const studentId = this.deps.getStudentId();
		const assignmentProgress = this.deps.context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});

		if (!assignmentProgress[studentId]) {
			assignmentProgress[studentId] = {};
		}

		if (!assignmentProgress[studentId][assignmentId]) {
			assignmentProgress[studentId][assignmentId] = {};
		}

		assignmentProgress[studentId][assignmentId].highlight = highlight;
		assignmentProgress[studentId][assignmentId].highlightUpdatedAt = new Date().toISOString();

		await this.deps.context.globalState.update('assignmentProgress', assignmentProgress);

		console.log('[Highlight] Saved for assignment:', assignmentId, 'length:', highlight?.length || 0);

		return {
			success: true,
			message: 'Highlight saved'
		};
	}

	/**
	 * Delete an assignment (only if graded)
	 */
	async deleteAssignment(assignmentId: string): Promise<{ success: boolean; message: string }> {
		const studentId = this.deps.getStudentId();
		const filePath = path.join(this.deps.context.extensionPath, 'assignments', assignmentId + '.md');

		// Check if assignment exists and is graded
		const assignmentProgress = this.deps.context.globalState.get<Record<string, Record<string, any>>>('assignmentProgress', {});
		const studentProgress = assignmentProgress[studentId] || {};
		const assignmentStatus = studentProgress[assignmentId];

		if (!assignmentStatus || assignmentStatus.status !== 'graded') {
			return {
				success: false,
				message: 'Assignment must be graded before deletion'
			};
		}

		// Delete the assignment file
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
			console.log('[Assignment] Deleted file:', filePath);
		}

		// Remove from progress tracking
		if (assignmentProgress[studentId] && assignmentProgress[studentId][assignmentId]) {
			delete assignmentProgress[studentId][assignmentId];
			await this.deps.context.globalState.update('assignmentProgress', assignmentProgress);
		}

		return {
			success: true,
			message: 'Assignment deleted successfully'
		};
	}

	/**
	 * Parse YAML metadata from markdown file
	 */
	private parseMetadata(content: string): Record<string, string> {
		const metadata: Record<string, string> = {};
		const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

		if (yamlMatch) {
			const yamlContent = yamlMatch[1];
			yamlContent.split('\n').forEach((line: string) => {
				const [key, ...valueParts] = line.split(':');
				if (key && valueParts.length > 0) {
					const value = valueParts.join(':').trim();
					metadata[key.trim()] = value;
				}
			});
		}

		return metadata;
	}
}
