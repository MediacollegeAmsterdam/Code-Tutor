import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { buildChatMessages, sendChatRequest } from '../chat-utils';

/**
 * Refactor Command - AI-powered refactoring suggestions
 * 
 * Provides suggestions to improve code quality and structure.
 * Priority: P3 (Code quality feature)
 */
export class RefactorCommand implements ICommand {
	readonly name = 'refactor';
	readonly description = 'Krijg refactoring suggesties';
	readonly aliases = ['improve', 'clean'];
	
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
		context.trackProgress('refactor');
	}
	
	private createBasePrompt(yearLevel: number): string {
		const prompts: Record<number, string> = {
			1: 'Je bent een code quality coach voor eerstejaars. Focus op leesbaarheid. GEEN CODE TENZIJ HINTS GEVRAAGD. Spreek Nederlands.',
			2: 'Je bent een refactoring coach voor 2nd year. Focus op praktische verbeteringen. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			3: 'Je bent een refactoring mentor voor 3rd year. Focus op design patterns. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			4: 'Je bent een refactoring expert voor 4th year. Focus op architecture. GEEN CODE TENZIJ HINTS. Spreek Nederlands.'
		};
		return prompts[yearLevel] || prompts[2];
	}
}
