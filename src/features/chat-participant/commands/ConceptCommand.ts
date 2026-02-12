import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { buildChatMessages, sendChatRequest } from '../chat-utils';

/**
 * Concept Command - Deep dive into programming concepts
 * 
 * Provides in-depth explanation of programming concepts.
 * Priority: P3 (Learning feature)
 */
export class ConceptCommand implements ICommand {
	readonly name = 'concept';
	readonly description = 'Diep duiken in een concept';
	readonly aliases = ['theory', 'learn-concept'];
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<void> {
		const prompt = this.createBasePrompt(context.yearLevel);
		const userMessage = context.request.prompt;
		
		const messages = buildChatMessages(
			prompt,
			context.chatContext,
			userMessage,
			''
		);
		
		const response = await sendChatRequest(context.model, messages, token, stream);
		if (response) {
			for await (const fragment of response.text) {
				stream.markdown(fragment);
			}
		}
		context.trackProgress('concept');
	}
	
	private createBasePrompt(yearLevel: number): string {
		const prompts: Record<number, string> = {
			1: 'Je bent een programming concept leraar voor eerstejaars. Leg fundamentals uit met analogieën. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			2: 'Je bent een programming concept leraar voor 2nd year. Focus op praktische concepts. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			3: 'Je bent een concept mentor voor 3rd year. Focus op advanced concepts. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			4: 'Je bent een concept expert voor 4th year. Focus op theoretical/research topics. GEEN CODE TENZIJ HINTS. Spreek Nederlands.'
		};
		return prompts[yearLevel] || prompts[2];
	}
}
