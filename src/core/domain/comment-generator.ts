/**
 * Intelligent Comments Domain Logic
 * 
 * Pure functions for generating code comments and previews
 * Part of Core Domain - Zero external dependencies
 */

import type { IntelligentComment } from '../types';

/**
 * Generate intelligent comments for code
 * Analyzes code patterns and provides context-aware feedback
 * 
 * @param code - Source code to analyze
 * @param language - Programming language
 * @param commentTypes - Types of comments to generate
 * @returns Array of intelligent comments with line numbers
 */
export async function generateIntelligentComments(
	code: string,
	language: string,
	commentTypes: string[]
): Promise<IntelligentComment[]> {
	const comments: IntelligentComment[] = [];
	const lines = code.split('\n');

	// Comment prefix based on language
	const commentPrefix = ['python', 'ruby', 'shell', 'bash'].includes(language) ? '# ' : '// ';
	const aiTag = '[AI] ';

	lines.forEach((line, index) => {
		const trimmedLine = line.trim();

		// Skip empty lines and existing comments
		if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith('/*')) {
			return;
		}

		// Explain Logic comments
		if (commentTypes.includes('explain-logic')) {
			// For loop explanation
			if (trimmedLine.match(/for\s*\(/i)) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}📘 This loop iterates through a collection. Make sure the condition will eventually be false!`,
					type: 'explain-logic'
				});
			}
			// Function explanation
			if (trimmedLine.match(/function\s+\w+|const\s+\w+\s*=\s*(\(|async)/)) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}📘 Function definition - consider what inputs it needs and what it should return.`,
					type: 'explain-logic'
				});
			}
			// Conditional explanation
			if (trimmedLine.match(/if\s*\(/i) && !trimmedLine.match(/else\s+if/i)) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}📘 Conditional check - the code inside runs only when this condition is true.`,
					type: 'explain-logic'
				});
			}
		}

		// Best Practices comments
		if (commentTypes.includes('best-practices')) {
			// var usage
			if (trimmedLine.match(/\bvar\s+/)) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}✨ Best Practice: Consider using 'const' or 'let' instead of 'var' for better scoping.`,
					type: 'best-practices'
				});
			}
			// console.log in production code
			if (trimmedLine.match(/console\.(log|debug|info)/)) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}✨ Best Practice: Remove or comment out console statements before production.`,
					type: 'best-practices'
				});
			}
			// Magic numbers
			if (trimmedLine.match(/[=<>]\s*\d{2,}/) && !trimmedLine.match(/[=<>]\s*(0|1|10|100|1000)\s/)) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}✨ Best Practice: Consider using a named constant instead of this "magic number".`,
					type: 'best-practices'
				});
			}
		}

		// Potential Bugs comments
		if (commentTypes.includes('potential-bugs')) {
			// == instead of ===
			if (trimmedLine.match(/[^=!]==[^=]/)) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}🐛 Potential Bug: Use '===' for strict equality comparison to avoid type coercion issues.`,
					type: 'potential-bugs'
				});
			}
			// Missing error handling
			if (trimmedLine.match(/\.then\(/) && !code.includes('.catch(')) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}🐛 Potential Bug: Consider adding error handling with .catch() for this Promise.`,
					type: 'potential-bugs'
				});
			}
		}

		// Optimization comments
		if (commentTypes.includes('optimization')) {
			// Nested loops
			if (trimmedLine.match(/for\s*\(/) && lines.slice(Math.max(0, index - 5), index).some(l => l.includes('for'))) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}⚡ Optimization: Nested loops can be slow (O(n²)). Consider if there's a more efficient approach.`,
					type: 'optimization'
				});
			}
		}

		// Encouragement comments
		if (commentTypes.includes('encouragement')) {
			// Good variable naming
			if (trimmedLine.match(/const\s+(is|has|should|can|will)\w+\s*=/)) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}💪 Great job! Using descriptive boolean variable names makes code much more readable!`,
					type: 'encouragement'
				});
			}
			// Using modern syntax
			if (trimmedLine.match(/=>\s*{|\.map\(|\.filter\(|\.reduce\(/)) {
				comments.push({
					line: index,
					comment: `${commentPrefix}${aiTag}💪 Nice use of modern JavaScript features! Keep it up!`,
					type: 'encouragement'
				});
			}
		}
	});

	return comments;
}

/**
 * Generate a preview of code with comments inserted
 * Merges intelligent comments with original code at appropriate line positions
 * 
 * @param code - Original source code
 * @param comments - Intelligent comments to insert
 * @returns Code with comments inserted
 */
export function generateCommentPreview(code: string, comments: IntelligentComment[]): string {
	const lines = code.split('\n');
	const result: string[] = [];

	// Sort by line number
	const sortedComments = [...comments].sort((a, b) => a.line - b.line);
	let commentIndex = 0;

	lines.forEach((line, index) => {
		// Add any comments for this line
		while (commentIndex < sortedComments.length && sortedComments[commentIndex].line === index) {
			const indentation = line.match(/^\s*/)?.[0] || '';
			result.push(indentation + sortedComments[commentIndex].comment);
			commentIndex++;
		}
		result.push(line);
	});

	return result.join('\n');
}
