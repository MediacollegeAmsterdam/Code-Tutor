/**
 * Core Types - Barrel Export
 * 
 * Centralized export of all core domain types
 * Part of Core Domain - Zero external dependencies
 */

// Learning domain
export type {
  Module,
  LearningPath,
  Resource,
  ResourceCategory,
} from './learning';

// Student & progress domain
export type {
  UserProfile,
  StudentStats,
  ClassStats,
  TeacherDashboard,
  StudentMetadata,
} from './student';

// Feedback & skill domain
export type {
  FeedbackSession,
  SkillLevelConfig,
  YearLevelConfig,
  IntelligentComment,
} from './feedback';

// Slideshow domain
export type {
  EducationalSlide,
  SlideCollection,
} from './slideshow';

// Common types
export type {
  CodeContext,
  LiveDemoState,
  AssignmentProgress,
  Exercise,
} from './common';
