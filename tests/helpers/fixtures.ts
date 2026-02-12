/**
 * Test data fixtures and factories
 * Provides reusable test data for consistent testing
 */

/**
 * Sample student profile data
 */
export const mockStudentProfile = {
  studentId: 'test-student-123',
  studentName: 'Test Student',
  yearLevel: 2 as 1 | 2 | 3 | 4,
  difficultyMultiplier: 1.0,
  lastUpdated: '2026-02-10T00:00:00.000Z',
};

/**
 * Sample student progress data
 */
export const mockProgressData = {
  explain: 5,
  debug: 3,
  exercise: 10,
  quiz: 7,
  review: 2,
  refactor: 1,
  concept: 8,
  learn: 4,
  resources: 2,
  progress: 1,
};

/**
 * Sample student stats
 */
export const mockStudentStats = {
  id: 'test-student-123',
  studentName: 'Test Student',
  totalInteractions: 36,
  skillLevel: 'Intermediate',
  skillEmoji: '⭐',
  yearLevel: 2,
  achievements: ['👶 Eerste Stap', '🥉 Actieve Student'],
  commandUsage: mockProgressData,
  lastActive: '2026-02-10T00:00:00.000Z',
  engagementStatus: 'active' as 'active' | 'inactive' | 'struggling',
};

/**
 * Sample exercise configuration
 */
export const mockExerciseConfig = {
  topic: 'loops',
  yearLevel: 2 as 1 | 2 | 3 | 4,
  difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert',
  language: 'javascript',
};

/**
 * Sample exercise
 */
export const mockExercise = {
  id: 'exercise-001',
  title: 'Loop Practice',
  description: 'Practice using for loops',
  difficulty: 'intermediate',
  hints: ['Start with a for loop', 'Use array methods'],
  estimatedMinutes: 15,
  solution: 'for (let i = 0; i < arr.length; i++) { ... }',
  tests: [] as string[],
};

/**
 * Sample feedback session
 */
export const mockFeedbackSession = {
  attempts: 2,
  lastFeedbackLevel: 'tips' as 'initial' | 'tips' | 'example',
  previousFeedback: ['Try using a loop'],
  code: 'let sum = 0;',
  language: 'javascript',
};

/**
 * Sample learning path
 */
export const mockLearningPath = {
  id: 'path-001',
  name: 'JavaScript Fundamentals',
  icon: '📘',
  description: 'Learn JavaScript basics',
  difficulty: 'beginner',
  estimatedHours: 10,
  modules: [
    {
      id: 'module-001',
      name: 'Variables and Types',
      topics: ['variables', 'data types', 'operators'],
      exercises: 5,
    },
    {
      id: 'module-002',
      name: 'Control Flow',
      topics: ['if statements', 'loops', 'switch'],
      exercises: 8,
    },
  ],
};

/**
 * Sample educational slide
 */
export const mockEducationalSlide = {
  id: 'slide-001',
  title: 'Array Methods',
  concept: 'map, filter, reduce',
  code: 'const doubled = arr.map(x => x * 2);',
  language: 'javascript',
  explanation: 'The map method transforms each element',
  difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
  category: 'arrays',
  created: Date.now(),
  tags: ['arrays', 'functional-programming'],
};

/**
 * Sample slide collection
 */
export const mockSlideCollection = {
  slides: [mockEducationalSlide],
  lastUpdated: Date.now(),
};

/**
 * Sample resource
 */
export const mockResource = {
  id: 'resource-001',
  title: 'MDN JavaScript Guide',
  type: 'documentation',
  url: 'https://developer.mozilla.org/docs/Web/JavaScript/Guide',
  description: 'Comprehensive JavaScript documentation',
  difficulty: 'intermediate',
  tags: ['javascript', 'reference', 'documentation'],
};

/**
 * Factory: Create student profile with overrides
 */
export function createStudentProfile(overrides: Partial<typeof mockStudentProfile> = {}) {
  return {
    ...mockStudentProfile,
    ...overrides,
  };
}

/**
 * Factory: Create progress data with overrides
 */
export function createProgressData(overrides: Partial<typeof mockProgressData> = {}) {
  return {
    ...mockProgressData,
    ...overrides,
  };
}

/**
 * Factory: Create student stats with overrides
 */
export function createStudentStats(overrides: Partial<typeof mockStudentStats> = {}) {
  return {
    ...mockStudentStats,
    commandUsage: {
      ...mockProgressData,
      ...(overrides.commandUsage || {}),
    },
    ...overrides,
  };
}

/**
 * Factory: Create exercise config with overrides
 */
export function createExerciseConfig(overrides: Partial<typeof mockExerciseConfig> = {}) {
  return {
    ...mockExerciseConfig,
    ...overrides,
  };
}

/**
 * Factory: Create exercise with overrides
 */
export function createExercise(overrides: Partial<typeof mockExercise> = {}) {
  return {
    ...mockExercise,
    ...overrides,
  };
}

/**
 * Factory: Create feedback session with overrides
 */
export function createFeedbackSession(overrides: Partial<typeof mockFeedbackSession> = {}) {
  return {
    ...mockFeedbackSession,
    ...overrides,
  };
}
