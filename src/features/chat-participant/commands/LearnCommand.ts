import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { LEARNING_PATHS } from '../../../core/constants';

/**
 * Learn Command - Display learning paths with progress tracking
 * 
 * Shows structured learning paths for various topics with module completion.
 * Priority: P2 (Core learning feature)
 */
export class LearnCommand implements ICommand {
	readonly name = 'learn';
	readonly description = 'Bekijk learning paths';
	readonly aliases = ['paths', 'learning'];
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		_token: vscode.CancellationToken
	): Promise<void> {
		const pathProgress = context.getLearningPathProgress();
		stream.markdown(`## 📚 Learning Paths\n\n`);
		stream.markdown(`Kies een leerpad om te beginnen met gestructureerd leren!\n\n`);
		
		for (const path of Object.values(LEARNING_PATHS)) {
			const prog = pathProgress[path.id] || {};
			const completedModules = path.modules.filter(m => prog[m.id]).length;
			const percent = Math.round((completedModules / path.modules.length) * 100);
			const progressBar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
			
			stream.markdown(`### ${path.icon} ${path.name}\n`);
			stream.markdown(`*${path.description}*\n\n`);
			stream.markdown(`- **Niveau:** ${path.difficulty}\n`);
			stream.markdown(`- **Geschatte tijd:** ${path.estimatedHours} uur\n`);
			stream.markdown(`- **Voortgang:** [${progressBar}] ${percent}% (${completedModules}/${path.modules.length} modules)\n\n`);
			
			stream.markdown(`**Modules:**\n`);
			path.modules.forEach((m, i) => {
				const done = prog[m.id] ? '✅' : '⬜';
				stream.markdown(`${i + 1}. ${done} ${m.name} - ${m.exercises} oefeningen\n`);
			});
			stream.markdown(`\n---\n\n`);
		}
		
		stream.markdown(`💡 *Vraag om een specifiek topic te leren, bijv: "Leg uit hoe for loops werken in Python"*`);
	}
}
