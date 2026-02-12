/**
 * Learning Domain Types
 * 
 * Types related to learning paths, modules, and educational resources
 * Part of Core Domain - Zero external dependencies
 */

/**
 * A learning module within a learning path
 */
export interface Module {
  id: string;
  name: string;
  topics: string[];
  exercises: number;
}

/**
 * A structured learning path containing multiple modules
 */
export interface LearningPath {
  id: string;
  name: string;
  icon: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  modules: Module[];
}

/**
 * An external educational resource (tutorial, documentation, etc.)
 */
export interface Resource {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  difficulty: string;
  tags: string[];
}

/**
 * A category grouping related resources
 */
export interface ResourceCategory {
  name: string;
  icon: string;
  resources: Resource[];
}
