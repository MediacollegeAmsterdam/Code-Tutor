/**
 * Mock VS Code API for Jest tests
 * 
 * This mock provides minimal implementations of VS Code API types and functions
 * needed for unit testing without requiring the actual VS Code environment.
 */

export enum ExtensionKind {
  UI = 1,
  Workspace = 2,
}

export class Uri {
  public readonly path: string;
  public readonly fsPath: string;
  public readonly scheme = 'file';
  public readonly authority = '';
  public readonly query = '';
  public readonly fragment = '';

  static file(path: string): Uri {
    return new Uri(path);
  }

  static parse(value: string): Uri {
    return new Uri(value);
  }

  constructor(path: string) {
    this.path = path;
    this.fsPath = path;
  }

  toString(): string {
    return this.path;
  }

  toJSON(): any {
    return { path: this.path };
  }

  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
    return new Uri(change.path || this.path);
  }
}

export interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Thenable<void>;
  keys(): readonly string[];
  setKeysForSync?(keys: readonly string[]): void;
}

export interface SecretStorage {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
  onDidChange: any;
}

export interface ExtensionContext {
  subscriptions: { dispose(): any }[];
  workspaceState: Memento;
  globalState: Memento & { setKeysForSync(keys: readonly string[]): void };
  secrets: SecretStorage;
  extensionUri: Uri;
  extensionPath: string;
  environmentVariableCollection: any;
  extension: any;
  asAbsolutePath(relativePath: string): string;
  storageUri?: Uri;
  storagePath?: string;
  globalStorageUri: Uri;
  globalStoragePath: string;
  logUri: Uri;
  logPath: string;
  extensionMode: ExtensionMode;
  languageModelAccessInformation: any;
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export interface ChatRequest {
  prompt: string;
  command?: string;
  references: any[];
  attempt: number;
  enableCommandDetection: boolean;
}

export interface ChatContext {
  history: any[];
}

export interface ChatResponseStream {
  markdown(value: string): void;
  button(command: any): void;
  filetree(value: any, baseUri?: Uri): void;
  anchor(value: Uri | Location, title?: string): void;
  progress(value: string): void;
  reference(value: Uri | Location): void;
  push(part: any): void;
}

export interface ChatResult {
  metadata?: {
    command?: string;
    [key: string]: any;
  };
}

export interface ChatFollowup {
  prompt: string;
  label?: string;
  command?: string;
}

export interface ChatParticipant {
  iconPath?: Uri;
  followupProvider?: any;
  onDidReceiveFeedback: any;
}

export interface CancellationToken {
  isCancellationRequested: boolean;
  onCancellationRequested: any;
}

export type ChatRequestHandler = (
  request: ChatRequest,
  context: ChatContext,
  stream: ChatResponseStream,
  token: CancellationToken
) => Thenable<ChatResult | undefined> | ChatResult | undefined;

export const chat = {
  createChatParticipant: jest.fn((id: string, handler: ChatRequestHandler): ChatParticipant => {
    return {
      iconPath: undefined,
      followupProvider: undefined,
      onDidReceiveFeedback: jest.fn(),
    };
  }),
};

export const window = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showInputBox: jest.fn(),
  createOutputChannel: jest.fn(() => ({
    append: jest.fn(),
    appendLine: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  })),
  activeTextEditor: undefined,
  visibleTextEditors: [],
};

export const workspace = {
  workspaceFolders: [],
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    has: jest.fn(),
    inspect: jest.fn(),
    update: jest.fn(),
  })),
  onDidChangeConfiguration: jest.fn(),
  onDidChangeWorkspaceFolders: jest.fn(),
  onDidOpenTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  onDidSaveTextDocument: jest.fn(),
  openTextDocument: jest.fn(),
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
    copy: jest.fn(),
    createDirectory: jest.fn(),
    readDirectory: jest.fn(),
    stat: jest.fn(),
  },
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
  getCommands: jest.fn(),
};

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(
    public start: Position,
    public end: Position
  ) {}
}

export class Selection extends Range {
  constructor(
    public anchor: Position,
    public active: Position
  ) {
    super(anchor, active);
  }
}

export class Location {
  constructor(
    public uri: Uri,
    public range: Range
  ) {}
}

export interface TextDocument {
  uri: Uri;
  fileName: string;
  isUntitled: boolean;
  languageId: string;
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  eol: any;
  lineCount: number;
  save(): Thenable<boolean>;
  lineAt(line: number): any;
  offsetAt(position: Position): number;
  positionAt(offset: number): Position;
  getText(range?: Range): string;
  getWordRangeAtPosition(position: Position, regex?: RegExp): Range | undefined;
  validateRange(range: Range): Range;
  validatePosition(position: Position): Position;
}

export interface TextEditor {
  document: TextDocument;
  selection: Selection;
  selections: Selection[];
  visibleRanges: Range[];
  options: any;
  viewColumn?: any;
  edit(callback: (editBuilder: any) => void): Thenable<boolean>;
  insertSnippet(snippet: any, location?: Position | Range | Position[] | Range[]): Thenable<boolean>;
  setDecorations(decorationType: any, rangesOrOptions: Range[] | any[]): void;
  revealRange(range: Range, revealType?: any): void;
  show(column?: any): void;
  hide(): void;
}

export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;

// ChatResponseMarkdownPart and ChatResponseTurn stubs
export class ChatResponseMarkdownPart {
  constructor(public value: any) {}
}

export class ChatResponseTurn {
  constructor(public response: any[], public result: ChatResult) {}
}

// LanguageModelChatResponse stub
export interface LanguageModelChatResponse {
  text: AsyncIterable<string>;
}

export const LanguageModelChatRole = {
  User: 1,
  Assistant: 2,
};

export interface LanguageModelChatMessage {
  role: number;
  content: string;
  name?: string;
}

export const lm = {
  selectChatModels: jest.fn(() => Promise.resolve([])),
};

// Export everything that might be needed
export const version = '1.85.0';
export const env = {
  appName: 'Visual Studio Code',
  appRoot: '/mock/vscode',
  language: 'en',
  clipboard: {
    readText: jest.fn(),
    writeText: jest.fn(),
  },
  machineId: 'mock-machine-id',
  sessionId: 'mock-session-id',
  remoteName: undefined,
  shell: '/bin/bash',
  uriScheme: 'vscode',
};

export const languages = {
  createDiagnosticCollection: jest.fn(),
  registerCodeActionsProvider: jest.fn(),
  registerCodeLensProvider: jest.fn(),
  registerCompletionItemProvider: jest.fn(),
  registerDefinitionProvider: jest.fn(),
  registerHoverProvider: jest.fn(),
  registerDocumentSymbolProvider: jest.fn(),
  registerWorkspaceSymbolProvider: jest.fn(),
  registerReferenceProvider: jest.fn(),
  registerRenameProvider: jest.fn(),
  registerDocumentFormattingEditProvider: jest.fn(),
  registerDocumentRangeFormattingEditProvider: jest.fn(),
  registerSignatureHelpProvider: jest.fn(),
};
