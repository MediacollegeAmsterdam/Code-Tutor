import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { DASHBOARD_PORT } from '../../../core/constants';

/**
 * AddSlide Command - Add selected code to slideshow with AI explanation
 * 
 * Captures code from editor and generates educational slide.
 * Priority: P2 (Teaching workflow feature)
 */
export class AddSlideCommand implements ICommand {
	readonly name = 'add-slide';
	readonly description = 'Voeg geselecteerde code toe aan slideshow';
	readonly aliases = ['slide', 'addslide'];
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			stream.markdown('❌ **Geen editor actief**\n\nOpen een bestand en selecteer code om een slide toe te voegen.');
			return;
		}
		
		const selectedText = editor.document.getText(editor.selection);
		if (!selectedText.trim()) {
			stream.markdown('❌ **Geen code geselecteerd**\n\nSelecteer eerst code in de editor om een slide toe te voegen.');
			return;
		}
		
		try {
			const language = editor.document.languageId;
			
			stream.markdown('🎯 **Code geselecteerd voor slideshow!**\n\n');
			stream.markdown('🔍 Genereer uitleg...');
			
			// Generate explanation
			const explainPrompt = `Je bent een programmeertutor. Geef een korte, duidelijke uitleg (50-80 woorden) voor deze code voor eerstejaars studenten:\n\n\`\`\`${language}\n${selectedText}\n\`\`\`\n\nFocus op: Wat doet deze code? Welk concept wordt gedemonstreerd? Waarom is dit nuttig?\n\nAntwoord alleen met de uitleg, geen extra tekst.`;
			
			const messages = [vscode.LanguageModelChatMessage.User(explainPrompt)];
			let explanation = '';
			
			for await (const fragment of (await context.model.sendRequest(messages, {}, token)).text) {
				explanation += fragment;
			}
			
			// Create slide
			const slide = {
				id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				title: `${language.toUpperCase()} Code Snippet`,
				concept: language,
				code: selectedText,
				language,
				explanation: explanation.trim(),
				difficulty: 'beginner' as const,
				category: 'Code Examples',
				created: Date.now(),
				tags: [language, 'chat-generated', 'slideshow']
			};
			
			// Send to API server (dashboard server has slide routes)
			try {
				const response = await fetch(`http://localhost:${DASHBOARD_PORT}/api/slides`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(slide)
				});
				
				if (response.ok) {
					stream.markdown('\n\n✅ **Slide toegevoegd!**\n\n');
					stream.markdown(`📚 **Uitleg:** ${explanation.trim()}\n\n`);
					stream.markdown('💡 Bekijk je slides in het dashboard via `/dashboard`');
					
					context.trackProgress('add-slide');
				} else {
					const errorText = await response.text();
					throw new Error(`Server antwoordde met status: ${response.status}: ${errorText}`);
				}
			} catch (fetchError) {
				console.error('Error adding slide:', fetchError);
				stream.markdown(`\n\n❌ **Fout bij toevoegen slide**\n\nZorg ervoor dat de prompt server draait. Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
			}
		} catch (error) {
			console.error('Error adding slide:', error);
			stream.markdown('❌ **Fout bij toevoegen slide**\n\nZorg ervoor dat de extension actief is (druk op F5 om te starten).');
		}
	}
}
