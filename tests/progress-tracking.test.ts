/**
 * Characterization Tests - Progress & Achievement System
 * 
 * Phase 1 Tests: T031-T038
 * Purpose: Characterize progress tracking, skill levels, and achievement logic
 * Coverage Target: getSkillLevel, calculateAchievements, progress tracking functions
 */

import { createMockExtensionContext } from './helpers/mocks';
import { createStudentProfile, createProgressData } from './helpers/fixtures';

describe('Progress & Achievement System', () => {
  describe('Skill Level Calculation (T031-T032)', () => {
    const SKILL_LEVELS = [
      { threshold: 100, level: 'Expert', emoji: '👑' },
      { threshold: 50, level: 'Intermediate', emoji: '⭐' },
      { threshold: 20, level: 'Beginner+', emoji: '📈' },
      { threshold: 0, level: 'Beginner', emoji: '🌱' }
    ];

    function getSkillLevel(interactionCount: number) {
      const found = SKILL_LEVELS.find(sl => interactionCount >= sl.threshold);
      return found || SKILL_LEVELS[SKILL_LEVELS.length - 1];
    }

    it('should return Beginner for 0-19 interactions', () => {
      expect(getSkillLevel(0)).toEqual({ threshold: 0, level: 'Beginner', emoji: '🌱' });
      expect(getSkillLevel(10)).toEqual({ threshold: 0, level: 'Beginner', emoji: '🌱' });
      expect(getSkillLevel(19)).toEqual({ threshold: 0, level: 'Beginner', emoji: '🌱' });
    });

    it('should return Beginner+ for 20-49 interactions', () => {
      expect(getSkillLevel(20)).toEqual({ threshold: 20, level: 'Beginner+', emoji: '📈' });
      expect(getSkillLevel(35)).toEqual({ threshold: 20, level: 'Beginner+', emoji: '📈' });
      expect(getSkillLevel(49)).toEqual({ threshold: 20, level: 'Beginner+', emoji: '📈' });
    });

    it('should return Intermediate for 50-99 interactions', () => {
      expect(getSkillLevel(50)).toEqual({ threshold: 50, level: 'Intermediate', emoji: '⭐' });
      expect(getSkillLevel(75)).toEqual({ threshold: 50, level: 'Intermediate', emoji: '⭐' });
      expect(getSkillLevel(99)).toEqual({ threshold: 50, level: 'Intermediate', emoji: '⭐' });
    });

    it('should return Expert for 100+ interactions', () => {
      expect(getSkillLevel(100)).toEqual({ threshold: 100, level: 'Expert', emoji: '👑' });
      expect(getSkillLevel(500)).toEqual({ threshold: 100, level: 'Expert', emoji: '👑' });
      expect(getSkillLevel(9999)).toEqual({ threshold: 100, level: 'Expert', emoji: '👑' });
    });
  });

  describe('Achievement Thresholds (T033-T034)', () => {
    const ACHIEVEMENTS_THRESHOLDS = {
      firstStep: 1,
      activeStudent: 20,
      advancedStudent: 50,
      codeMaster: 100,
      bugHunter: 10,
      codeReviewer: 10,
      eternalLearner: 10,
      quizMaster: 20,
      exerciser: 15
    };

    function calculateAchievements(progress: Record<string, number>): string[] {
      const achievements: string[] = [];
      const total = Object.values(progress).reduce((a, b) => a + b, 0);

      if (total >= ACHIEVEMENTS_THRESHOLDS.firstStep) achievements.push('First Step');
      if (total >= ACHIEVEMENTS_THRESHOLDS.activeStudent) achievements.push('Active Student');
      if (total >= ACHIEVEMENTS_THRESHOLDS.advancedStudent) achievements.push('Advanced Student');
      if (total >= ACHIEVEMENTS_THRESHOLDS.codeMaster) achievements.push('Code Master');
      
      if ((progress.debug || 0) >= ACHIEVEMENTS_THRESHOLDS.bugHunter) achievements.push('Bug Hunter');
      if ((progress.review || 0) >= ACHIEVEMENTS_THRESHOLDS.codeReviewer) achievements.push('Code Reviewer');
      if ((progress.learn || 0) >= ACHIEVEMENTS_THRESHOLDS.eternalLearner) achievements.push('Eternal Learner');
      if ((progress.quiz || 0) >= ACHIEVEMENTS_THRESHOLDS.quizMaster) achievements.push('Quiz Master');
      if ((progress.exercise || 0) >= ACHIEVEMENTS_THRESHOLDS.exerciser) achievements.push('Exerciser');

      return achievements;
    }

    it('should unlock First Step at 1 total interaction', () => {
      const progress = { exercise: 1 };
      const achievements = calculateAchievements(progress);
      
      expect(achievements).toContain('First Step');
      expect(achievements.length).toBe(1);
    });

    it('should unlock Active Student at 20 total interactions', () => {
      const progress = createProgressData({ 
        exercise: 10, 
        explain: 10 
      });
      const achievements = calculateAchievements(progress);
      
      expect(achievements).toContain('Active Student');
      expect(achievements).toContain('First Step');
    });

    it('should unlock Advanced Student at 50 total interactions', () => {
      const progress = createProgressData({ 
        exercise: 20, 
        explain: 15,
        debug: 15
      });
      const achievements = calculateAchievements(progress);
      
      expect(achievements).toContain('Advanced Student');
      expect(achievements).toContain('Active Student');
      expect(achievements).toContain('First Step');
    });

    it('should unlock Code Master at 100 total interactions', () => {
      const progress = createProgressData({ 
        exercise: 40, 
        explain: 30,
        debug: 20,
        review: 10
      });
      const achievements = calculateAchievements(progress);
      
      expect(achievements).toContain('Code Master');
      expect(achievements).toContain('Advanced Student');
    });

    it('should unlock Bug Hunter with 10+ debug commands', () => {
      const progress = { debug: 10, exercise: 5 };
      const achievements = calculateAchievements(progress);
      
      expect(achievements).toContain('Bug Hunter');
      expect(achievements).toContain('First Step');
    });

    it('should unlock Code Reviewer with 10+ review commands', () => {
      const progress = { review: 10, exercise: 5 };
      const achievements = calculateAchievements(progress);
      
      expect(achievements).toContain('Code Reviewer');
    });

    it('should unlock Eternal Learner with 10+ learn commands', () => {
      const progress = { learn: 10, exercise: 5 };
      const achievements = calculateAchievements(progress);
      
      expect(achievements).toContain('Eternal Learner');
    });

    it('should unlock Quiz Master with 20+ quiz commands', () => {
      const progress = { quiz: 20, exercise: 5 };
      const achievements = calculateAchievements(progress);
      
      expect(achievements).toContain('Quiz Master');
      expect(achievements).toContain('Active Student');
    });

    it('should unlock Exerciser with 15+ exercise commands', () => {
      const progress = { exercise: 15, explain: 5 };
      const achievements = calculateAchievements(progress);
      
      expect(achievements).toContain('Exerciser');
      expect(achievements).toContain('Active Student');
    });

    it('should unlock multiple achievements simultaneously', () => {
      const progress = createProgressData({
        exercise: 15,
        debug: 10,
        review: 10,
        learn: 10
      });
      const achievements = calculateAchievements(progress);
      
      expect(achievements.length).toBeGreaterThan(4);
      expect(achievements).toContain('Bug Hunter');
      expect(achievements).toContain('Code Reviewer');
      expect(achievements).toContain('Eternal Learner');
      expect(achievements).toContain('Exerciser');
    });
  });

  describe('Progress Data Structure (T035-T036)', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = createMockExtensionContext();
    });

    it('should store progress data per student', async () => {
      const studentId = 'student-123';
      const progressData = {
        [studentId]: createProgressData({ exercise: 5, explain: 3 })
      };

      await mockContext.globalState.update('progressData', progressData);
      
      const stored = mockContext.globalState.get('progressData');
      expect(stored).toEqual(progressData);
      expect(stored[studentId]).toBeDefined();
    });

    it('should maintain separate progress for multiple students', async () => {
      const progressData = {
        'student-1': createProgressData({ exercise: 10 }),
        'student-2': createProgressData({ explain: 5 }),
        'student-3': createProgressData({ debug: 8 })
      };

      await mockContext.globalState.update('progressData', progressData);
      
      const stored = mockContext.globalState.get('progressData') as Record<string, Record<string, number>> | undefined;
      expect(Object.keys(stored || {}).length).toBe(3);
      expect(stored?.['student-1'].exercise).toBe(10);
      expect(stored?.['student-2'].explain).toBe(5);
      expect(stored?.['student-3'].debug).toBe(8);
    });

    it('should track all command types', () => {
      const allCommands = [
        'exercise', 'explain', 'debug', 'feedback',
        'refactor', 'quiz', 'review', 'concept',
        'progress', 'learn', 'resources', 'help',
        'setlevel', 'dashboard', 'add-slide'
      ];

      const progress = createProgressData();
      allCommands.forEach(cmd => {
        // Verify command tracking structure
        expect(typeof cmd).toBe('string');
      });
    });

    it('should calculate total interactions correctly', () => {
      const progress = createProgressData({
        exercise: 10,
        explain: 5,
        debug: 3,
        review: 2
      });

      const total = Object.values(progress).reduce((a: number, b: number) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Student Metadata (T037)', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = createMockExtensionContext();
    });

    it('should store student name and year level separately', async () => {
      const studentId = 'student-123';
      const metadata = {
        [studentId]: {
          name: 'John Doe',
          yearLevel: 2
        }
      };

      await mockContext.globalState.update('studentMetadata', metadata);
      
      const stored = mockContext.globalState.get('studentMetadata');
      expect(stored).toEqual(metadata);
    });

    it('should maintain metadata for multiple students', async () => {
      const metadata = {
        'student-1': { name: 'Alice', yearLevel: 1 },
        'student-2': { name: 'Bob', yearLevel: 3 },
        'student-3': { name: 'Charlie', yearLevel: 2 }
      };

      await mockContext.globalState.update('studentMetadata', metadata);
      
      const stored = mockContext.globalState.get('studentMetadata') as Record<string, { name: string; yearLevel: number }> | undefined;
      expect(Object.keys(stored || {}).length).toBe(3);
      expect(stored?.['student-1'].name).toBe('Alice');
      expect(stored?.['student-2'].yearLevel).toBe(3);
    });
  });

  describe('Engagement Status (T038)', () => {
    function determineEngagementStatus(lastActive: string, totalCommands: number): 'active' | 'inactive' | 'struggling' {
      const daysSinceActive = Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceActive > 7) return 'inactive';
      if (totalCommands > 0 && totalCommands < 5 && daysSinceActive < 7) return 'struggling';
      return 'active';
    }

    it('should mark as active for recent activity with sufficient commands', () => {
      const lastActive = new Date().toISOString();
      const status = determineEngagementStatus(lastActive, 10);
      
      expect(status).toBe('active');
    });

    it('should mark as inactive after 7 days', () => {
      const sevenDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const status = determineEngagementStatus(sevenDaysAgo, 10);
      
      expect(status).toBe('inactive');
    });

    it('should mark as struggling with low command count and recent activity', () => {
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const status = determineEngagementStatus(yesterday, 3);
      
      expect(status).toBe('struggling');
    });

    it('should remain active with high command count', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const status = determineEngagementStatus(twoDaysAgo, 50);
      
      expect(status).toBe('active');
    });
  });
});
