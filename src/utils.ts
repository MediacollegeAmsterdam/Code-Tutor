import * as vscode from 'vscode';

export interface CodeContext {
	code: string;
	language: string;
}

/**
 * Utility functions for the extension
 */
export class ExtensionUtils {
	/**
	 * Get code context from the active editor
	 */
	static getCodeContext(): CodeContext | null {
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
	 * Check if model is "auto" or similar
	 */
	static isAutoModel(model: vscode.LanguageModelChat | undefined): boolean {
		if (!model) return true;
		const fields = [model.id, model.vendor, model.family, model.name].map(f => (f || '').toLowerCase());
		return fields.some(v => v === 'auto' || v.includes('/auto') || v.includes(' auto'));
	}

	/**
	 * Score models by preference
	 */
	static scoreModel(m: vscode.LanguageModelChat): number {
		const vendorScore = (m.vendor || '').toLowerCase() === 'copilot' ? 1000 : 0;
		const familyScore = /(gpt-4|gpt4o|gpt-4o)/.test((m.family || '').toLowerCase()) ? 200 : 0;
		const tokenScore = Math.min(m.maxInputTokens || 0, 999);
		return vendorScore + familyScore + tokenScore;
	}

	/**
	 * Get list of usable (non-"auto") models, sorted by preference
	 */
	static async listConcreteModels(): Promise<vscode.LanguageModelChat[]> {
		try {
			const all = await vscode.lm.selectChatModels();
			return all
				.filter(m => !this.isAutoModel(m))
				.sort((a, b) => this.scoreModel(b) - this.scoreModel(a));
		} catch (e) {
			console.error('Failed to list chat models:', e);
			return [];
		}
	}

	/**
	 * Get a valid model (maps "auto" to a real model, with fallback)
	 */
	static async getValidModel(
		model: vscode.LanguageModelChat | undefined
	): Promise<vscode.LanguageModelChat | null> {
		try {
			const list = await this.listConcreteModels();
			if (list.length === 0) return null;

			if (model && !this.isAutoModel(model)) {
				const found = list.find(m => m.id === model.id);
				return found || list[0];
			}
			return list[0] ?? null;
		} catch (e) {
			console.error('Failed to select valid model:', e);
			return null;
		}
	}
}
