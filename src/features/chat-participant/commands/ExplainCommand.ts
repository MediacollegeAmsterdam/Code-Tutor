import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { buildChatMessages, sendChatRequest } from '../chat-utils';

/**
 * Explain Command - AI-powered code explanation
 * 
 * Provides detailed explanations of code concepts and syntax.
 * Priority: P2 (Core learning feature)
 */
export class ExplainCommand implements ICommand {
	readonly name = 'explain';
	readonly description = 'Leg code of concepten uit';
	readonly aliases = ['clarify', 'what'];
	
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
		context.trackProgress('explain');
	}
	
	private createBasePrompt(yearLevel: number): string {
		const prompts: Record<number, string> = {
			1: 'Je bent een hulpzame programming coach voor eerstejaars studenten. Leg ALLES uit - geen aannames. GEEN CODE TENZIJ HINTS GEVRAAGD. Spreek Nederlands.',
			2: 'Je bent een programming coach voor 2nd year studenten. Focus op praktische uitleg. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			3: 'Je bent een programming mentor voor 3rd year studenten. Focus on advanced concepts. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			4: 'Je bent een expert programming mentor voor 4th year studenten. Focus op diepgaande analyse. GEEN CODE TENZIJ HINTS. Spreek Nederlands.'
		};
		return prompts[yearLevel] || prompts[2];
	}
}
