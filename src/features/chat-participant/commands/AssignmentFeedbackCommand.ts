import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';

/**
 * Assignment Feedback Command - Display rich assignment feedback with progress tracking
 * 
 * Shows detailed statistics, motivational feedback, and contextual help for all assignments.
 * Priority: P1 (Critical user-facing feature - most complex command)
 */
export class AssignmentFeedbackCommand implements ICommand {
	readonly name = 'assignment-feedback';
	readonly description = 'Bekijk feedback over je opdrachten';
	readonly aliases = ['assignments', 'assignment'];
	
	// Global reference to last assignment action for notifications
	private lastAssignmentAction: { action: string; assignmentId: string; timestamp: string } | undefined;
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		_token: vscode.CancellationToken
	): Promise<void> {
		const assignmentProgress = context.getAssignmentProgress();
		
		// Check if student has any assignments
		if (Object.keys(assignmentProgress).length === 0) {
			stream.markdown(`## 📋 Assignment Feedback\n\n`);
			stream.markdown(`> 💡 **Geen opdrachten gevonden**\n>\n`);
			stream.markdown(`> Je hebt nog geen opdrachten gestart. Ga naar het dashboard om te beginnen!\n\n`);
			stream.markdown(`---\n\n`);
			stream.markdown(`### 🚀 Aan de Slag\n\n`);
			stream.markdown(`1. Open het **Dashboard** via \`@tutor /dashboard\`\n`);
			stream.markdown(`2. Kies een opdracht die bij je niveau past\n`);
			stream.markdown(`3. Klik op **Start** om te beginnen\n\n`);
			stream.markdown(`*Succes met je eerste opdracht!* 🎯\n`);
			return;
		}
		
		// Calculate statistics
		const totalAssignments = Object.keys(assignmentProgress).length;
		const completedCount = Object.values(assignmentProgress).filter((p: any) => p.status === 'completed' || p.status === 'graded').length;
		const gradedCount = Object.values(assignmentProgress).filter((p: any) => p.status === 'graded').length;
		const inProgressCount = Object.values(assignmentProgress).filter((p: any) => p.status === 'in-progress').length;
		const completionPercent = Math.round((completedCount / totalAssignments) * 100);
		
		// Create visual progress bar
		const progressBarLength = 10;
		const filledBlocks = Math.round((completionPercent / 100) * progressBarLength);
		const emptyBlocks = progressBarLength - filledBlocks;
		const progressBar = '🟩'.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);
		
		// Show feedback about the most recent action if available
		const storedAction = context.extensionContext.globalState.get<{ action: string; assignmentId: string; timestamp: string }>('lastAssignmentAction');
		const currentAction = this.lastAssignmentAction || storedAction;
		
		if (currentAction) {
			const actionConfig: Record<string, { emoji: string; title: string; message: string; tip: string }> = {
				'start': {
					emoji: '🚀',
					title: 'Je bent begonnen!',
					message: 'Goed gedaan dat je aan de slag bent gegaan! Dit is de belangrijkste stap.',
					tip: 'Tip: Lees de opdracht goed door en verdeel het werk in kleine stappen.'
				},
				'submit': {
					emoji: '📤',
					title: 'Ingediend!',
					message: 'Geweldig dat je je opdracht hebt ingediend! Je werk wordt nu bekeken.',
					tip: 'Tip: Gebruik de wachttijd om je code nog eens te reviewen.'
				},
				'complete': {
					emoji: '🎉',
					title: 'Voltooid!',
					message: 'Fantastisch! Je hebt deze opdracht afgerond! Dit is echte vooruitgang.',
					tip: 'Tip: Vraag om een beoordeling via de Grade knop voor feedback.'
				},
				'grade': {
					emoji: '🏆',
					title: 'Beoordeeld!',
					message: 'Jouw opdracht is beoordeeld! Controleer de feedback hieronder.',
					tip: 'Tip: Pas de geleerde lessen toe op je volgende opdracht.'
				}
			};
			
			const config = actionConfig[currentAction.action];
			if (config) {
				stream.markdown(`## ${config.emoji} ${config.title}\n\n`);
				stream.markdown(`> **${config.message}**\n>\n`);
				stream.markdown(`> 💡 *${config.tip}*\n\n`);
				stream.markdown(`---\n\n`);
			}
			
			// Clear the stored action after showing it
			await context.extensionContext.globalState.update('lastAssignmentAction', undefined);
		}
		
		// Statistics Overview
		stream.markdown(`## 📊 Jouw Statistieken\n\n`);
		stream.markdown(`| Categorie | Aantal | Status |\n`);
		stream.markdown(`|-----------|--------|--------|\n`);
		stream.markdown(`| 📝 Totaal Opdrachten | **${totalAssignments}** | - |\n`);
		stream.markdown(`| ⏳ In Progress | **${inProgressCount}** | ${inProgressCount > 0 ? '🔄 Actief' : '✨ Geen'} |\n`);
		stream.markdown(`| ✅ Voltooid | **${completedCount}** | ${completedCount > 0 ? '👍 Goed bezig!' : '🎯 Begin nu'} |\n`);
		stream.markdown(`| 🏆 Beoordeeld | **${gradedCount}** | ${gradedCount > 0 ? '⭐ Excellent!' : '📋 Vraag feedback'} |\n\n`);
		
		// Visual Progress
		stream.markdown(`### 📈 Voortgang\n\n`);
		stream.markdown(`**Voltooiing:** ${progressBar} **${completionPercent}%**\n\n`);
		
		// Motivational message based on progress
		if (completionPercent === 100) {
			stream.markdown(`> 🌟 **PERFECTIE!** Je hebt alle opdrachten voltooid! Je bent een ster! 🌟\n\n`);
		} else if (completionPercent >= 75) {
			stream.markdown(`> 🔥 **Bijna daar!** Nog even doorzetten, je bent er bijna!\n\n`);
		} else if (completionPercent >= 50) {
			stream.markdown(`> 💪 **Halverwege!** Geweldig tempo, blijf zo doorgaan!\n\n`);
		} else if (completionPercent >= 25) {
			stream.markdown(`> 🌱 **Goede start!** Je bent op de goede weg!\n\n`);
		} else {
			stream.markdown(`> 🚀 **Begin je reis!** Elke opdracht brengt je dichter bij meesterschap!\n\n`);
		}
		
		stream.markdown(`---\n\n`);
		stream.markdown(`## 📋 Opdrachten Overzicht\n\n`);
		
		// Get assignment data to show titles with rich formatting
		try {
			const assignmentsDir = path.join(context.extensionContext.extensionPath, 'assignments');
			const assignmentEntries = Object.entries(assignmentProgress);
			
			for (const [assignmentId, progress] of assignmentEntries) {
				const filePath = path.join(assignmentsDir, assignmentId + '.md');
				if (fs.existsSync(filePath)) {
					const content = fs.readFileSync(filePath, 'utf8');
					const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
					let title = assignmentId;
					let difficulty = 'intermediate';
					let topic = '';
					
					if (yamlMatch) {
						const titleMatch = yamlMatch[1].match(/title:\s*(.+)/);
						const diffMatch = yamlMatch[1].match(/difficulty:\s*(.+)/);
						const topicMatch = yamlMatch[1].match(/topic:\s*(.+)/);
						if (titleMatch) title = titleMatch[1].trim();
						if (diffMatch) difficulty = diffMatch[1].trim();
						if (topicMatch) topic = topicMatch[1].trim();
					}
					
					const status = (progress as any).status || 'unknown';
					const statusConfig: Record<string, { emoji: string; label: string; color: string }> = {
						'in-progress': { emoji: '⏳', label: 'In Progress', color: '🟡' },
						'completed': { emoji: '✅', label: 'Voltooid', color: '🟢' },
						'graded': { emoji: '🏆', label: 'Beoordeeld', color: '🟣' },
						'unknown': { emoji: '📋', label: 'Onbekend', color: '⚪' }
					};
					
					const difficultyConfig: Record<string, { emoji: string; label: string }> = {
						'beginner': { emoji: '🌱', label: 'Beginner' },
						'intermediate': { emoji: '🌿', label: 'Intermediate' },
						'advanced': { emoji: '🌳', label: 'Advanced' }
					};
					
					const sConfig = statusConfig[status] || statusConfig['unknown'];
					const dConfig = difficultyConfig[difficulty] || difficultyConfig['intermediate'];
					
					// Rich assignment card
					stream.markdown(`### ${sConfig.emoji} ${title}\n\n`);
					stream.markdown(`| Info | Details |\n`);
					stream.markdown(`|------|--------|\n`);
					stream.markdown(`| Status | ${sConfig.color} **${sConfig.label}** |\n`);
					stream.markdown(`| Difficulty | ${dConfig.emoji} ${dConfig.label} |\n`);
					if (topic) stream.markdown(`| Topic | 📚 ${topic} |\n`);
					
					// Time information
					const startedAt = (progress as any).startedAt;
					const completedAt = (progress as any).completedAt;
					const gradedAt = (progress as any).gradedAt;
					
					if (startedAt) {
						const startDate = new Date(startedAt);
						stream.markdown(`| Gestart | 📅 ${startDate.toLocaleDateString('nl-NL')} om ${startDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} |\n`);
					}
					if (completedAt) {
						const completeDate = new Date(completedAt);
						stream.markdown(`| Voltooid | 📅 ${completeDate.toLocaleDateString('nl-NL')} om ${completeDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} |\n`);
						
						// Calculate time spent
						if (startedAt) {
							const timeSpent = new Date(completedAt).getTime() - new Date(startedAt).getTime();
							const hours = Math.floor(timeSpent / (1000 * 60 * 60));
							const minutes = Math.floor((timeSpent % (1000 * 60 * 60)) / (1000 * 60));
							if (hours > 0) {
								stream.markdown(`| Tijd besteed | ⏱️ ${hours}u ${minutes}m |\n`);
							} else {
								stream.markdown(`| Tijd besteed | ⏱️ ${minutes} minuten |\n`);
							}
						}
					}
					if (gradedAt) {
						const gradeDate = new Date(gradedAt);
						stream.markdown(`| Beoordeeld | 📅 ${gradeDate.toLocaleDateString('nl-NL')} om ${gradeDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} |\n`);
					}
					
					stream.markdown(`\n`);
					
					// Show highlight/notes if present
					const highlight = (progress as any).highlight;
					if (highlight && highlight.trim().length > 0) {
						stream.markdown(`#### 💡 Jouw Highlight / Vraag\n\n`);
						stream.markdown(`> 📝 **Je hebt het volgende gemarkeerd:**\n\n`);
						
						// Check if it looks like code
						const looksLikeCode = /[{};()=]|function|class|const|let|var|import|export|def |if |for |while /.test(highlight);
						
						if (looksLikeCode) {
							// Detect language from content
							let lang = 'text';
							if (/\b(function|const|let|var|=>|async|await)\b/.test(highlight)) lang = 'javascript';
							else if (/\bdef\s+\w+|import\s+\w+|print\(/.test(highlight)) lang = 'python';
							else if (/\b(public|private|class|void|int|String)\b/.test(highlight)) lang = 'java';
							else if (/\b(using|namespace|Console\.)\b/.test(highlight)) lang = 'csharp';
							
							stream.markdown(`\`\`\`${lang}\n${highlight}\n\`\`\`\n\n`);
						} else {
							stream.markdown(`> ${highlight.split('\n').join('\n> ')}\n\n`);
						}
						
						// Provide contextual help
						stream.markdown(`💬 **Tutor Tip:** Ik zie dat je iets hebt gemarkeerd! Wil je hier specifieke feedback over?\n`);
						stream.markdown(`- Typ \`@tutor /explain\` + selecteer de code voor uitleg\n`);
						stream.markdown(`- Typ \`@tutor /debug\` als je een fout hebt\n`);
						stream.markdown(`- Typ \`@tutor /review\` voor code review\n\n`);
					}
					
					// Show grade button suggestion if completed but not graded
					if (status === 'completed') {
						stream.markdown(`> 💡 *Klaar voor beoordeling! Klik op **Grade** in het dashboard voor feedback.*\n\n`);
					}
					
					stream.markdown(`---\n\n`);
				}
			}
		} catch (error) {
			console.error('Error loading assignment feedback:', error);
		}
		
		// Footer with tips
		stream.markdown(`### 💡 Tips voor Succes\n\n`);
		stream.markdown(`- 📖 Lees de opdracht **twee keer** voor je begint\n`);
		stream.markdown(`- 🧪 **Test je code** regelmatig tijdens het schrijven\n`);
		stream.markdown(`- 🤔 **Vraag om hulp** via \`@tutor /debug\` als je vastloopt\n`);
		stream.markdown(`- 📝 **Vraag feedback** met \`@tutor /review\` voor je code indient\n\n`);
		stream.markdown(`*Blijf leren, blijf groeien!* 🌟\n`);
		
		context.trackProgress('assignment-feedback');
	}
}
