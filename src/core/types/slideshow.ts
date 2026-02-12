/**
 * Slideshow Types
 * 
 * Types related to educational slideshows and code snippets
 * Part of Core Domain - Zero external dependencies
 */

/**
 * An educational slide containing code and explanation
 */
export interface EducationalSlide {
  id: string;
  title: string;
  concept: string;
  code: string;
  language: string;
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  created: number;
  tags: string[];
}

/**
 * A collection of educational slides with metadata
 */
export interface SlideCollection {
  slides: EducationalSlide[];
  lastUpdated: number;
}
