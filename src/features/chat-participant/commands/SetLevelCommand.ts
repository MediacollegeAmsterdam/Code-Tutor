import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';

/**
 * SetLevel Command - Configure student year level (1-4)
 * 
 * Adjusts difficulty multiplier and focus areas based on year level.
 * Priority: P1 (Core functionality)
 */
export class SetLevelCommand implements ICommand {
	readonly name = 'setlevel';
	readonly description = 'Stel je jaar level in (1-4) voor aangepaste hulp';
	readonly aliases = ['level', 'yearlevel'];
	
	private readonly YEAR_LEVEL_CONFIG = {
		1: {
			name: 'Eerstejaars',
			emoji: '🌱',
			description: 'Focus op fundamentals en basis concepten',
			focusAreas: ['Variables en data types', 'Control flow (if/else, loops)', 'Functions en parameters', 'Basic debugging'],
			multiplier: 0.5
		},
		2: {
			name: 'Tweedejaars',
			emoji: '🔨',
			description: 'Focus op praktische toepassingen en projecten',
			focusAreas: ['OOP basics', 'Collections en data structures', 'File I/O', 'Basic algorithms', 'Testing'],
			multiplier: 1.0
		},
		3: {
			name: 'Derdejaars',
			emoji: '⚡',
			description: 'Focus op advanced patterns en system design',
			focusAreas: ['Design patterns', 'API development', 'Databases', 'Async programming', 'Performance'],
			multiplier: 1.5
		},
		4: {
			name: 'Vierdejaars',
			emoji: '🚀',
			description: 'Focus op specialization en research',
			focusAreas: ['System architecture', 'Advanced algorithms', 'Specialization topics', 'Research methods', 'Innovation'],
			multiplier: 2.0
		}
	};
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		_token: vscode.CancellationToken
	): Promise<void> {
		const yearPrompt = context.request.prompt.toLowerCase().trim();
		
		let yearLevel: 1 | 2 | 3 | 4 = 2; // default
		
		// First check for direct numbers 1-4
		const numberMatch = yearPrompt.match(/\b[1-4]\b/);
		if (numberMatch) {
			yearLevel = parseInt(numberMatch[0]) as 1 | 2 | 3 | 4;
		}
		// Then check for text keywords
		else if (yearPrompt.includes('first') || yearPrompt.includes('eerstejaars')) {
			yearLevel = 1;
		} else if (yearPrompt.includes('second') || yearPrompt.includes('tweedejaars')) {
			yearLevel = 2;
		} else if (yearPrompt.includes('third') || yearPrompt.includes('derdejaars')) {
			yearLevel = 3;
		} else if (yearPrompt.includes('fourth') || yearPrompt.includes('vierdejaars')) {
			yearLevel = 4;
		}
		
		const userProfile = {
			studentId: context.studentId,
			studentName: `Student ${context.studentId.slice(0, 8)}`,
			yearLevel,
			difficultyMultiplier: this.YEAR_LEVEL_CONFIG[yearLevel].multiplier,
			lastUpdated: new Date().toISOString()
		};
		
		await context.updateUserProfile(userProfile);
		
		// Also save the updated metadata to file so dashboard sees it
		const metadata = context.services.loadStudentMetadata();
		metadata[context.studentId] = {
			name: userProfile.studentName,
			yearLevel: yearLevel
		};
		context.services.saveStudentMetadata(metadata);
		
		const config = this.YEAR_LEVEL_CONFIG[yearLevel];
		stream.markdown(`## ${config.emoji} Jaar Level Ingesteld!\n\n`);
		stream.markdown(`**${config.name}**\n\n`);
		stream.markdown(`${config.description}\n\n`);
		stream.markdown(`Focus gebieden:\n`);
		config.focusAreas.forEach(area => {
			stream.markdown(`- ${area}\n`);
		});
		stream.markdown(`\nJouw difficulty multiplier: **${(config.multiplier * 100).toFixed(0)}%**\n`);
		stream.markdown(`\nDit past de oefeningen, uitlegingen en feedback aan je niveau aan!\n`);
		
		context.trackProgress('setlevel');
		
		// Broadcast the updated user profile so dashboard updates
		context.services.broadcastSSEUpdate({
			userProfile: userProfile,
			type: 'profileUpdate'
		});
	}
}
