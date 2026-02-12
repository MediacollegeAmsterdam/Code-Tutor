import { StudentService } from '../../core/services/StudentService';
import { getSkillLevel, calculateAchievements } from '../../core/domain';
import type { StudentStats, ClassStats } from '../../core/types';

export interface EarlyWarning {
	studentId: string;
	message: string;
	severity: 'low' | 'medium' | 'high';
}

/**
 * TeacherStatsService - Consolidates teacher monitoring and statistics
 * 
 * Provides aggregated views of student progress, class-wide analytics,
 * and early warning detection for struggling students.
 */
export class TeacherStatsService {
	constructor(private studentService: StudentService) {}
	
	/**
	 * Get comprehensive statistics for all students
	 * Used by teacher dashboard for monitoring individual progress
	 */
	getAllStudentsStats(): StudentStats[] {
		const allStudentsData = this.studentService.loadStudentData();
		const metadata = this.studentService.loadStudentMetadata();
		const students: StudentStats[] = [];

		Object.entries(allStudentsData).forEach(([studentId, progressData]: [string, Record<string, number>]) => {
			const total = Object.values(progressData).reduce((a, b) => a + b, 0);
			const { level: skillLevel, emoji: skillEmoji } = getSkillLevel(total);
			const studentMeta = metadata[studentId] || { 
				name: `Student ${studentId.slice(0, 8)}`, 
				yearLevel: 2 
			};

			students.push({
				id: studentId,
				studentName: studentMeta.name,
				totalInteractions: total,
				skillLevel,
				skillEmoji,
				yearLevel: studentMeta.yearLevel,
				achievements: calculateAchievements(progressData),
				commandUsage: progressData,
				lastActive: new Date().toISOString(),
				engagementStatus: total > 0 ? 'active' : 'inactive'
			});
		});

		return students;
	}

	/**
	 * Calculate class-wide statistics for teacher overview
	 * Aggregates metrics across all students for class-level insights
	 */
	getClassStats(): ClassStats {
		const students = this.getAllStudentsStats();
		const totalInteractions = students.reduce((sum, s) => sum + s.totalInteractions, 0);
		const activeToday = students.filter(s => s.engagementStatus === 'active').length;
		const averageProgress = students.length > 0
			? Math.round((students.reduce((sum, s) => sum + s.totalInteractions, 0) / students.length / 10))
			: 0;

		// Aggregate command usage across class
		const commandFrequency: Record<string, number> = {};
		let totalCommandsUsed = 0;
		students.forEach(student => {
			Object.entries(student.commandUsage).forEach(([cmd, count]) => {
				commandFrequency[cmd] = (commandFrequency[cmd] || 0) + count;
				totalCommandsUsed += count;
			});
		});
		const avgCommandsPerStudent = students.length > 0 ? totalCommandsUsed / students.length : 0;

		// Year level breakdown
		const yearBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
		students.forEach(s => {
			yearBreakdown[s.yearLevel]++;
		});

		// Find struggling students
		const strugglingStudents = students
			.filter(s => s.totalInteractions < 10 || s.skillLevel === 'Beginner')
			.map(s => s.id);

		// Most used topics
		const topTopics = Object.entries(commandFrequency)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([topic]) => topic);

		return {
			totalStudents: students.length,
			activeToday,
			averageProgress,
			strugglingStudents,
			topTopics,
			commandFrequency,
			yearLevelBreakdown: yearBreakdown,
			totalCommandsUsed,
			avgCommandsPerStudent
		};
	}

	/**
	 * Generate early warnings for students showing concerning patterns
	 * Detects: No activity, low engagement, lack of progress despite effort
	 */
	getEarlyWarnings(): EarlyWarning[] {
		const students = this.getAllStudentsStats();
		const warnings: EarlyWarning[] = [];

		students.forEach(student => {
			if (student.totalInteractions === 0) {
				warnings.push({
					studentId: student.id,
					message: 'Geen activiteit gedetecteerd',
					severity: 'high'
				});
			} else if (student.totalInteractions < 5) {
				warnings.push({
					studentId: student.id,
					message: 'Lage betrokkenheid - slechts ' + student.totalInteractions + ' interacties',
					severity: 'medium'
				});
			} else if (student.skillLevel === 'Beginner' && student.totalInteractions > 20) {
				warnings.push({
					studentId: student.id,
					message: 'Veel oefening maar beperkte vooruitgang',
					severity: 'medium'
				});
			}
		});

		return warnings;
	}
}
