import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';

/**
 * Dashboard Command - Quick access to visual dashboard
 * 
 * Opens the dashboard webview in VS Code.
 * Priority: P3 (Simple utility)
 */
export class DashboardCommand implements ICommand {
	readonly name = 'dashboard';
	readonly description = 'Open het visuele dashboard';
	
	async execute(
		_context: ChatContext,
		stream: vscode.ChatResponseStream,
		_token: vscode.CancellationToken
	): Promise<void> {
		vscode.commands.executeCommand('code-tutor.openDashboard');
		stream.markdown(`## 🎓 Dashboard\n\nHet dashboard wordt geopend in een nieuw tabblad!\n\nJe kunt het dashboard ook altijd openen via het Command Palette: \`Code Tutor: Open Dashboard\``);
	}
}
