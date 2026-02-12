/**
 * Mock factories for VS Code APIs and extension dependencies
 * Used in tests to isolate units under test
 */

import * as vscode from 'vscode';

/**
 * Create a mock VS Code ExtensionContext
 */
export function createMockExtensionContext(): vscode.ExtensionContext {
  const globalState = new Map<string, any>();
  const workspaceState = new Map<string, any>();
  
  return {
    subscriptions: [],
    extensionPath: '/mock/extension/path',
    extensionUri: vscode.Uri.file('/mock/extension/path'),
    globalStorageUri: vscode.Uri.file('/mock/global/storage'),
    logUri: vscode.Uri.file('/mock/logs'),
    storageUri: vscode.Uri.file('/mock/storage'),
    globalStoragePath: '/mock/global/storage',
    storagePath: '/mock/storage',
    logPath: '/mock/logs',
    extensionMode: vscode.ExtensionMode.Test,
    globalState: {
      get: jest.fn((key: string, defaultValue?: any) => globalState.get(key) ?? defaultValue),
      update: jest.fn((key: string, value: any) => {
        globalState.set(key, value);
        return Promise.resolve();
      }),
      keys: jest.fn(() => Array.from(globalState.keys())),
      setKeysForSync: jest.fn(),
    },
    workspaceState: {
      get: jest.fn((key: string, defaultValue?: any) => workspaceState.get(key) ?? defaultValue),
      update: jest.fn((key: string, value: any) => {
        workspaceState.set(key, value);
        return Promise.resolve();
      }),
      keys: jest.fn(() => Array.from(workspaceState.keys())),
    },
    secrets: {
      get: jest.fn(),
      store: jest.fn(),
      delete: jest.fn(),
      onDidChange: jest.fn(),
    },
    environmentVariableCollection: {
      persistent: true,
      description: 'Mock environment',
      replace: jest.fn(),
      append: jest.fn(),
      prepend: jest.fn(),
      get: jest.fn(),
      forEach: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getScoped: jest.fn(),
      [Symbol.iterator]: jest.fn(),
    },
    extension: {
      id: 'mock.extension',
      extensionUri: vscode.Uri.file('/mock/extension'),
      extensionPath: '/mock/extension',
      isActive: true,
      packageJSON: {},
      exports: undefined,
      activate: jest.fn(),
      extensionKind: vscode.ExtensionKind.Workspace,
    },
    asAbsolutePath: jest.fn((relativePath: string) => `/mock/extension/path/${relativePath}`),
    languageModelAccessInformation: {
      onDidChange: jest.fn(),
      canSendRequest: jest.fn(),
    },
  } as any;
}

/**
 * Create a mock chat request context
 */
export function createMockChatRequest(options: {
  prompt?: string;
  command?: string;
  selectedText?: string;
} = {}): vscode.ChatRequest {
  return {
    prompt: options.prompt || '',
    command: options.command,
    references: [],
    attempt: 0,
    enableCommandDetection: false,
  } as any;
}

/**
 * Create a mock chat response stream
 */
export function createMockChatResponseStream(): vscode.ChatResponseStream {
  const messages: string[] = [];
  
  return {
    markdown: jest.fn((content: string) => {
      messages.push(content);
    }),
    markdownString: jest.fn((content: vscode.MarkdownString) => {
      messages.push(content.value);
    }),
    anchor: jest.fn(),
    button: jest.fn(),
    filetree: jest.fn(),
    progress: jest.fn(),
    reference: jest.fn(),
    push: jest.fn(),
    _messages: messages, // For test inspection
  } as any;
}

/**
 * Create a mock chat context
 */
export function createMockChatContext(): vscode.ChatContext {
  return {
    history: [],
  } as any;
}

/**
 * Mock VS Code window functions
 */
export function mockVSCodeWindow() {
  return {
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showQuickPick: jest.fn().mockResolvedValue(undefined),
    showInputBox: jest.fn().mockResolvedValue(undefined),
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    activeTextEditor: undefined,
  };
}

/**
 * Mock file system operations
 */
export function mockFileSystem() {
  const files = new Map<string, string>();
  
  return {
    existsSync: jest.fn((path: string) => files.has(path)),
    readFileSync: jest.fn((path: string, encoding: string) => files.get(path) || ''),
    writeFileSync: jest.fn((path: string, data: string) => {
      files.set(path, data);
    }),
    mkdirSync: jest.fn(),
    _files: files, // For test inspection
  };
}
