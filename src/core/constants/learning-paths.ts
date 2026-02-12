/**
 * Learning Paths Data
 * 
 * Structured learning paths for different programming topics
 * Part of Core Domain - Zero external dependencies
 */

import type { LearningPath } from '../types';

/**
 * Curated learning paths with modules and exercises
 * Each path provides a structured journey through a specific topic
 */
export const LEARNING_PATHS: Record<string, LearningPath> = {
	'python-basics': {
		id: 'python-basics',
		name: 'Python Fundamentals',
		icon: '🐍',
		description: 'Leer de basis van Python programmeren',
		difficulty: 'Beginner',
		estimatedHours: 10,
		modules: [
			{ id: 'variables', name: 'Variabelen & Data Types', topics: ['int', 'str', 'float', 'bool', 'type casting'], exercises: 5 },
			{ id: 'control-flow', name: 'Control Flow', topics: ['if/else', 'for loops', 'while loops', 'break/continue'], exercises: 6 },
			{ id: 'functions', name: 'Functies', topics: ['def', 'parameters', 'return', 'scope', 'lambda'], exercises: 5 },
			{ id: 'data-structures', name: 'Data Structures', topics: ['lists', 'tuples', 'dictionaries', 'sets'], exercises: 8 },
			{ id: 'file-io', name: 'File I/O', topics: ['open', 'read', 'write', 'with statement'], exercises: 4 }
		]
	},
	'javascript-basics': {
		id: 'javascript-basics',
		name: 'JavaScript Essentials',
		icon: '🌐',
		description: 'Begin met JavaScript voor web development',
		difficulty: 'Beginner',
		estimatedHours: 12,
		modules: [
			{ id: 'syntax', name: 'Syntax & Variabelen', topics: ['let', 'const', 'var', 'data types'], exercises: 5 },
			{ id: 'functions-js', name: 'Functies', topics: ['function declaration', 'arrow functions', 'callbacks'], exercises: 6 },
			{ id: 'arrays', name: 'Arrays & Objects', topics: ['array methods', 'object literals', 'destructuring'], exercises: 7 },
			{ id: 'dom', name: 'DOM Manipulation', topics: ['querySelector', 'events', 'createElement'], exercises: 6 },
			{ id: 'async', name: 'Async JavaScript', topics: ['promises', 'async/await', 'fetch'], exercises: 5 }
		]
	},
	'algorithms': {
		id: 'algorithms',
		name: 'Algoritmen & Datastructuren',
		icon: '🧮',
		description: 'Leer denken als een programmeur',
		difficulty: 'Intermediate',
		estimatedHours: 20,
		modules: [
			{ id: 'complexity', name: 'Big O Notatie', topics: ['time complexity', 'space complexity', 'analysis'], exercises: 4 },
			{ id: 'sorting', name: 'Sorting Algorithms', topics: ['bubble sort', 'merge sort', 'quick sort'], exercises: 6 },
			{ id: 'searching', name: 'Searching', topics: ['linear search', 'binary search', 'hash tables'], exercises: 5 },
			{ id: 'recursion', name: 'Recursion', topics: ['base case', 'recursive case', 'call stack'], exercises: 6 },
			{ id: 'trees-graphs', name: 'Trees & Graphs', topics: ['binary trees', 'BFS', 'DFS'], exercises: 8 }
		]
	},
	'clean-code': {
		id: 'clean-code',
		name: 'Clean Code Principes',
		icon: '✨',
		description: 'Schrijf onderhoudbare en leesbare code',
		difficulty: 'Intermediate',
		estimatedHours: 8,
		modules: [
			{ id: 'naming', name: 'Naming Conventions', topics: ['variabelen', 'functies', 'klassen'], exercises: 4 },
			{ id: 'functions-clean', name: 'Clean Functions', topics: ['single responsibility', 'kleine functies', 'parameters'], exercises: 5 },
			{ id: 'comments', name: 'Comments & Documentation', topics: ['wanneer comments', 'docstrings', 'self-documenting'], exercises: 3 },
			{ id: 'refactoring', name: 'Refactoring', topics: ['code smells', 'DRY', 'KISS'], exercises: 6 }
		]
	},
	'git-basics': {
		id: 'git-basics',
		name: 'Git & Version Control',
		icon: '📚',
		description: 'Leer versiebeheer met Git',
		difficulty: 'Beginner',
		estimatedHours: 6,
		modules: [
			{ id: 'git-init', name: 'Getting Started', topics: ['init', 'clone', 'status'], exercises: 3 },
			{ id: 'commits', name: 'Commits', topics: ['add', 'commit', 'log', 'diff'], exercises: 4 },
			{ id: 'branches', name: 'Branching', topics: ['branch', 'checkout', 'merge'], exercises: 5 },
			{ id: 'remote', name: 'Remote Repositories', topics: ['push', 'pull', 'fetch', 'GitHub'], exercises: 4 }
		]
	}
};
