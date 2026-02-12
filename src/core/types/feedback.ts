/**
 * Feedback & Skill Level Types
 * 
 * Types related to feedback sessions, skill progression, and achievements
 * Part of Core Domain - Zero external dependencies
 */

/**
 * Progressive feedback session state
 */
export interface FeedbackSession {
  attempts: number;
  lastFeedbackLevel: 'initial' | 'tips' | 'example';
  previousFeedback: string[];
}

/**
 * Skill level configuration with threshold and display info
 */
export interface SkillLevelConfig {
  threshold: number;
  level: string;
  emoji: string;
}

/**
 * Year level configuration with difficulty multiplier
 */
export interface YearLevelConfig {
  name: string;
  emoji: string;
  multiplier: number;
  description: string;
  focusAreas: string[];
}

/**
 * Intelligent comment metadata for code annotation
 */
export interface IntelligentComment {
  line: number;
  comment: string;
  type: 'explain-logic' | 'best-practices' | 'potential-bugs' | 'optimization' | 'encouragement';
}
