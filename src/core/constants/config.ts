/**
 * Application Configuration Constants
 * 
 * System-wide configuration values
 * Part of Core Domain - Zero external dependencies
 */

import type { YearLevelConfig } from '../types';

/**
 * HTTP header presets for common response types
 */
export const COMMON_HEADERS = {
	json: { 
		'Content-Type': 'application/json', 
		'Access-Control-Allow-Origin': '*' 
	},
	sse: { 
		'Content-Type': 'text/event-stream', 
		'Cache-Control': 'no-cache', 
		'Connection': 'keep-alive', 
		'Access-Control-Allow-Origin': '*' 
	}
} as const;

/**
 * Server port configuration
 */
export const DASHBOARD_PORT = 51987;
export const PROMPT_SERVER_PORT = 3001;

/**
 * Year level configuration with difficulty multipliers and focus areas
 * Maps year levels (1-4) to pedagogical settings
 */
export const YEAR_LEVEL_CONFIG: Record<1 | 2 | 3 | 4, YearLevelConfig> = {
	1: {
		name: '1st Year (Beginner)',
		emoji: '🌱',
		multiplier: 0.8,
		description: 'Meer begeleiding, simpelere concepten, kleine oefeningen',
		focusAreas: ['basics', 'syntax', 'fundamentals']
	},
	2: {
		name: '2nd Year (Intermediate)',
		emoji: '📈',
		multiplier: 1.0,
		description: 'Evenwichtige complexiteit, praktische projecten, design patterns',
		focusAreas: ['design', 'optimization', 'best-practices']
	},
	3: {
		name: '3rd Year (Advanced)',
		emoji: '⭐',
		multiplier: 1.3,
		description: 'Complexe problemen, algoritme optimalisatie, system design',
		focusAreas: ['architecture', 'performance', 'advanced-concepts']
	},
	4: {
		name: '4th Year (Expert)',
		emoji: '👑',
		multiplier: 1.5,
		description: 'Research topics, cutting-edge technologieën, professionele challenges',
		focusAreas: ['research', 'innovation', 'specialization']
	}
} as const;
