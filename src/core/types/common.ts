/**
 * Common Types
 * 
 * Shared types used across multiple domains
 * Part of Core Domain - Zero external dependencies
 */

/**
 * Code context with source and language
 */
export interface CodeContext {
  code: string;
  language: string;
}

/**
 * Live demo session state
 */
export interface LiveDemoState {
  active: boolean;
  title: string;
  language: string;
  code: string;
  startedAt: string;
  viewerCount: number;
}

/**
 * Assignment progress tracking
 */
export interface AssignmentProgress {
  status: 'in-progress' | 'completed' | 'graded' | 'unknown';
  startedAt?: string;
  completedAt?: string;
  gradedAt?: string;
  highlight?: string;
}

/**
 * Exercise structure
 */
export interface Exercise {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  hints?: string[];
  tests?: string[];
  estimatedMinutes?: number;
  solution?: string;
}
