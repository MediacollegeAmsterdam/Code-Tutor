/**
 * Student & Progress Types
 * 
 * Types related to student profiles, progress tracking, and statistics
 * Part of Core Domain - Zero external dependencies
 */

/**
 * Student profile with year level and difficulty settings
 */
export interface UserProfile {
  studentId: string;
  studentName: string;
  yearLevel: 1 | 2 | 3 | 4;
  difficultyMultiplier: number;
  lastUpdated: string;
}

/**
 * Comprehensive statistics for a single student
 */
export interface StudentStats {
  id: string;
  studentName: string;
  totalInteractions: number;
  skillLevel: string;
  skillEmoji: string;
  yearLevel: number;
  achievements: string[];
  commandUsage: Record<string, number>;
  lastActive: string;
  engagementStatus: 'active' | 'inactive' | 'struggling';
  currentFocusArea?: string;
}

/**
 * Aggregated statistics for an entire class
 */
export interface ClassStats {
  totalStudents: number;
  activeToday: number;
  averageProgress: number;
  strugglingStudents: string[];
  topTopics: string[];
  commandFrequency: Record<string, number>;
  yearLevelBreakdown: Record<number, number>;
  totalCommandsUsed: number;
  avgCommandsPerStudent: number;
}

/**
 * Teacher dashboard data structure
 */
export interface TeacherDashboard {
  classStats: ClassStats;
  students: StudentStats[];
  warnings: Array<{ 
    studentId: string; 
    message: string; 
    severity: 'low' | 'medium' | 'high' 
  }>;
  lastUpdated: string;
}

/**
 * Student metadata stored separately from progress data
 */
export interface StudentMetadata {
  name: string;
  yearLevel: number;
}
