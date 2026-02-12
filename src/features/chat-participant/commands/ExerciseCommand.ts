import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';

/**
 * Exercise Command - Generate or list programming exercises
 * 
 * Can generate custom exercises using AI or list existing assignments.
 * Priority: P1 (Core learning feature - complex)
 */
export class ExerciseCommand implements ICommand {
	readonly name = 'exercise';
	readonly description = 'Genereer of bekijk oefeningen';
	readonly aliases = ['exercises', 'oefening'];
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<void> {
		const userQuery = context.request.prompt.toLowerCase();
		
		// Check if user is asking to generate an assignment
		const isGenerating = userQuery.includes('geef') || userQuery.includes('maak') ||
			userQuery.includes('give') || userQuery.includes('create') ||
			userQuery.includes('generate') || userQuery.includes('oefening') ||
			userQuery.includes('assignment') || userQuery.includes('exercise');
		
		if (isGenerating && userQuery.length > 5) {
			// Generate a new assignment based on the user's request
			await this.generateExercise(context, stream, token);
		} else {
			// List existing assignments
			await this.listExercises(context, stream);
		}
	}
	
	private async generateExercise(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<void> {
		stream.markdown(`## 🎯 Oefening aan het genereren...\n\n`);
		stream.markdown(`⏳ Ik ben een oefening voor je aan het maken...\n\n`);
		
		try {
			const userProfile = context.getUserProfile();
			const yearLevel = userProfile?.yearLevel || 2;
			const difficultyMap: Record<number, string> = { 1: 'beginner', 2: 'intermediate', 3: 'advanced', 4: 'advanced' };
			const difficulty = difficultyMap[yearLevel];
			
			// Generate assignment using AI
			const assignmentPrompt = `Je bent een expert in het maken van programmeer oefeningen. 
			
Maak een compleet assignment in Markdown formaat op basis van dit verzoek: "${context.request.prompt}"

BELANGRIJK: Antwoord ALLEEN met het Markdown content. Geen extra tekst.

Format (gebruik exact dit format):
---
title: [Duidelijke titel]
difficulty: ${difficulty}
topic: [Topic/onderwerp]
dueDate: [YYYY-MM-DD, bijv 2026-01-25]
estimatedTime: [aantal minuten, bijv 45]
---

## Objective
[Doel van de oefening]

## Learning Outcomes
- [Leeruitkomst 1]
- [Leeruitkomst 2]
- [Leeruitkomst 3]

## Tasks
### Task 1: [Taaktitel]
[Taakbeschrijving]

### Task 2: [Taaktitel]
[Taakbeschrijving]

## Hints & Tips
- [Hint 1]
- [Hint 2]

## Resources
- [Resource 1](url)
- [Resource 2](url)

## Submission
[Submissie instructies]`;
			
			const messages = [vscode.LanguageModelChatMessage.User(assignmentPrompt)];
			let assignmentContent = '';
			
			for await (const fragment of (await context.model.sendRequest(messages, {}, token)).text) {
				assignmentContent += fragment;
			}
			
			// Extract metadata and generate filename
			const metadataMatch = assignmentContent.match(/^---\n([\s\S]*?)\n---/);
			let title = 'Custom Assignment';
			let difficulty_val = 'beginner';
			
			if (metadataMatch) {
				const metadata = metadataMatch[1];
				const titleMatch = metadata.match(/title:\s*(.+)/);
				const diffMatch = metadata.match(/difficulty:\s*(.+)/);
				if (titleMatch) {
                    title = titleMatch[1].trim();
                }
				if (diffMatch) {
                    difficulty_val = diffMatch[1].trim();
                }
			}
			
			// Generate filename with timestamp
			const now = new Date();
			const dateStr = now.toISOString().split('T')[0];
			const filename = `${dateStr}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
			const filepath = path.join(context.extensionContext.extensionPath, 'assignments', filename);
			
			// Save the assignment file
			fs.mkdirSync(path.dirname(filepath), { recursive: true });
			fs.writeFileSync(filepath, assignmentContent);
			
			stream.markdown(`## 🎯 Oefening Gegenereerd!\n\n`);
			stream.markdown(`✅ Jouw custom oefening is aangemaakt en verschijnt nu in het dashboard!\n\n`);
			stream.markdown(`📋 **${title}**\n`);
			stream.markdown(`- 📊 Niveau: ${difficulty_val}\n`);
			stream.markdown(`- 📂 Bestand: \`${filename}\`\n\n`);
			
			// Show the generated assignment content
			stream.markdown(`---\n\n`);
			stream.markdown(assignmentContent);
			stream.markdown(`\n\n---\n\n`);
			
			stream.markdown(`Ga naar het dashboard om de volledige oefening te bekijken en in te dienen!\n`);
			
			context.trackProgress('exercise');
			context.services.broadcastSSEUpdate({ type: 'assignmentGenerated', filename, title });
		} catch (error) {
			console.error('Error generating assignment:', error);
			stream.markdown(`❌ Kon de oefening niet genereren. Probeer het opnieuw.\n`);
			context.trackProgress('exercise');
		}
	}
	
	private async listExercises(
		context: ChatContext,
		stream: vscode.ChatResponseStream
	): Promise<void> {
		try {
			const response = await fetch('http://localhost:51987/api/assignments');
			const assignments = await response.json();
			
			if (!assignments || assignments.length === 0) {
				stream.markdown(`## 🎯 Oefeningen\n\n`);
				stream.markdown(`Er zijn momenteel geen oefeningen beschikbaar.\n\n`);
				stream.markdown(`💡 *Tip: Vraag me om een oefening, bijv: "Geef me een oefening over loops"*\n`);
				context.trackProgress('exercise');
				return;
			}
			
			const assignmentProgress = context.getAssignmentProgress();
			
			stream.markdown(`## 🎯 Beschikbare Oefeningen\n\n`);
			
			assignments.forEach((assignment: any) => {
				const difficultyEmoji = assignment.difficulty === 'beginner' ? '🌱' :
					assignment.difficulty === 'intermediate' ? '📈' : '⭐';
				const dueDate = assignment.dueDate ? ` • 📅 ${assignment.dueDate}` : '';
				const time = assignment.estimatedTime ? ` • ⏱️ ${assignment.estimatedTime} min` : '';
				
				// Check if assignment is completed
				const status = assignmentProgress[assignment.id]?.status;
				const completionIcon = status === 'completed' ? ' ✅' : status === 'graded' ? ' 🏆' : '';
				
				stream.markdown(`### ${difficultyEmoji} ${assignment.title}${completionIcon}\n`);
				stream.markdown(`**${assignment.topic}**${time}${dueDate}\n\n`);
			});
			
			stream.markdown(`\n💡 *Vraag om een specifieke oefening, bijv: "Geef me een oefening over variabelen"*\n`);
			context.trackProgress('exercise');
		} catch (error) {
			stream.markdown(`## 🎯 Oefeningen\n\n`);
			stream.markdown(`Kon oefeningen niet laden. Zorg ervoor dat de server draait.\n\n`);
			stream.markdown(`Probeer: \`npm run watch\` in de terminal.\n`);
			context.trackProgress('exercise');
		}
	}
}
