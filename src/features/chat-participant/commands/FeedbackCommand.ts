import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';

/**
 * Feedback Command - Progressive feedback system for student code
 * 
 * Provides multi-level feedback: initial questions, tips, then examples.
 * Priority: P3 (Important learning feature)
 */
export class FeedbackCommand implements ICommand {
	readonly name = 'feedback';
	readonly description = 'Krijg progressieve feedback op je code';
	
	private feedbackSessions: Map<string, { attempts: number; lastFeedbackLevel: string; previousFeedback: string[] }> = new Map();
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<void> {
		const ctx = context.codeContext;
		if (!ctx) {
			stream.markdown(`Selecteer code in je editor om feedback te krijgen.\n\nGebruik: Selecteer je code, typ \`@tutor /feedback\` en beschrijf je probleem.`);
			context.trackProgress('feedback');
			return;
		}
		
		const code = ctx.code.replace(/^.*?\`\`\`\w+\n/, '').replace(/\`\`\`$/, '');
		const feedbackResponse = await this.generateProgressiveFeedback(
			context.request.prompt,
			code,
			ctx.language,
			context.model,
			1,
			undefined,
			token
		);
		
		stream.markdown(feedbackResponse);
		context.trackProgress('feedback');
	}
	
	private async generateProgressiveFeedback(
		issue: string,
		code: string,
		language: string,
		model: vscode.LanguageModelChat,
		attempt: number = 1,
		sessionId?: string,
		token?: vscode.CancellationToken
	): Promise<string> {
		const sid = sessionId || `session-${Date.now()}`;
		let session = this.feedbackSessions.get(sid);
		
		if (!session) {
			session = { attempts: 0, lastFeedbackLevel: 'initial', previousFeedback: [] };
			this.feedbackSessions.set(sid, session);
		}
		
		session.attempts++;
		
		// Level 1: Initial Feedback
		if (session.attempts === 1) {
			const initialPrompt = `Je bent een programmeer coach. Een student heeft een probleem met hun code.

Probleem: ${issue}

Code:
\`\`\`${language}
${code}
\`\`\`

Geef korte, begrijpelijke initiële feedback die:
1. Het probleem duidelijk identificeert
2. Een gerichte vraag stelt om ze zelf na te denken
3. Hen aanmoedigt zelf de oplossing te zoeken
4. Maximaal 150 woorden

Spreek als een normale Nederlander, zonder emojis.`;
			
			const messages = [vscode.LanguageModelChatMessage.User(initialPrompt)];
			
			try {
				const response = await model.sendRequest(messages, {}, token);
				let fullResponse = '';
				for await (const fragment of response.text) {
					fullResponse += fragment;
				}
				
				session.lastFeedbackLevel = 'initial';
				session.previousFeedback.push(fullResponse);
				return fullResponse;
			} catch (e) {
				return 'Kon feedback niet genereren. Probeer opnieuw.';
			}
		}
		
		// Level 2: Specific Tips
		if (session.attempts === 2 || session.attempts === 3) {
			const tipsPrompt = `Je bent een programmeer coach. Een student snapt hun probleem nog niet.

Origineel probleem: ${issue}

Code:
\`\`\`${language}
${code}
\`\`\`

Geef nu concrete tips:
1. 3-4 specifieke dingen om te controleren
2. Debugtechnieken die helpen (bijv. logging)
3. Vragen om hun denkproces te structureren
4. Aanmoediging zonder direct antwoord te geven
5. Maximaal 200 woorden

Spreek als een normale Nederlander, zonder emojis.`;
			
			const messages = [vscode.LanguageModelChatMessage.User(tipsPrompt)];
			
			try {
				const response = await model.sendRequest(messages, {}, token);
				let fullResponse = '';
				for await (const fragment of response.text) {
					fullResponse += fragment;
				}
				
				session.lastFeedbackLevel = 'tips';
				session.previousFeedback.push(fullResponse);
				return fullResponse;
			} catch (e) {
				return 'Kon tips niet genereren. Probeer opnieuw.';
			}
		}
		
		// Level 3: Full Example
		if (session.attempts >= 4) {
			const examplePrompt = `Je bent een programmeer coach. Een student snapt het nog steeds niet. Nu geven we een volledig voorbeeld.

Origineel probleem: ${issue}

Originele code:
\`\`\`${language}
${code}
\`\`\`

Geef nu:
1. Een volledig werkend voorbeeld in ${language}
2. Regel-voor-regel uitleg van het voorbeeld
3. De kernprincipes die je toepast
4. Hoe ze dit patroon elders kunnen toepassen
5. 300-400 woorden max

Format:
**Werkend Voorbeeld:**
\`\`\`${language}
[code hier]
\`\`\`

**Uitleg:**
[uitleg hier]

Spreek als een normale Nederlander, zonder emojis.`;
			
			const messages = [vscode.LanguageModelChatMessage.User(examplePrompt)];
			
			try {
				const response = await model.sendRequest(messages, {}, token);
				let fullResponse = '';
				for await (const fragment of response.text) {
					fullResponse += fragment;
				}
				
				session.lastFeedbackLevel = 'example';
				session.previousFeedback.push(fullResponse);
				
				// Clean up old sessions
				setTimeout(() => {
					this.feedbackSessions.delete(sid);
				}, 30000);
				
				return fullResponse;
			} catch (e) {
				return 'Kon voorbeeld niet genereren. Probeer opnieuw.';
			}
		}
		
		return 'Vraag opnieuw - ik kan je beter helpen';
	}
}
