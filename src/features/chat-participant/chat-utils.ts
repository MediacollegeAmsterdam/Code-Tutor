/**
 * Chat Utilities - Helper functions for chat participant
 */

import * as vscode from 'vscode';
import { UserProfile, CodeContext } from '../../core/types';

/**
 * Get code context from active editor
 * Returns selected text or visible code with markdown formatting
 */
export function getCodeContext(): CodeContext | null {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return null;
	}

	const selection = editor.selection;
	const selectedText = editor.document.getText(selection);

	if (selectedText) {
		return {
			code: `\n\nGeselecteerde code:\n\`\`\`${editor.document.languageId}\n${selectedText}\n\`\`\``,
			language: editor.document.languageId
		};
	}

	const visibleRanges = editor.visibleRanges;
	if (visibleRanges.length > 0) {
		const visibleText = editor.document.getText(visibleRanges[0]);
		if (visibleText.length < 3000) {
			return {
				code: `\n\nZichtbare code in editor:\n\`\`\`${editor.document.languageId}\n${visibleText}\n\`\`\``,
				language: editor.document.languageId
			};
		}
	}

	return null;
}

/**
 * Check if a model is the "auto" model
 */
export function isAutoModel(model: vscode.LanguageModelChat): boolean {
	return model.id.toLowerCase().includes('auto') || 
	       model.name.toLowerCase().includes('auto') || 
	       model.vendor === 'copilot' && model.family === '';
}

/**
 * List all concrete (non-auto) language models
 */
export async function listConcreteModels(): Promise<vscode.LanguageModelChat[]> {
	const allModels = await vscode.lm.selectChatModels();
	return allModels.filter(m => !isAutoModel(m));
}

/**
 * Get a valid language model, avoiding "auto" model
 * Returns the provided model if valid, otherwise first available concrete model
 */
export async function getValidModel(
	model: vscode.LanguageModelChat | undefined
): Promise<vscode.LanguageModelChat | null> {
	try {
		const list = await listConcreteModels();
		if (list.length === 0) {
            return null;
        }

		if (model && !isAutoModel(model)) {
			const found = list.find((m: vscode.LanguageModelChat) => m.id === model.id);
			return found || list[0];
		}
		return list[0] ?? null;
	} catch (e) {
		console.error('Failed to select valid model:', e);
		return null;
	}
}

/**
 * Create year level aware base prompt for chat
 */
export function createBasePrompt(yearLevel: number): string {
	const basePrompts: Record<number, string> = {
		1: 'Je bent een hulpzame programming coach voor eerstejaars studenten. Zorg dat je: 1) ALLES uitlegt - geen aannames over voorkennis, 2) Kleine stappen zet, 3) Veel voorbeelden geeft, 4) Moeilijke concepten vergelijkt met dagelijks leven, 5) Veel aanmoediging geeft. GEEN CODE TENZIJ HINTS GEVRAAGD. Het is oke als dingen simpel lijken - fundamentals zijn belangrijk! Spreek Nederlands.',
		2: 'Je bent een programming coach voor 2nd year studenten. Ze hebben basics, dus focus op: 1) Praktische projecten, 2) Best practices, 3) Code kwaliteit, 4) Kleine design patterns. Leg nog steeds uit maar aannames kunnen hoger. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
		3: 'Je bent een programming mentor voor 3rd year studenten. Ze kunnen zelfstandig code schrijven. Focus op: 1) Advanced patterns, 2) System design, 3) Performance optimization, 4) Best practices op scale. Kan technische termen gebruiken. GEEN CODE TENZIJ HINTS. Spreek Nederlands.',
		4: 'Je bent een expert programming mentor voor 4th year studenten / professionals. Focus op: 1) Research topics, 2) Cutting-edge tech, 3) Innovation, 4) Specialized domains. Kan aannames doen over diep kennis. GEEN CODE TENZIJ HINTS. Spreek Nederlands.'
	};
	return basePrompts[yearLevel] || basePrompts[2];
}

/**
 * Build chat messages array with context history
 */
export function buildChatMessages(
	basePrompt: string,
	chatContext: vscode.ChatContext,
	userPrompt: string,
	codeContext: string
): vscode.LanguageModelChatMessage[] {
	const messages: vscode.LanguageModelChatMessage[] = [
		vscode.LanguageModelChatMessage.User(basePrompt)
	];

	// Add previous messages from history
	const previousMessages = chatContext.history.filter(
		h => h instanceof vscode.ChatResponseTurn
	);

	previousMessages.forEach(m => {
		let fullMessage = '';
		m.response.forEach(r => {
			const mdPart = r as vscode.ChatResponseMarkdownPart;
			fullMessage += mdPart.value.value;
		});
		messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
	});

	// Add current user message with code context
	const userMessage = userPrompt + codeContext;
	messages.push(vscode.LanguageModelChatMessage.User(userMessage));

	return messages;
}

/**
 * Send chat request with model rotation fallback
 */
export async function sendChatRequest(
	model: vscode.LanguageModelChat,
	messages: vscode.LanguageModelChatMessage[],
	token: vscode.CancellationToken,
	stream: vscode.ChatResponseStream
): Promise<vscode.LanguageModelChatResponse | null> {
	const trySend = async (m: vscode.LanguageModelChat) => 
		m.sendRequest(messages, {}, token);

	try {
		return await trySend(model);
	} catch (err: any) {
		const msg = String(err?.message || '').toLowerCase();
		const isAutoIssue = msg.includes('endpoint not found') || msg.includes('model auto');
		const isUnsupported = msg.includes('unsupported') || 
			(err?.code && String(err.code).toLowerCase().includes('unsupported'));

		if (isAutoIssue || isUnsupported) {
			// Rotate through other concrete models and try again
			const list = await listConcreteModels();
			const currentIndex = list.findIndex((m: vscode.LanguageModelChat) => m.id === model.id);

			for (let i = 0; i < list.length; i++) {
				const candidate = list[i];
				if (i === currentIndex) {
                    continue;
                }

				try {
					stream.markdown(`_(Andere model geprobeerd: ${candidate.name})_\n`);
					return await trySend(candidate);
				} catch {
					continue;
				}
			}

			stream.markdown('❌ Geen geschikt AI-model werkte. Kies handmatig een ander model.');
			return null;
		} else {
			throw err;
		}
	}
}
