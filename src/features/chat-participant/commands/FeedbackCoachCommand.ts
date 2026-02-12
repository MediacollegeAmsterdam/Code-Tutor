import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { buildChatMessages, sendChatRequest } from '../chat-utils';

/**
 * FeedbackCoach Command - Constructive feedback coaching
 * 
 * Provides motivating, constructive feedback on work.
 * Priority: P3 (Motivational feature)
 */
export class FeedbackCoachCommand implements ICommand {
	readonly name = 'feedback-coach';
	readonly description = 'Krijg coaching feedback';
	readonly aliases = ['coach', 'motivate'];
	
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
		context.trackProgress('feedback-coach');
	}
	
	private createBasePrompt(yearLevel: number): string {
		const prompts: Record<number, string> = {
			1: 'Je bent een motiverende coach voor eerstejaars. Geef aanmoedigende feedback. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			2: 'Je bent een feedback coach voor 2nd year. Balance critique with encouragement. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			3: 'Je bent een feedback coach voor 3rd year. Focus on growth mindset. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
			4: 'Je bent een professional feedback coach voor 4th year. Focus on career growth. GEEN CODE TENZIJ HINTS. Spreek Nederlands.'
		};
		return prompts[yearLevel] || prompts[2];
	}
}
