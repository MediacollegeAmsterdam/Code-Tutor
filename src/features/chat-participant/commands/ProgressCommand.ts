import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';

/**
 * Progress Command - Display student statistics and achievements
 * 
 * Shows command usage history, achievements, and year level.
 * Priority: P2 (Core user feature)
 */
export class ProgressCommand implements ICommand {
	readonly name = 'progress';
	readonly description = 'Bekijk je voortgang en statistieken';
	readonly aliases = ['stats', 'profile'];
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		_token: vscode.CancellationToken
	): Promise<void> {
		const userProfile = context.getUserProfile() || {
			studentId: context.studentId,
			studentName: `Student ${context.studentId.slice(0, 8)}`,
			yearLevel: 2 as const,
			difficultyMultiplier: 1,
			lastUpdated: new Date().toISOString()
		};
		
		const allStudentsData = context.services.loadStudentData();
		const progress = allStudentsData[context.studentId] || {};
		const total = Object.values(progress).reduce((a: number, b: any) => a + (b as number), 0);
		
		stream.markdown(`## 📊 Jouw Voortgang\n\n`);
		stream.markdown(`**Totaal interacties:** ${total}\n\n`);
		
		for (const [cmd, count] of Object.entries(progress)) {
			stream.markdown(`- **${cmd}**: ${count} keer gebruikt\n`);
		}
		
		// Achievements
		if (total >= 50) {
			stream.markdown(`\n🏆 **Achievement unlocked:** Code Meester!\n`);
		} else if (total >= 25) {
			stream.markdown(`\n🥈 **Achievement unlocked:** Gevorderde Leerling!\n`);
		} else if (total >= 10) {
			stream.markdown(`\n🥉 **Achievement unlocked:** Actieve Student!\n`);
		}
		
		// Profile info
		if (userProfile) {
			const YEAR_LEVEL_CONFIG: Record<number, any> = {
				1: { name: 'Eerstejaars', emoji: '🌱', multiplier: 0.5 },
				2: { name: 'Tweedejaars', emoji: '🔨', multiplier: 1.0 },
				3: { name: 'Derdejaars', emoji: '⚡', multiplier: 1.5 },
				4: { name: 'Vierdejaars', emoji: '🚀', multiplier: 2.0 }
			};
			const config = YEAR_LEVEL_CONFIG[userProfile.yearLevel];
			stream.markdown(`\n---\n\n**📊 Jouw Profiel:**\n`);
			stream.markdown(`Jaar level: ${config.emoji} ${config.name}\n`);
			stream.markdown(`Difficulty: ${(config.multiplier * 100).toFixed(0)}%\n`);
		}
		
		stream.markdown(`\n💡 *Tip: Gebruik \`/dashboard\` voor een visueel overzicht!*`);
	}
}
