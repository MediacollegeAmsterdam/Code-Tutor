import { ICommand } from './ICommand';

/**
 * Command Registry for managing all chat participant commands
 * 
 * Provides command registration, lookup, and discovery functionality
 * for the command pattern architecture.
 */
export class CommandRegistry {
	private commands: Map<string, ICommand> = new Map();
	private aliases: Map<string, string> = new Map(); // maps alias -> command name
	
	/**
	 * Register a command in the registry
	 * @param command Command to register
	 */
	register(command: ICommand): void {
		this.commands.set(command.name, command);
		
		// Register aliases if provided
		if (command.aliases) {
			for (const alias of command.aliases) {
				this.aliases.set(alias, command.name);
			}
		}
	}
	
	/**
	 * Unregister a command by name
	 * @param name Command name to unregister
	 */
	unregister(name: string): void {
		const command = this.commands.get(name);
		if (command) {
			// Remove aliases
			if (command.aliases) {
				for (const alias of command.aliases) {
					this.aliases.delete(alias);
				}
			}
			this.commands.delete(name);
		}
	}
	
	/**
	 * Find a command by name or alias
	 * @param nameOrAlias Command name or alias
	 * @returns Command if found, undefined otherwise
	 */
	find(nameOrAlias: string | undefined): ICommand | undefined {
		if (!nameOrAlias) {
			return undefined;
		}
		
		// Try direct lookup first
		const command = this.commands.get(nameOrAlias);
		if (command) {
			return command;
		}
		
		// Try alias lookup
		const commandName = this.aliases.get(nameOrAlias);
		if (commandName) {
			return this.commands.get(commandName);
		}
		
		return undefined;
	}
	
	/**
	 * Check if a command exists
	 * @param nameOrAlias Command name or alias
	 * @returns True if command exists, false otherwise
	 */
	has(nameOrAlias: string): boolean {
		return this.find(nameOrAlias) !== undefined;
	}
	
	/**
	 * List all registered commands
	 * @returns Array of all commands
	 */
	listAll(): ICommand[] {
		return Array.from(this.commands.values());
	}
	
	/**
	 * Get command count
	 * @returns Number of registered commands
	 */
	count(): number {
		return this.commands.size;
	}
}
