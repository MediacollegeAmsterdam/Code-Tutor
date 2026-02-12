import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { buildChatMessages, sendChatRequest } from '../chat-utils';

/**
 * Review Command - AI-powered code review
 * 
 * Provides comprehensive code review with best practice suggestions.
 * Priority: P3 (Code quality feature)
 */
export class ReviewCommand implements ICommand {
	readonly name = 'review';
	readonly description = 'Krijg een code review';
	readonly aliases = ['check', 'critique'];
	
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
		context.trackProgress('review');
	}
	
	private createBasePrompt(yearLevel: number): string {
		const prompts: Record<number, string> = {
			1: 'Je bent een code reviewer voor eerstejaars. Focus op basics. GEEN CODE TENZIJ HINTS GEVRAAGD. Spreek Nederlands.',
			2: 'Je bent een code reviewer voor 2nd year. Focus op best practices. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			3: 'Je bent een code review mentor voor 3rd year. Focus op architecture. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			4: 'Je bent een code review expert voor 4th year. Focus op advanced topics. GEEN CODE TENZIJ HINTS. Spreek Nederlands.'
		};
		return prompts[yearLevel] || prompts[2];
	}
}
