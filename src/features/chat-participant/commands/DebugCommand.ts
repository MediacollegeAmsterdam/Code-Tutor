import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { buildChatMessages, sendChatRequest } from '../chat-utils';

/**
 * Debug Command - AI-powered debugging assistance  
 * 
 * Analyzes code and helps identify and fix bugs.
 * Priority: P2 (Core development feature)
 */
export class DebugCommand implements ICommand {
	readonly name = 'debug';
	readonly description = 'Krijg debug hulp voor je code';
	readonly aliases = ['fix', 'bug'];
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<void> {
		const codeContext = context.codeContext?.code || '';
		const prompt = this.createBasePrompt(context.yearLevel);
		const userMessage = context.request.prompt;
		
		const messages = buildChatMessages(
			prompt,
			context.chatContext,
			userMessage,
			codeContext
		);
		
		const response = await sendChatRequest(context.model, messages, token, stream);
		if (response) {
			for await (const fragment of response.text) {
				stream.markdown(fragment);
			}
		}
		context.trackProgress('debug');
	}
	
	private createBasePrompt(yearLevel: number): string {
		const prompts: Record<number, string> = {
			1: 'Je bent een hulpzame debug coach voor eerstejaars studenten. GEEN CODE TENZIJ HINTS GEVRAAGD. Spreek Nederlands.',
			2: 'Je bent een debug coach voor 2nd year studenten. Focus op debugtechnieken. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			3: 'Je bent een debug mentor voor 3rd year studenten. Focus op systematisch debuggen. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			4: 'Je bent een debug expert voor 4th year studenten. Focus op advanced debugging. GEEN CODE TENZIJ HINTS. Spreek Nederlands.'
		};
		return prompts[yearLevel] || prompts[2];
	}
}
