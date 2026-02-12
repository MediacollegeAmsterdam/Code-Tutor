/**
 * Resource Library Data
 * 
 * Curated external learning resources organized by category
 * Part of Core Domain - Zero external dependencies
 */

import type { ResourceCategory } from '../types';

/**
 * Curated learning resources organized by topic
 * Each category contains vetted external resources for self-directed learning
 */
export const RESOURCE_LIBRARY: Record<string, ResourceCategory> = {
	'javascript': {
		name: 'JavaScript',
		icon: '🌐',
		resources: [
			{
				id: 'mdn-js',
				title: 'MDN Web Docs - JavaScript',
				type: 'documentation',
				url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
				description: 'Compleet JavaScript reference en gidsen van Mozilla',
				difficulty: 'All Levels',
				tags: ['reference', 'web', 'comprehensive']
			},
			{
				id: 'eloquent-js',
				title: 'Eloquent JavaScript',
				type: 'book',
				url: 'https://eloquentjavascript.net/',
				description: 'Gratis online boek: moderne JavaScript van basis tot geavanceerd',
				difficulty: 'Beginner to Intermediate',
				tags: ['free', 'comprehensive', 'modern']
			},
			{
				id: 'js-info',
				title: 'The Modern JavaScript Tutorial',
				type: 'tutorials',
				url: 'https://javascript.info/',
				description: 'Stap-voor-stap introductie tot modern JavaScript',
				difficulty: 'Beginner',
				tags: ['modern', 'interactive', 'well-structured']
			},
			{
				id: 'freecodecamp-js',
				title: 'FreeCodeCamp JavaScript',
				type: 'video-course',
				url: 'https://www.freecodecamp.org/learn/javascript/',
				description: 'Gratis interactieve JavaScript cursus',
				difficulty: 'Beginner to Intermediate',
				tags: ['free', 'interactive', 'practical']
			}
		]
	},
	'algorithms': {
		name: 'Algoritmen & Datastructuren',
		icon: '🧮',
		resources: [
			{
				id: 'big-o-cheatsheet',
				title: 'Big O Cheat Sheet',
				type: 'reference',
				url: 'https://www.bigocheatsheet.com/',
				description: 'Visueel overzicht van Big O complexiteit',
				difficulty: 'All Levels',
				tags: ['reference', 'visual', 'complexity']
			},
			{
				id: 'visualgo',
				title: 'VisuAlgo',
				type: 'visualization',
				url: 'https://visualgo.net/',
				description: 'Animaties van algoritmen en datastructuren',
				difficulty: 'All Levels',
				tags: ['visualization', 'interactive', 'learning-tool']
			},
			{
				id: 'sort-visualizer',
				title: 'Sorting Algorithm Visualizer',
				type: 'tool',
				url: 'https://www.sortvisualizer.com/',
				description: 'Zie hoe verschillende sorteer algoritmen werken',
				difficulty: 'Beginner to Intermediate',
				tags: ['visualization', 'sorting', 'interactive']
			},
			{
				id: 'leetcode',
				title: 'LeetCode',
				type: 'practice',
				url: 'https://leetcode.com/',
				description: 'Programmeer oefeningen voor algoritmen en datastructuren',
				difficulty: 'All Levels',
				tags: ['practice', 'interview-prep', 'algorithms']
			}
		]
	},
	'web-development': {
		name: 'Web Development',
		icon: '🌍',
		resources: [
			{
				id: 'mdn-html',
				title: 'MDN - HTML Reference',
				type: 'documentation',
				url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
				description: 'Compleet HTML reference en best practices',
				difficulty: 'All Levels',
				tags: ['html', 'web', 'reference']
			},
			{
				id: 'mdn-css',
				title: 'MDN - CSS Reference',
				type: 'documentation',
				url: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
				description: 'Alles over CSS styling en layouts',
				difficulty: 'All Levels',
				tags: ['css', 'styling', 'reference']
			},
			{
				id: 'css-tricks',
				title: 'CSS-Tricks',
				type: 'tutorials',
				url: 'https://css-tricks.com/',
				description: 'In-depth CSS tutorials en tips van experts',
				difficulty: 'Beginner to Advanced',
				tags: ['css', 'tutorials', 'practical']
			},
			{
				id: 'flexbox-guide',
				title: 'A Complete Guide to Flexbox',
				type: 'guide',
				url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',
				description: 'Uitgebreide gids voor CSS Flexbox',
				difficulty: 'Beginner to Intermediate',
				tags: ['css', 'layout', 'guide']
			}
		]
	},
	'git': {
		name: 'Git & Version Control',
		icon: '📚',
		resources: [
			{
				id: 'git-book',
				title: 'Pro Git Book',
				type: 'book',
				url: 'https://git-scm.com/book/en/v2',
				description: 'Gratis compleet Git boek - de officiële bron',
				difficulty: 'All Levels',
				tags: ['free', 'official', 'comprehensive']
			},
			{
				id: 'git-docs',
				title: 'Git Documentation',
				type: 'documentation',
				url: 'https://git-scm.com/docs',
				description: 'Officiële Git command reference',
				difficulty: 'All Levels',
				tags: ['reference', 'official', 'commands']
			},
			{
				id: 'github-skills',
				title: 'GitHub Skills',
				type: 'interactive-course',
				url: 'https://skills.github.com/',
				description: 'Interactieve cursussen van GitHub met hands-on oefeningen',
				difficulty: 'Beginner to Intermediate',
				tags: ['github', 'interactive', 'free']
			},
			{
				id: 'git-flight-rules',
				title: 'Git Flight Rules',
				type: 'reference',
				url: 'https://github.com/k88hudson/git-flight-rules',
				description: 'Wat te doen als dingen fout gaan in Git - praktische oplossingen',
				difficulty: 'All Levels',
				tags: ['troubleshooting', 'practical', 'reference']
			}
		]
	},
	'clean-code': {
		name: 'Clean Code & Best Practices',
		icon: '✨',
		resources: [
			{
				id: 'clean-code-book',
				title: 'Clean Code by Robert C. Martin',
				type: 'book',
				url: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/',
				description: 'Het definitive boek over het schrijven van schone, onderhoudbare code',
				difficulty: 'Intermediate',
				tags: ['book', 'best-practices', 'professional']
			},
			{
				id: 'refactoring-guru',
				title: 'Refactoring Guru',
				type: 'tutorials',
				url: 'https://refactoring.guru/',
				description: 'Design patterns, code smells, refactoring techniques met voorbeelden',
				difficulty: 'Intermediate to Advanced',
				tags: ['patterns', 'refactoring', 'interactive']
			},
			{
				id: 'code-smells',
				title: 'Code Smell Detection',
				type: 'guide',
				url: 'https://refactoring.guru/refactoring/smells',
				description: 'Identificeer en fix code smells',
				difficulty: 'Intermediate',
				tags: ['code-quality', 'patterns', 'guide']
			},
			{
				id: 'solid-principles',
				title: 'SOLID Principles',
				type: 'guide',
				url: 'https://en.wikipedia.org/wiki/SOLID',
				description: 'Basis principes voor goed object-oriented design',
				difficulty: 'Intermediate',
				tags: ['principles', 'oop', 'design']
			}
		]
	},
	'debugging': {
		name: 'Debugging & Problem Solving',
		icon: '🐛',
		resources: [
			{
				id: 'debug-mindset',
				title: 'Debugging: The 9 Indispensable Rules',
				type: 'article',
				url: 'https://www.multithreaded.stitchfix.com/blog/2014/07/07/debugging-mindset/',
				description: 'Mentale framework voor effectief debuggen',
				difficulty: 'All Levels',
				tags: ['debugging', 'mindset', 'practical']
			},
			{
				id: 'rubber-duck',
				title: 'Rubber Duck Debugging',
				type: 'technique',
				url: 'https://en.wikipedia.org/wiki/Rubber_duck_debugging',
				description: 'Eenvoudige maar krachtige techniek om bugs te vinden',
				difficulty: 'Beginner',
				tags: ['debugging', 'technique', 'practical']
			},
			{
				id: 'browser-devtools',
				title: 'Chrome DevTools',
				type: 'tool-tutorial',
				url: 'https://developer.chrome.com/docs/devtools/',
				description: 'Leer browser debugging tools voor web development',
				difficulty: 'All Levels',
				tags: ['debugging', 'browser', 'tools']
			}
		]
	},
	'career': {
		name: 'Career & Professional Development',
		icon: '🚀',
		resources: [
			{
				id: 'stackoverflow',
				title: 'Stack Overflow',
				type: 'community',
				url: 'https://stackoverflow.com/',
				description: 'Grootste Q&A platform voor programmeren - leer van andermans vragen',
				difficulty: 'All Levels',
				tags: ['community', 'q-a', 'reference']
			},
			{
				id: 'github-explore',
				title: 'GitHub Explore',
				type: 'community',
				url: 'https://github.com/explore',
				description: 'Ontdek interessante projecten om van te leren',
				difficulty: 'All Levels',
				tags: ['community', 'projects', 'learning']
			},
			{
				id: 'dev-community',
				title: 'Dev.to',
				type: 'community',
				url: 'https://dev.to/',
				description: 'Community van developers die artikelen en kennis delen',
				difficulty: 'All Levels',
				tags: ['community', 'articles', 'networking']
			},
			{
				id: 'hacker-news',
				title: 'Hacker News',
				type: 'community',
				url: 'https://news.ycombinator.com/',
				description: 'Tech news en interessante artikelen voor developers',
				difficulty: 'All Levels',
				tags: ['news', 'community', 'industry-trends']
			}
		]
	}
};
