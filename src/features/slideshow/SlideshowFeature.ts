import * as vscode from 'vscode';
import { EducationalSlide, SlideCollection } from '../../core/types';
import { StudentDataService } from '../../infrastructure/storage/StudentDataService';

/**
 * SlideshowFeature - Manages educational code slides
 * 
 * Responsibilities:
 * - Create slides from code selections
 * - Load and save slide collections
 * - Manage slide lifecycle (add, delete, list)
 * - Interactive slide creation with metadata
 */
export class SlideshowFeature {
	constructor(
		private readonly studentDataService: StudentDataService,
		private readonly onOpenDashboard?: () => void
	) {}

	/**
	 * Load all educational slides
	 * @returns Promise resolving to slide collection
	 */
	async loadSlides(): Promise<SlideCollection> {
		return await this.studentDataService.loadEducationalSlides();
	}

	/**
	 * Get all slides (synchronous wrapper for backward compatibility)
	 * @deprecated Use loadSlides() instead
	 */
	loadSlidesSync(): SlideCollection {
		let result: SlideCollection = { slides: [], lastUpdated: Date.now() };
		this.studentDataService.loadEducationalSlides().then(data => result = data);
		return result;
	}

	/**
	 * Save slide collection
	 * @param collection Slide collection to save
	 */
	async saveSlides(collection: SlideCollection): Promise<void> {
		await this.studentDataService.saveEducationalSlides(collection);
	}

	/**
	 * Save slides with error handling (synchronous wrapper)
	 * @deprecated Use saveSlides() instead
	 */
	saveSlidesSync(collection: SlideCollection): void {
		this.studentDataService.saveEducationalSlides(collection).catch(e => 
			console.error('Error saving educational slides:', e)
		);
	}

	/**
	 * Get all slides as array
	 */
	async getSlides(): Promise<EducationalSlide[]> {
		const collection = await this.loadSlides();
		return collection.slides;
	}

	/**
	 * Add a new slide to the collection
	 * @param slide Slide to add
	 * @returns The added slide
	 */
	async addSlide(slide: EducationalSlide): Promise<EducationalSlide> {
		const collection = await this.loadSlides();
		collection.slides.push(slide);
		collection.lastUpdated = Date.now();
		await this.saveSlides(collection);
		return slide;
	}

	/**
	 * Delete a slide by ID
	 * @param slideId ID of slide to delete
	 * @returns true if slide was deleted, false if not found
	 */
	async deleteSlide(slideId: string): Promise<boolean> {
		const collection = await this.loadSlides();
		const originalLength = collection.slides.length;
		collection.slides = collection.slides.filter((slide: EducationalSlide) => slide.id !== slideId);
		
		if (collection.slides.length === originalLength) {
			return false; // Slide not found
		}

		collection.lastUpdated = Date.now();
		await this.saveSlides(collection);
		return true;
	}

	/**
	 * Create a slide from current editor selection with interactive prompts
	 * @returns The created slide, or undefined if cancelled
	 */
	async createSlideFromSelection(): Promise<EducationalSlide | undefined> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('Please open a code file and select some code to save as a slide.');
			return undefined;
		}

		const selectedText = editor.document.getText(editor.selection);
		if (!selectedText.trim()) {
			vscode.window.showErrorMessage('Please select some code to save as a slide.');
			return undefined;
		}

		const language = editor.document.languageId;

		// Interactive prompts for slide metadata
		const title = await vscode.window.showInputBox({
			prompt: 'Enter a title for this learning slide',
			placeHolder: 'e.g., "For Loop Example" or "Variable Declaration"'
		});
		if (!title) return undefined;

		const concept = await vscode.window.showInputBox({
			prompt: 'What programming concept does this demonstrate?',
			placeHolder: 'e.g., "loops", "variables", "functions", "conditionals"'
		});
		if (!concept) return undefined;

		const explanation = await vscode.window.showInputBox({
			prompt: 'Brief explanation for beginners (what does this code do?)',
			placeHolder: 'e.g., "This loop counts from 1 to 10 and prints each number"'
		});
		if (!explanation) return undefined;

		const difficulty = await vscode.window.showQuickPick(
			['beginner', 'intermediate', 'advanced'],
			{ placeHolder: 'Select difficulty level for this slide' }
		);
		if (!difficulty) return undefined;

		const category = await vscode.window.showQuickPick(
			['Basic Syntax', 'Control Flow', 'Functions', 'Data Structures', 'Object-Oriented', 'Best Practices', 'Common Patterns'],
			{ placeHolder: 'Select category for this slide' }
		);
		if (!category) return undefined;

		// Create and save slide
		const slide: EducationalSlide = {
			id: this.generateSlideId(),
			title,
			concept: concept.toLowerCase(),
			code: selectedText,
			language,
			explanation,
			difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
			category,
			created: Date.now(),
			tags: [concept.toLowerCase(), difficulty, category.toLowerCase().replace(' ', '-')]
		};

		await this.addSlide(slide);

		// Show success message with dashboard option
		const selection = await vscode.window.showInformationMessage(
			`✅ Slide "${title}" saved successfully! View in dashboard slideshow.`,
			'Open Dashboard'
		);

		if (selection === 'Open Dashboard' && this.onOpenDashboard) {
			this.onOpenDashboard();
		}

		return slide;
	}

	/**
	 * Quick add slide from selection (no prompts)
	 * @returns The created slide, or undefined if cancelled
	 */
	async quickAddSlideFromSelection(): Promise<EducationalSlide | undefined> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('Please open a code file and select some code first.');
			return undefined;
		}

		const selectedText = editor.document.getText(editor.selection);
		if (!selectedText.trim()) {
			vscode.window.showErrorMessage('Please select some code to add to the slideshow.');
			return undefined;
		}

		const language = editor.document.languageId;

		const slide: EducationalSlide = {
			id: this.generateSlideId(),
			title: `Code Example - ${language}`,
			concept: 'selected-code',
			code: selectedText,
			language,
			explanation: 'Selected code from editor for slideshow learning',
			difficulty: 'beginner',
			category: 'Code Examples',
			created: Date.now(),
			tags: [language, 'selected-code', 'slideshow']
		};

		await this.addSlide(slide);

		const selection = await vscode.window.showInformationMessage(
			`✅ Code added to slideshow! View in dashboard.`,
			'Open Dashboard'
		);

		if (selection === 'Open Dashboard' && this.onOpenDashboard) {
			this.onOpenDashboard();
		}

		return slide;
	}

	/**
	 * Generate unique slide ID
	 */
	private generateSlideId(): string {
		return `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}
