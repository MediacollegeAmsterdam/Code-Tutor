import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { buildChatMessages, sendChatRequest } from '../chat-utils';

/**
 * Test Command - AI-powered test generation
 * 
 * Helps create unit tests for code.
 * Priority: P3 (Testing feature)
 */
export class TestCommand implements ICommand {
	readonly name = 'test';
	readonly description = 'Genereer tests voor je code';
	readonly aliases = ['unittest', 'testing'];
	
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
		context.trackProgress('test');
	}
	
	private createBasePrompt(yearLevel: number): string {
		const prompts: Record<number, string> = {
			1: 'Je bent een testing coach voor eerstejaars. Leg testconcept uit. CODE alleen als gevraagd. Spreek Nederlands.',
			2: 'Je bent een testing coach voor 2nd year. Focus op unit tests. CODE alleen als gevraagd. Spreek Nederlands.',
			3: 'Je bent een testing mentor voor 3rd year. Focus op test patterns. CODE alleen als gevraagd. Spreek Nederlands.',
			4: 'Je bent een testing expert voor 4th year. Focus op advanced testing. CODE alleen als gevraagd. Spreek Nederlands.'
		};
		return prompts[yearLevel] || prompts[2];
	}
}
