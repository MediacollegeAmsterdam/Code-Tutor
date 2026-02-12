import * as vscode from 'vscode';
import { ICommand } from '../ICommand';
import { ChatContext } from '../ChatContext';
import { RESOURCE_LIBRARY } from '../../../core/constants';

/**
 * Resources Command - Display resource library with categorization  
 * 
 * Provides curated learning resources organized by category.
 * Priority: P3 (Nice utility feature)
 */
export class ResourcesCommand implements ICommand {
	readonly name = 'resources';
	readonly description = 'Bekijk de resource library';
	readonly aliases = ['library', 'docs'];
	
	async execute(
		context: ChatContext,
		stream: vscode.ChatResponseStream,
		_token: vscode.CancellationToken
	): Promise<void> {
		const userQuery = context.request.prompt.toLowerCase();
		const categories = Object.entries(RESOURCE_LIBRARY);
		
		// Try to match a category or show compact overview
		const matchedCategory = categories.find(([key, data]) =>
			userQuery.includes(key) ||
			userQuery.includes(data.name.toLowerCase()) ||
			data.resources.some(r => userQuery.includes(r.tags.join(' ').toLowerCase()))
		);
		
		if (matchedCategory) {
			// Show detailed view for specific category
			const [catKey, catData] = matchedCategory;
			stream.markdown(`## ${catData.icon} ${catData.name}\n\n`);
			
			catData.resources.forEach((resource) => {
				stream.markdown(`**[${resource.title}](${resource.url})** • ${resource.type} • ${resource.difficulty}\n`);
				stream.markdown(`${resource.description}\n\n`);
			});
		} else {
			// Show compact category overview
			stream.markdown(`## 📖 Resource Library\n\n`);
			stream.markdown(`Kies een categorie:\n\n`);
			
			categories.forEach(([key, data]) => {
				const resourceCount = data.resources.length;
				const typeSummary = [...new Set(data.resources.map(r => r.type))].join(', ');
				stream.markdown(`**${data.icon} ${data.name}** (${resourceCount})\n`);
				stream.markdown(`→ ${typeSummary}\n\n`);
			});
			
			stream.markdown(`Vraag bijvoorbeeld: "Resources voor Python" of "Debugging tools"\n`);
		}
		
		context.trackProgress('resources');
	}
}
