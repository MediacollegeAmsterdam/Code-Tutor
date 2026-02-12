/**
 * HTTP Infrastructure - Barrel Export
 * 
 * Centralized export of HTTP server components
 * Part of Infrastructure Layer
 */

export { HttpServerAdapter, SSEClient, SSEManager } from './HttpServerAdapter';
export { SimpleHttpServer } from './SimpleHttpServer';
export { SimpleSSEManager } from './SimpleSSEManager';

// Router infrastructure (Phase 6.1)
export { Router } from './Router';
export type { RouteHandler, Middleware } from './Router';
export * from './middleware';
export { initializeRouter } from './initialize-routes';
export type { RouteConfig } from './initialize-routes';
