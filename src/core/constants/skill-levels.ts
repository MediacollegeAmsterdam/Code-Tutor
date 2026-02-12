/**
 * Skill Level Configuration
 * 
 * Constants related to skill progression and achievements
 * Part of Core Domain - Zero external dependencies
 */

import type { SkillLevelConfig } from '../types';

/**
 * Skill level thresholds and display configuration
 * Sorted in descending order by threshold for efficient lookup
 */
export const SKILL_LEVELS: SkillLevelConfig[] = [
	{ threshold: 100, level: 'Expert', emoji: '👑' },
	{ threshold: 50, level: 'Intermediate', emoji: '⭐' },
	{ threshold: 20, level: 'Beginner+', emoji: '📈' },
	{ threshold: 0, level: 'Beginner', emoji: '🌱' }
];

/**
 * Achievement unlock thresholds
 * Defines the number of actions required to unlock each achievement
 */
export const ACHIEVEMENTS_THRESHOLDS = {
	firstStep: 1,
	activeStudent: 20,
	advancedStudent: 50,
	codeMaster: 100,
	bugHunter: 10,
	codeReviewer: 10,
	eternalLearner: 10,
	quizMaster: 20,
	exerciser: 15
} as const;
