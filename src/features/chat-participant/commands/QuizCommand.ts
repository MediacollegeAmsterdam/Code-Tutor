import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { buildChatMessages, sendChatRequest } from '../chat-utils';

/**
 * Quiz Command - AI-powered quiz generation  
 * 
 * Generates interactive quizzes on programming topics.
 * Priority: P3 (Assessment feature)
 */
export class QuizCommand implements ICommand {
	readonly name = 'quiz';
	readonly description = 'Genereer een quiz';
	readonly aliases = ['test-me', 'assess'];
	
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
		context.trackProgress('quiz');
	}
	
	private createBasePrompt(yearLevel: number): string {
		const prompts: Record<number, string> = {
			1: 'Je bent een quiz maker voor eerstejaars. Maak simpele vragen over basics. Spreek Nederlands.',
			2: 'Je bent een quiz maker voor 2nd year. Focus op praktische vragen. Spreek Nederlands.',
			3: 'Je bent een quiz maker voor 3rd year. Focus op advanced topics. Spreek Nederlands.',
			4: 'Je bent een quiz maker voor 4th year. Focus op research/specialized topics. Spreek Nederlands.'
		};
		return prompts[yearLevel] || prompts[2];
	}
}
