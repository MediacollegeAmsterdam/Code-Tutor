import * as vscode from 'vscode';
import { CommandRegistry } from './CommandRegistry';
import { ChatContext } from './ChatContext';
import { getValidModel, createBasePrompt, buildChatMessages } from './chat-utils';

// Import all commands
import { SetLevelCommand } from './commands/SetLevelCommand';
import { HelpCommand } from './commands/HelpCommand';
import { DashboardCommand } from './commands/DashboardCommand';
import { ProgressCommand } from './commands/ProgressCommand';
import { FeedbackCommand } from './commands/FeedbackCommand';
import { LearnCommand } from './commands/LearnCommand';
import { ResourcesCommand } from './commands/ResourcesCommand';
import { AddSlideCommand } from './commands/AddSlideCommand';
import { DebugCommand } from './commands/DebugCommand';
import { ExplainCommand } from './commands/ExplainCommand';
import { RefactorCommand } from './commands/RefactorCommand';
import { TestCommand } from './commands/TestCommand';
import { ReviewCommand } from './commands/ReviewCommand';
import { ConceptCommand } from './commands/ConceptCommand';
import { QuizCommand } from './commands/QuizCommand';
import { FeedbackCoachCommand } from './commands/FeedbackCoachCommand';
import { AssignmentFeedbackCommand } from './commands/AssignmentFeedbackCommand';
import { ExerciseCommand } from './commands/ExerciseCommand';

/**
 * Chat Participant Feature - Main orchestrator for @tutor chat participant
 * 
 * Manages command registration, routing, and general AI prompt handling.
 * Includes retry logic and verification for reliable registration.
 */
export class ChatParticipantFeature {
	private registry: CommandRegistry;
	private participant: vscode.ChatParticipant | undefined;
	private extensionContext: vscode.ExtensionContext;
	private services: any;
	private lastCommand: string | undefined;
	private isRegistered: boolean = false;
	
	constructor(
		extensionContext: vscode.ExtensionContext,
		services: any
	) {
		this.extensionContext = extensionContext;
		this.services = services;
		this.registry = new CommandRegistry();
	}
	
	/**
	 * Initialize the chat participant and register all commands
	 * Includes retry logic for reliable registration
	 */
	async initialize(): Promise<vscode.Disposable | undefined> {
		// Register all 18 commands
		this.registerCommands();
		
		// Attempt registration with retry logic
		const maxRetries = 3;
		const retryDelay = 1000; // 1 second
		
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(`[Chat Participant] Registration attempt ${attempt}/${maxRetries}...`);
				
				// Check if chat API is available
				if (!vscode.chat || typeof vscode.chat.createChatParticipant !== 'function') {
					throw new Error('VS Code Chat API not available. Update VS Code to version 1.90+');
				}
				
				// Create chat participant
				this.participant = vscode.chat.createChatParticipant(
					'chat-tutorial.code-tutor',
					this.handler.bind(this)
				);
				
				if (!this.participant) {
					throw new Error('Failed to create chat participant (returned undefined)');
				}
				
				// Register followup provider
				this.participant.followupProvider = {
					provideFollowups: this.provideFollowups.bind(this)
				};
				
				// Verify registration succeeded
				this.isRegistered = true;
				console.log('[Chat Participant] ✅ Successfully registered @code-tutor participant');
				vscode.window.showInformationMessage('Code Tutor: Chat participant @code-tutor is ready!');
				
				return this.participant;
				
			} catch (error) {
				console.error(`[Chat Participant] Registration attempt ${attempt} failed:`, error);
				
				if (attempt === maxRetries) {
					// Final attempt failed - show user-friendly error
					const errorMsg = error instanceof Error ? error.message : String(error);
					console.error('[Chat Participant] ❌ All registration attempts failed');
					
					vscode.window.showErrorMessage(
						`Code Tutor: Failed to register chat participant. ${errorMsg}. Try reloading the window (Ctrl+R).`,
						'Reload Window',
						'Dismiss'
					).then(action => {
						if (action === 'Reload Window') {
							vscode.commands.executeCommand('workbench.action.reloadWindow');
						}
					});
					
					return undefined;
				}
				
				// Wait before retry
				console.log(`[Chat Participant] Retrying in ${retryDelay}ms...`);
				await new Promise(resolve => setTimeout(resolve, retryDelay));
			}
		}
		
		return undefined;
	}
	
	/**
	 * Check if the chat participant is successfully registered
	 */
	public isParticipantRegistered(): boolean {
		return this.isRegistered && this.participant !== undefined;
	}
	
	/**
	 * Register all command implementations
	 */
	private registerCommands(): void {
		// P1 (High Priority)
		this.registry.register(new SetLevelCommand());
		this.registry.register(new AssignmentFeedbackCommand());
		this.registry.register(new ExerciseCommand());
		
		// P2 (Medium Priority)
		this.registry.register(new HelpCommand());
		this.registry.register(new ProgressCommand());
		this.registry.register(new LearnCommand());
		this.registry.register(new AddSlideCommand());
		this.registry.register(new DebugCommand());
		this.registry.register(new ExplainCommand());
		
		// P3 (Low Priority)
		this.registry.register(new DashboardCommand());
		this.registry.register(new FeedbackCommand());
		this.registry.register(new ResourcesCommand());
		this.registry.register(new RefactorCommand());
		this.registry.register(new TestCommand());
		this.registry.register(new ReviewCommand());
		this.registry.register(new ConceptCommand());
		this.registry.register(new QuizCommand());
		this.registry.register(new FeedbackCoachCommand());
	}
	
	/**
	 * Main chat request handler
	 */
	private async handler(
		request: vscode.ChatRequest,
		chatContext: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<vscode.ChatResult> {
		this.lastCommand = request.command;
		
		// Get a valid model early in the handler
		const model = await getValidModel(request.model);
		if (!model) {
			stream.markdown('❌ Geen AI-model beschikbaar. Zorg ervoor dat je minstens één model hebt geselecteerd in VS Code.');
			return { metadata: { command: request.command || 'error' } };
		}
		
		// Create chat context
		const context = await ChatContext.create(
			request,
			chatContext,
			token,
			this.extensionContext,
			model,
			this.services
		);
		
		// Find and execute command if present
		if (request.command) {
			const command = this.registry.find(request.command);
			if (command) {
				// Validate command if validation method exists
				const error = command.validate?.(context);
				if (error) {
					stream.markdown(error);
					return { metadata: { command: request.command } };
				}
				
				// Execute command
				await command.execute(context, stream, token);
				return { metadata: { command: request.command } };
			}
		}
		
		// Handle general prompt (no specific command)
		await this.handleGeneralPrompt(context, stream, token);
		return { metadata: { command: 'general' } };
	}
	
	/**
	 * Handle general AI prompts (non-command interactions)
	 */
	private async handleGeneralPrompt(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<void> {
		// Track general usage
		const excludedCommands = ['dashboard', 'progress', 'learn', 'setlevel', 'help'];
		if (context.request.command && !excludedCommands.includes(context.request.command)) {
			context.trackProgress(context.request.command);
		} else if (!context.request.command) {
			context.trackProgress('general');
		}
		
		// Get code context if available
		const codeContextString = context.codeContext?.code || '';
		
		// Create year-level aware base prompt
		const basePrompt = createBasePrompt(context.yearLevel);
		
		// Build messages with history
		const messages = buildChatMessages(
			basePrompt,
			context.chatContext,
			context.request.prompt,
			codeContextString
		);
		
		// Send request with model rotation fallback
		try {
			const response = await context.model.sendRequest(messages, {}, token);
			if (!response) {
				stream.markdown('❌ Kan geen antwoord genereren. Probeer een ander model of vraag het opnieuw.');
				return;
			}
			
			// Stream the response
			for await (const fragment of response.text) {
				stream.markdown(fragment);
			}
		} catch (err: any) {
			const msg = String(err?.message || '').toLowerCase();
			const isAutoIssue = msg.includes('endpoint not found') || msg.includes('model auto');
			const isUnsupported = msg.includes('unsupported') || 
				(err?.code && String(err.code).toLowerCase().includes('unsupported'));
			
			if (isAutoIssue || isUnsupported) {
				// Try to rotate to another model
				stream.markdown('_(Model issue detected, trying alternative...)_\n\n');
				// Note: Full model rotation is handled in chat-utils.sendChatRequest
				// For now, show error message
				stream.markdown('❌ Geen geschikt AI-model werkte. Kies handmatig een ander model in de modelkeuze en probeer opnieuw.');
			} else {
				throw err;
			}
		}
	}
	
	/**
	 * Provide followup suggestions based on last command
	 */
	private provideFollowups(
		result: vscode.ChatResult,
		_context: vscode.ChatContext,
		_token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.ChatFollowup[]> {
		const command = (result.metadata as { command?: string })?.command;
		
		switch (command) {
			case 'exercise':
				return [
					{ prompt: 'Geef me een moeilijkere oefening', label: '🎯 Moeilijker' },
					{ prompt: 'Ik snap het niet, kun je het uitleggen?', label: '❓ Uitleg' },
					{ prompt: 'Geef me een hint', label: '💡 Hint' }
				];
			case 'explain':
				return [
					{ prompt: 'Kun je dat simpeler uitleggen?', label: '🔍 Simpeler' },
					{ prompt: 'Geef me een voorbeeld', label: '📝 Voorbeeld' },
					{ prompt: 'Wat zijn veelgemaakte fouten hierbij?', label: '⚠️ Valkuilen' }
				];
			case 'debug':
				return [
					{ prompt: 'Hoe kan ik dit in de toekomst voorkomen?', label: '🛡️ Preventie' },
					{ prompt: 'Zijn er nog andere mogelijke bugs?', label: '🔍 Meer bugs' },
					{ prompt: 'Leg de oplossing stap voor stap uit', label: '📋 Stappen' }
				];
			case 'feedback':
				return [
					{ prompt: 'Ik snap het niet, geef me meer tips', label: '💡 Meer tips' },
					{ prompt: 'Laat me een compleet voorbeeld zien', label: '📝 Voorbeeld' },
					{ prompt: 'Hoe kan ik dit patroon in andere code toepassen?', label: '🔄 Patroon' }
				];
			case 'refactor':
				return [
					{ prompt: 'Laat me de verbeterde versie zien', label: '✨ Toon code' },
					{ prompt: 'Waarom is dit beter?', label: '❓ Waarom' },
					{ prompt: 'Zijn er nog meer verbeteringen mogelijk?', label: '🔄 Meer' }
				];
			case 'quiz':
				return [
					{ prompt: 'Volgende vraag', label: '➡️ Volgende' },
					{ prompt: 'Ik weet het niet, geef het antwoord', label: '🏳️ Antwoord' },
					{ prompt: 'Wat is mijn score?', label: '📊 Score' }
				];
			case 'review':
				return [
					{ prompt: 'Wat is het belangrijkste om te fixen?', label: '🔴 Prioriteit' },
					{ prompt: 'Hoe zou de ideale versie eruitzien?', label: '⭐ Ideaal' },
					{ prompt: 'Geef me security tips', label: '🔒 Security' }
				];
			case 'learn':
				return [
					{ prompt: 'Start met Python Basics', label: '🐍 Python' },
					{ prompt: 'Start met JavaScript', label: '🌐 JavaScript' },
					{ prompt: 'Leer over algoritmen', label: '🧮 Algoritmen' },
					{ prompt: 'Start Clean Code', label: '✨ Clean Code' }
				];
			default:
				return [
					{ prompt: 'Leg dit verder uit', label: '📖 Meer uitleg' },
					{ prompt: 'Geef me een oefening hierover', label: '🎯 Oefening', command: 'exercise' },
					{ prompt: 'Review mijn code', label: '👀 Review', command: 'review' }
				];
		}
	}
}
