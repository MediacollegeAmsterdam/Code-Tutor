import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';

/**
 * Help Command - List all available commands with descriptions
 * 
 * Provides command discovery and usage guidance.
 * Priority: P2 (Essential but simple)
 */
export class HelpCommand implements ICommand {
	readonly name = 'help';
	readonly description = 'Toon alle beschikbare commando\'s';
	readonly aliases = ['?', 'commands'];
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		_token: vscode.CancellationToken
	): Promise<void> {
		stream.markdown(`## 📖 Code Tutor Commando's\n\n`);
		stream.markdown(`**📚 Leren:**\n`);
		stream.markdown(`- \`/explain\` - Concepten uitleggen\n`);
		stream.markdown(`- \`/exercise\` - Oefeningen genereren\n`);
		stream.markdown(`- \`/learn\` - Learning paths\n`);
		stream.markdown(`- \`/concept\` - Diep duiken in concepten\n`);
		stream.markdown(`- \`/add-slide\` - Code toevoegen aan slideshow\n\n`);
		
		stream.markdown(`**🔧 Development:**\n`);
		stream.markdown(`- \`/debug\` - Debug hulp\n`);
		stream.markdown(`- \`/review\` - Code review\n`);
		stream.markdown(`- \`/refactor\` - Code verbeteren\n`);
		stream.markdown(`- \`/feedback\` - Progressieve feedback\n\n`);
		
		stream.markdown(`**📊 Voortgang:**\n`);
		stream.markdown(`- \`/progress\` - Voortgang bekijken\n`);
		stream.markdown(`- \`/dashboard\` - Visueel dashboard\n`);
		stream.markdown(`- \`/setlevel\` - Jaar level instellen (1-4)\n\n`);
		
		stream.markdown(`**📖 Resources:**\n`);
		stream.markdown(`- \`/resources\` - Resource library\n`);
		stream.markdown(`- \`/quiz\` - Quiz jezelf\n\n`);
		
		const userProfile = context.getUserProfile();
		if (userProfile) {
			const YEAR_LEVEL_CONFIG: Record<number, any> = {
				1: { name: 'Eerstejaars', emoji: '🌱' },
				2: { name: 'Tweedejaars', emoji: '🔨' },
				3: { name: 'Derdejaars', emoji: '⚡' },
				4: { name: 'Vierdejaars', emoji: '🚀' }
			};
			const config = YEAR_LEVEL_CONFIG[userProfile.yearLevel];
			stream.markdown(`**Jouw profiel:** ${config.emoji} ${config.name}\n`);
		} else {
			stream.markdown(`💡 Tip: Zet je jaar level met \`/setlevel 1\` (of 2, 3, 4) voor beter aangepaste hulp!\n`);
		}
	}
}
