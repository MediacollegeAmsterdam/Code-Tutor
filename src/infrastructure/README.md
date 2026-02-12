# Infrastructure Layer

## Overview

The Infrastructure Layer provides adapters that abstract external dependencies and technical concerns. This layer sits between the Core Domain and Features layers, implementing the **Ports and Adapters (Hexagonal Architecture)** pattern.

## Purpose

- **Isolate technical details** from business logic
- **Enable testability** through dependency injection
- **Provide flexibility** to swap implementations without affecting core logic
- **Maintain clean architecture** boundaries

## Components

### Storage (`src/infrastructure/storage/`)

Abstracts data persistence operations behind a unified interface.

#### Files

- **StorageAdapter.ts** - Interface defining storage operations
  - Generic `get<T>()` and `set<T>()` methods
  - Supports type-safe storage with TypeScript generics
  - Optional operations: `keys()`, `clear()`

- **FileSystemStorage.ts** - JSON file-based persistence
  - Stores data in JSON files on disk
  - Sanitizes keys for safe filenames
  - Handles read/write errors gracefully

- **VSCodeStorage.ts** - VS Code Memento API wrapper
  - Uses VS Code's built-in storage (`globalState`)
  - Limited: doesn't support `keys()` or `clear()`

- **StudentDataService.ts** - Domain-specific storage operations
  - High-level methods: `getOrCreateStudentId()`, `loadStudentData()`, `saveStudentData()`
  - Abstracts storage details from business logic
  - Uses injected `StorageAdapter` instances

#### Usage Example

```typescript
import { FileSystemStorage, VSCodeStorage, StudentDataService } from './infrastructure/storage';

// Initialize adapters
const fileStorage = new FileSystemStorage('/path/to/data');
const vscodeStorage = new VSCodeStorage(context.globalState);

// Create service with injected dependencies
const studentDataService = new StudentDataService(fileStorage, vscodeStorage);

// Use domain-specific methods
const studentId = await studentDataService.getOrCreateStudentId();
const data = await studentDataService.loadStudentData();
await studentDataService.updateProgress(studentId, 'debug', 5);
```

### HTTP (`src/infrastructure/http/`)

Abstracts HTTP server and Server-Sent Events (SSE) management.

#### Files

- **HttpServerAdapter.ts** - Interface definitions
  - `HttpServerAdapter` - HTTP server lifecycle (start, stop, route registration)
  - `SSEManager` - Client connection management
  - `SSEClient` - Individual client connection
  - `RouteHandler` - Request handler type

- **SimpleHttpServer.ts** - HTTP server implementation
  - Wraps Node.js `http.Server`
  - Route registration with method and path matching
  - Error handling for port conflicts

- **SimpleSSEManager.ts** - SSE connection manager
  - Manages multiple SSE client connections
  - Broadcasts messages to all connected clients
  - Handles client disconnections automatically
  - Creates SSE clients with proper headers

#### Current Integration

**Status**: Partially integrated

- ✅ `SimpleSSEManager` is integrated into `extension.ts`
- ✅ SSE broadcasting uses `sseManager.broadcast()` instead of managing client arrays
- ⏳ Full HTTP route migration pending (currently uses `http.createServer` directly)

#### Usage Example

```typescript
import { SimpleHttpServer, SimpleSSEManager } from './infrastructure/http';

// Create server and SSE manager
const server = new SimpleHttpServer();
const sseManager = new SimpleSSEManager();

// Register routes
server.on('GET', '/api/data', async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
});

server.on('GET', '/events', (req, res) => {
    const client = sseManager.createClient(res);
    res.write('data: {"message": "Connected"}\n\n');
});

// Start server
await server.start(3000);

// Broadcast to all SSE clients
sseManager.broadcast('update', { type: 'progress', value: 42 });
```

## Architecture Principles

### Dependency Rule

Dependencies flow **inward**:
```
Features → Infrastructure → Core
```

- **Core** has zero external dependencies
- **Infrastructure** depends only on Core types
- **Features** use Infrastructure adapters to interact with Core logic

### Testability

All infrastructure components support dependency injection:

- **Mock storage** in tests by providing a test `StorageAdapter`
- **Mock HTTP** by injecting test server instances
- **Isolate tests** from file system, network, and VS Code APIs

### Single Responsibility

Each adapter has one clear purpose:

- `FileSystemStorage` - File I/O only
- `VSCodeStorage` - VS Code API only
- `StudentDataService` - Student data operations only
- `SimpleSSEManager` - SSE connections only

## Testing

Infrastructure components are tested indirectly through characterization tests in `src/test/`:

- **113 tests** validate behavior end-to-end
- Tests run against real implementations (integration tests)
- Future: Add unit tests with mocked dependencies

## Future Enhancements

### Planned Adapters

1. **VS Code API Adapters**
   - `CommandAdapter` - Command registration
   - `LanguageModelAdapter` - Chat participant API
   - `WindowAdapter` - UI interactions (showInformationMessage, etc.)

2. **File System Adapters**
   - `FileSystemAdapter` - Abstract file operations (read prompts.json, assignments)
   - `ConfigLoader` - Load configuration files

3. **Network Adapters**
   - `FetchAdapter` - HTTP client for external APIs
   - `HealthCheckAdapter` - Service availability checks

### HTTP Route Extraction

**Goal**: Extract all dashboard routes from `extension.ts` into feature modules

**Current state**: 
- Routes defined inline in `extension.ts` (lines 417-1429)
- ~1000 lines of route handling code

**Target state**:
- Feature modules: `DashboardFeature`, `AssignmentFeature`, `LiveDemoFeature`
- Routes defined in dedicated files: `src/features/*/routes.ts`
- Route handlers inject dependencies (storage, VS Code services, etc.)

**Benefits**:
- Easier testing of individual routes
- Clear separation of concerns
- Reusable route logic across different entry points

## Metrics

- **Files**: 9 (5 storage + 4 HTTP)
- **Lines**: ~500 (infrastructure code)
- **Tests**: 113 passing (characterization tests validate integration)
- **Dependencies**: Zero (infrastructure depends only on Node.js built-ins and Core types)

## Related Documentation

- [Core Layer README](../core/README.md) - Business logic and types
- [Refactoring Plan](../../docs/speckit/constitution/plan.md) - Overall architecture
- [Test Documentation](../test/README.md) - Testing strategy
