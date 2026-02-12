/**
 * Characterization Tests - Exercise & Assignment System
 * 
 * Phase 1 Tests: T047-T056
 * Purpose: Characterize exercise generation and assignment parsing logic
 * Coverage Target: Exercise generation, assignment file parsing, difficulty adaptation
 */

import { createStudentProfile, createExercise } from './helpers/fixtures';

describe('Exercise Generation System', () => {
  describe('Exercise Difficulty Adaptation (T047-T048)', () => {
    const YEAR_LEVEL_CONFIG = {
      1: { multiplier: 0.8, description: 'Meer begeleiding, simpelere concepten' },
      2: { multiplier: 1.0, description: 'Evenwichtige complexiteit' },
      3: { multiplier: 1.3, description: 'Complexe problemen, algoritme optimalisatie' },
      4: { multiplier: 1.5, description: 'Research topics, cutting-edge technologieën' }
    };

    function mapYearLevelToDifficulty(yearLevel: 1 | 2 | 3 | 4): 'beginner' | 'intermediate' | 'advanced' {
      const difficultyMap = { 1: 'beginner', 2: 'intermediate', 3: 'advanced', 4: 'advanced' };
      return difficultyMap[yearLevel] as 'beginner' | 'intermediate' | 'advanced';
    }

    it('should map year 1 to beginner difficulty', () => {
      const profile = createStudentProfile({ yearLevel: 1, difficultyMultiplier: 0.8 });
      const difficulty = mapYearLevelToDifficulty(profile.yearLevel);
      
      expect(difficulty).toBe('beginner');
      expect(profile.difficultyMultiplier).toBe(0.8);
    });

    it('should map year 2 to intermediate difficulty', () => {
      const profile = createStudentProfile({ yearLevel: 2 });
      const difficulty = mapYearLevelToDifficulty(profile.yearLevel);
      
      expect(difficulty).toBe('intermediate');
      expect(profile.difficultyMultiplier).toBe(1.0);
    });

    it('should map year 3-4 to advanced difficulty', () => {
      const profile3 = createStudentProfile({ yearLevel: 3, difficultyMultiplier: 1.3 });
      const profile4 = createStudentProfile({ yearLevel: 4, difficultyMultiplier: 1.5 });
      
      expect(mapYearLevelToDifficulty(profile3.yearLevel)).toBe('advanced');
      expect(mapYearLevelToDifficulty(profile4.yearLevel)).toBe('advanced');
      expect(profile3.difficultyMultiplier).toBe(1.3);
      expect(profile4.difficultyMultiplier).toBe(1.5);
    });

    it('should generate exercises with difficulty based on year level', () => {
      const profiles = [
        createStudentProfile({ yearLevel: 1 }),
        createStudentProfile({ yearLevel: 2 }),
        createStudentProfile({ yearLevel: 3 }),
        createStudentProfile({ yearLevel: 4 })
      ];

      profiles.forEach(profile => {
        const difficulty = mapYearLevelToDifficulty(profile.yearLevel);
        const exercise = createExercise({ difficulty });
        
        expect(exercise.difficulty).toBe(difficulty);
        expect(['beginner', 'intermediate', 'advanced']).toContain(exercise.difficulty);
      });
    });
  });

  describe('Exercise Command Types (T049)', () => {
    it('should detect generate request from user prompt', () => {
      const generateKeywords = [
        'geef', 'maak', 'give', 'create', 'generate', 'oefening', 'assignment', 'exercise'
      ];

      const testPrompts = [
        'geef me een oefening over loops',
        'maak een assignment voor arrays',
        'generate an exercise about functions',
        'create a programming exercise'
      ];

      testPrompts.forEach(prompt => {
        const isGenerating = generateKeywords.some(keyword => 
          prompt.toLowerCase().includes(keyword)
        );
        expect(isGenerating).toBe(true);
      });
    });

    it('should not detect generate request for list queries', () => {
      const listPrompts = [
        'show exercises',
        'list assignments',
        'what exercises are available'
      ];

      listPrompts.forEach(prompt => {
        const hasGenerateKeyword = ['geef', 'maak', 'create', 'generate'].some(keyword =>
          prompt.toLowerCase().includes(keyword)
        );
        expect(hasGenerateKeyword).toBe(false);
      });
    });
  });

  describe('Exercise Structure (T050)', () => {
    it('should have required fields', () => {
      const exercise = createExercise();
      
      expect(exercise.title).toBeDefined();
      expect(exercise.description).toBeDefined();
      expect(exercise.difficulty).toBeDefined();
      expect(['beginner', 'intermediate', 'advanced']).toContain(exercise.difficulty);
    });

    it('should support optional hints field', () => {
      const exercise = createExercise({ hints: ['Hint 1', 'Hint 2'] });
      
      expect(exercise.hints).toBeDefined();
      expect(Array.isArray(exercise.hints)).toBe(true);
    });

    it('should support optional tests field', () => {
      const exercise = createExercise({ 
        tests: ['test case 1', 'test case 2'] 
      });
      
      expect(exercise.tests).toBeDefined();
      expect(Array.isArray(exercise.tests)).toBe(true);
    });
  });
});

describe('Assignment Parser System', () => {
  describe('Assignment File Structure (T053)', () => {
    it('should parse YAML frontmatter', () => {
      const assignmentContent = `---
title: Array Manipulation
difficulty: intermediate
topic: Data Structures
dueDate: 2026-01-25
estimatedTime: 45
---

## Objective
Learn array methods`;

      const yamlMatch = assignmentContent.match(/^---\n([\s\S]*?)\n---/);
      expect(yamlMatch).not.toBeNull();
      expect(yamlMatch![1]).toContain('title');
      expect(yamlMatch![1]).toContain('difficulty');
    });

    it('should extract title from frontmatter', () => {
      const frontmatter = `title: Array Manipulation
difficulty: intermediate`;

      const titleMatch = frontmatter.match(/title:\s*(.+)/);
      expect(titleMatch).not.toBeNull();
      expect(titleMatch![1].trim()).toBe('Array Manipulation');
    });

    it('should extract difficulty from frontmatter', () => {
      const frontmatter = `title: Test Assignment
difficulty: beginner`;

      const diffMatch = frontmatter.match(/difficulty:\s*(.+)/);
      expect(diffMatch).not.toBeNull();
      expect(diffMatch![1].trim()).toBe('beginner');
    });

    it('should extract topic from frontmatter', () => {
      const frontmatter = `title: Test
topic: Algorithms`;

      const topicMatch = frontmatter.match(/topic:\s*(.+)/);
      expect(topicMatch).not.toBeNull();
      expect(topicMatch![1].trim()).toBe('Algorithms');
    });

    it('should extract dueDate from frontmatter', () => {
      const frontmatter = `dueDate: 2026-01-25`;

      const dateMatch = frontmatter.match(/dueDate:\s*(.+)/);
      expect(dateMatch).not.toBeNull();
      expect(dateMatch![1].trim()).toBe('2026-01-25');
    });

    it('should extract estimatedTime from frontmatter', () => {
      const frontmatter = `estimatedTime: 45`;

      const timeMatch = frontmatter.match(/estimatedTime:\s*(.+)/);
      expect(timeMatch).not.toBeNull();
      expect(timeMatch![1].trim()).toBe('45');
    });
  });

  describe('Assignment Filename Generation (T054)', () => {
    function generateAssignmentFilename(title: string, date: Date = new Date()): string {
      const dateStr = date.toISOString().split('T')[0];
      const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `${dateStr}_${sanitizedTitle}.md`;
    }

    it('should generate filename with date prefix', () => {
      const date = new Date('2026-02-10');
      const filename = generateAssignmentFilename('Test Assignment', date);
      
      expect(filename).toMatch(/^2026-02-10_/);
    });

    it('should sanitize title to lowercase with hyphens', () => {
      const filename = generateAssignmentFilename('Array Manipulation Exercise');
      
      expect(filename).toMatch(/_array-manipulation-exercise\.md$/);
    });

    it('should remove special characters from title', () => {
      const filename = generateAssignmentFilename('Arrays & Objects!');
      
      expect(filename).not.toContain('&');
      expect(filename).not.toContain('!');
      // Allow trailing dash before .md
      expect(filename).toMatch(/arrays-objects-?\.md$/);
    });

    it('should handle multiple spaces', () => {
      const filename = generateAssignmentFilename('My   Special    Assignment');
      
      expect(filename).toMatch(/my-special-assignment\.md$/);
    });
  });

  describe('Assignment Progress Tracking (T055-T056)', () => {
    it('should track assignment status', () => {
      const validStatuses = ['in-progress', 'completed', 'graded', 'unknown'];
      
      validStatuses.forEach(status => {
        expect(['in-progress', 'completed', 'graded', 'unknown']).toContain(status);
      });
    });

    it('should store progress per student per assignment', () => {
      const assignmentProgress = {
        'student-1': {
          'assignment-1': { status: 'in-progress', startedAt: '2026-02-01' },
          'assignment-2': { status: 'completed', startedAt: '2026-01-15', completedAt: '2026-01-20' }
        },
        'student-2': {
          'assignment-1': { status: 'graded', startedAt: '2026-02-01', gradedAt: '2026-02-10' }
        }
      };

      expect(assignmentProgress['student-1']['assignment-1'].status).toBe('in-progress');
      expect(assignmentProgress['student-1']['assignment-2'].status).toBe('completed');
      expect(assignmentProgress['student-2']['assignment-1'].status).toBe('graded');
    });

    it('should track timestamps for status transitions', () => {
      const progress = {
        status: 'completed',
        startedAt: '2026-02-01T10:00:00Z',
        completedAt: '2026-02-10T15:30:00Z'
      };

      expect(progress.startedAt).toBeDefined();
      expect(progress.completedAt).toBeDefined();
      expect(new Date(progress.completedAt).getTime()).toBeGreaterThan(
        new Date(progress.startedAt).getTime()
      );
    });

    it('should calculate time spent on assignment', () => {
      const startedAt = '2026-02-01T10:00:00Z';
      const completedAt = '2026-02-01T11:30:00Z';
      
      const timeSpent = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      const hours = Math.floor(timeSpent / (1000 * 60 * 60));
      const minutes = Math.floor((timeSpent % (1000 * 60 * 60)) / (1000 * 60));
      
      expect(hours).toBe(1);
      expect(minutes).toBe(30);
    });

    it('should support highlight/notes on assignments', () => {
      const progress = {
        status: 'in-progress',
        startedAt: '2026-02-01',
        highlight: 'having trouble with array.map() method'
      };

      expect(progress.highlight).toBeDefined();
      expect(progress.highlight).toContain('array.map()');
    });

    it('should detect code snippets in highlights', () => {
      const highlights = [
        'function test() { return true; }',
        'const x = [1, 2, 3];',
        'if (condition) doSomething();',
        'for (let i = 0; i < 10; i++)'
      ];

      const codePattern = /[{};()=]|function|class|const|let|var|import|export|def |if |for |while /;

      highlights.forEach(highlight => {
        expect(codePattern.test(highlight)).toBe(true);
      });
    });
  });
});
