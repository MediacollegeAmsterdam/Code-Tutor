/**
 * Live Demo Feature
 *
 * Manages live coding demonstrations with real-time updates
 * Part of Features Layer
 */

import * as vscode from 'vscode';
import type {LiveDemoState} from '../../core/types';

export interface LiveDemoDependencies {
    onBroadcast: (data: any) => void;
}

/**
 * LiveDemoFeature - Manages live coding sessions
 * Broadcasts code changes to viewers in real-time
 */
export class LiveDemoFeature {
    private state: LiveDemoState;
    private watcher: vscode.Disposable | undefined;
    private editorWatcher: vscode.Disposable | undefined;
    private deps: LiveDemoDependencies;

    constructor(deps: LiveDemoDependencies) {
        this.deps = deps;
        this.state = {
            active: false,
            title: '',
            language: 'javascript',
            code: '',
            startedAt: '',
            viewerCount: 0
        };
    }

    /**
     * Get current demo state
     */
    getState(): LiveDemoState {
        return {...this.state};
    }

    /**
     * Check if demo is active
     */
    isActive(): boolean {
        return this.state.active;
    }

    /**
     * Start a live demo
     */
    start(title: string, language?: string): void {
        if (this.state.active) {
            console.log('[LiveDemo] Already active');
            return;
        }

        this.state = {
            active: true,
            title: title || 'Live Demo',
            language: language || 'javascript',
            code: '',
            startedAt: new Date().toISOString(),
            viewerCount: 0
        };

        // Start watching for code changes
        this.startWatching();

        // Broadcast demo started
        this.deps.onBroadcast({
            type: 'liveDemoStarted',
            title: this.state.title,
            language: this.state.language
        });

        console.log('[LiveDemo] Started:', this.state.title);
    }

    /**
     * Stop the live demo
     */
    stop(): void {
        if (!this.state.active) {
            return;
        }

        this.state.active = false;
        this.stopWatching();

        // Broadcast demo stopped
        this.deps.onBroadcast({
            type: 'liveDemoStopped'
        });

        console.log('[LiveDemo] Stopped');
    }

    /**
     * Update viewer count
     */
    setViewerCount(count: number): void {
        this.state.viewerCount = count;
    }

    /**
     * Get current demo code and metadata
     */
    getCurrentDemo(): { active: boolean; code: string; viewerCount: number; title: string; language: string } {
        return {
            active: this.state.active,
            code: this.state.code,
            viewerCount: this.state.viewerCount,
            title: this.state.title,
            language: this.state.language
        };
    }

    /**
     * Start watching for code changes
     */
    private startWatching(): void {
        // Watch for text changes in active editor
        this.watcher = vscode.workspace.onDidChangeTextDocument((event) => {
            if (!this.state.active) {
                return;
            }
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                this.state.code = editor.document.getText();

                // Broadcast code update to all viewers
                this.deps.onBroadcast({
                    type: 'liveDemoUpdate',
                    code: this.state.code,
                    language: this.state.language,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Also watch for active editor changes
        this.editorWatcher = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (!this.state.active || !editor) {
                return;
            }

            this.state.code = editor.document.getText();
            this.state.language = editor.document.languageId;

            this.deps.onBroadcast({
                type: 'liveDemoUpdate',
                code: this.state.code,
                language: this.state.language,
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Stop watching for code changes
     */
    private stopWatching(): void {
        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = undefined;
        }

        if (this.editorWatcher) {
            this.editorWatcher.dispose();
            this.editorWatcher = undefined;
        }
    }

    /**
     * Cleanup when feature is disposed
     */
    dispose(): void {
        this.stop();
    }
}
