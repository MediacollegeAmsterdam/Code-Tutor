import * as assert from 'assert';
import * as http from 'http';
import { Router } from '../src/infrastructure/http/Router';
import { createGetSlidesHandler, createAddSlideHandler, createDeleteSlideHandler } from '../src/infrastructure/http/routes/slide-routes';
import { SlideshowFeature } from '../src/features/slideshow/SlideshowFeature';

/**
 * Mock HTTP request/response for testing
 */
class MockRequest {
	public method: string;
	public url: string;
	public headers: Record<string, string> = {};
	private chunks: string[] = [];

	constructor(method: string, url: string, body?: any) {
		this.method = method;
		this.url = url;
		if (body) {
			this.chunks = [JSON.stringify(body)];
		}
	}

	on(event: string, handler: Function): void {
		if (event === 'data' && this.chunks.length > 0) {
			this.chunks.forEach(chunk => handler(chunk));
		} else if (event === 'end') {
			setImmediate(() => handler());
		}
	}
}

class MockResponse {
	public statusCode: number = 200;
	public headers: Record<string, string> = {};
	public body: string = '';
	public writableEnded: boolean = false;

	writeHead(statusCode: number, headers?: Record<string, string>): void {
		this.statusCode = statusCode;
		if (headers) {
			this.headers = { ...this.headers, ...headers };
		}
	}

	end(data?: string): void {
		if (data) {
			this.body += data;
		}
		this.writableEnded = true;
	}

	getBodyAsJson(): any {
		return JSON.parse(this.body);
	}
}

describe('HTTP Router Tests', () => {

	describe('Router - Basic Routing (T114-T117)', () => {
		test('T114: should match exact GET routes', async () => {
			const router = new Router();
			let called = false;

			router.get('/api/test', async (req, res) => {
				called = true;
				res.writeHead(200);
				res.end('OK');
			});

			const req = new MockRequest('GET', '/api/test') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(called, true, 'Handler should be called');
			assert.strictEqual(res.statusCode, 200);
		});

		test('T115: should match POST routes', async () => {
			const router = new Router();
			let receivedBody: any = null;

			router.post('/api/data', async (req, res, params, body) => {
				receivedBody = body;
				res.writeHead(201);
				res.end(JSON.stringify({ success: true }));
			});

			const req = new MockRequest('POST', '/api/data', { name: 'Test' }) as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(res.statusCode, 201);
			assert.deepStrictEqual(receivedBody, { name: 'Test' });
		});

		test('T116: should return 404 for unmatched routes', async () => {
			const router = new Router();

			router.get('/api/exists', async (req, res) => {
				res.writeHead(200);
				res.end('OK');
			});

			const req = new MockRequest('GET', '/api/notfound') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(res.statusCode, 404);
			const body = res.getBodyAsJson();
			assert.strictEqual(body.error, 'Not Found');
		});

		test('T117: should handle DELETE routes', async () => {
			const router = new Router();
			let deletedId: string | null = null;

			router.delete('/api/items/:id', async (req, res, params) => {
				deletedId = params.id;
				res.writeHead(200);
				res.end(JSON.stringify({ deleted: params.id }));
			});

			const req = new MockRequest('DELETE', '/api/items/123') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.strictEqual(deletedId, '123');
		});
	});

	describe('Router - Path Parameters (T118-T120)', () => {
		test('T118: should extract single path parameter', async () => {
			const router = new Router();
			let capturedId: string | null = null;

			router.get('/users/:id', async (req, res, params) => {
				capturedId = params.id;
				res.writeHead(200);
				res.end(JSON.stringify({ userId: params.id }));
			});

			const req = new MockRequest('GET', '/users/42') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(capturedId, '42');
			assert.strictEqual(res.statusCode, 200);
		});

		test('T119: should extract multiple path parameters', async () => {
			const router = new Router();
			let params: any = null;

			router.get('/api/:resource/:id/action/:action', async (req, res, p) => {
				params = p;
				res.writeHead(200);
				res.end('OK');
			});

			const req = new MockRequest('GET', '/api/posts/99/action/publish') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.deepStrictEqual(params, {
				resource: 'posts',
				id: '99',
				action: 'publish'
			});
		});

		test('T120: should not match routes with different segment counts', async () => {
			const router = new Router();

			router.get('/api/:id', async (req, res) => {
				res.writeHead(200);
				res.end('OK');
			});

			const req = new MockRequest('GET', '/api/123/extra') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(res.statusCode, 404);
		});
	});

	describe('Router - Middleware (T121-T123)', () => {
		test('T121: should execute middleware before route handler', async () => {
			const router = new Router();
			const order: string[] = [];

			router.use(async (req, res, next) => {
				order.push('middleware');
				await next();
			});

			router.get('/test', async (req, res) => {
				order.push('handler');
				res.writeHead(200);
				res.end('OK');
			});

			const req = new MockRequest('GET', '/test') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.deepStrictEqual(order, ['middleware', 'handler']);
		});

		test('T122: should execute multiple middleware in order', async () => {
			const router = new Router();
			const order: number[] = [];

			router.use(async (req, res, next) => {
				order.push(1);
				await next();
			});

			router.use(async (req, res, next) => {
				order.push(2);
				await next();
			});

			router.use(async (req, res, next) => {
				order.push(3);
				await next();
			});

			router.get('/test', async (req, res) => {
				order.push(4);
				res.writeHead(200);
				res.end('OK');
			});

			const req = new MockRequest('GET', '/test') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.deepStrictEqual(order, [1, 2, 3, 4]);
		});

		test('T123: should execute middleware even without next call', async () => {
			const router = new Router();
			const  order: string[] = [];

			router.use(async (req, res, next) => {
				order.push('middleware1');
				// Don't call next() - middleware can run without it
			});

			router.get('/test', async (req, res) => {
				order.push('handler');
				res.writeHead(200);
				res.end('OK');
			});

			const req = new MockRequest('GET', '/test') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			// Middleware runs, then handler runs (middleware didn't call next, but also didn't end response)
			assert.strictEqual(order.length, 2);
			assert.strictEqual(order[0], 'middleware1');
			assert.strictEqual(order[1], 'handler');
		});
	});

	describe('Router - Wildcard Routes (T124-T125)', () => {
		test('T124: should use wildcard as fallback', async () => {
			const router = new Router();
			let wildcardCalled = false;

			router.get('/api/specific', async (req, res) => {
				res.writeHead(200);
				res.end('Specific');
			});

			router.get('*', async (req, res) => {
				wildcardCalled = true;
				res.writeHead(200);
				res.end('Wildcard');
			});

			const req = new MockRequest('GET', '/api/anything') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(wildcardCalled, true);
			assert.strictEqual(res.body, 'Wildcard');
		});

		test('T125: should prefer exact match over wildcard', async () => {
			const router = new Router();
			let exactCalled = false;

			router.get('/api/exact', async (req, res) => {
				exactCalled = true;
				res.writeHead(200);
				res.end('Exact');
			});

			router.get('*', async (req, res) => {
				res.writeHead(200);
				res.end('Wildcard');
			});

			const req = new MockRequest('GET', '/api/exact') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(exactCalled, true);
			assert.strictEqual(res.body, 'Exact');
		});
	});

	describe('Router - Error Handling (T126-T127)', () => {
		test('T126: should catch handler errors and return 500', async () => {
			const router = new Router();

			router.get('/api/error', async (req, res) => {
				throw new Error('Test error');
			});

			const req = new MockRequest('GET', '/api/error') as any;
			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(res.statusCode, 500);
			const body = res.getBodyAsJson();
			assert.strictEqual(body.error, 'Internal Server Error');
		});

		test('T127: should handle invalid JSON body gracefully', async () => {
			const router = new Router();

			router.post('/api/data', async (req, res, params, body) => {
				res.writeHead(200);
				res.end('OK');
			});

			const req = {
				method: 'POST',
				url: '/api/data',
				on: (event: string, handler: Function) => {
					if (event === 'data') {
						handler('{ invalid json }');
					} else if (event === 'end') {
						setImmediate(() => handler());
					}
				}
			} as any;

			const res = new MockResponse() as any;

			await router.handle(req, res);

			assert.strictEqual(res.statusCode, 500);
		});
	});
});

describe('Slide Routes Tests', () => {

	/**
	 * Mock SlideshowFeature for testing
	 */
	class MockSlideshowFeature {
		private slides: any[] = [];

		async getSlides(): Promise<any[]> {
			return [...this.slides];
		}

		async addSlide(slide: any): Promise<any> {
			this.slides.push(slide);
			return slide;
		}

		async deleteSlide(id: string): Promise<void> {
			this.slides = this.slides.filter(s => s.id !== id);
		}

		// Test helper
		reset(): void {
			this.slides = [];
		}
	}

	describe('GET /api/slides (T128-T130)', () => {
		test('T128: should return empty array when no slides', async () => {
			const mockFeature = new MockSlideshowFeature();
			const handler = createGetSlidesHandler(mockFeature as any);

			const req = new MockRequest('GET', '/api/slides') as any;
			const res = new MockResponse() as any;

			await handler(req, res, {}, undefined);

			assert.strictEqual(res.statusCode, 200);
			const body = res.getBodyAsJson();
			assert.deepStrictEqual(body, []);
		});

		test('T129: should return all slides', async () => {
			const mockFeature = new MockSlideshowFeature();
			await mockFeature.addSlide({ id: 'slide-1', title: 'Test 1', code: 'console.log(1);' });
			await mockFeature.addSlide({ id: 'slide-2', title: 'Test 2', code: 'console.log(2);' });

			const handler = createGetSlidesHandler(mockFeature as any);

			const req = new MockRequest('GET', '/api/slides') as any;
			const res = new MockResponse() as any;

			await handler(req, res, {}, undefined);

			assert.strictEqual(res.statusCode, 200);
			const body = res.getBodyAsJson();
			assert.strictEqual(body.length, 2);
			assert.strictEqual(body[0].id, 'slide-1');
			assert.strictEqual(body[1].id, 'slide-2');
		});

		test('T130: should handle undefined slideshowFeature gracefully', async () => {
			const handler = createGetSlidesHandler(undefined as any);

			const req = new MockRequest('GET', '/api/slides') as any;
			const res = new MockResponse() as any;

			await handler(req, res, {}, undefined);

			assert.strictEqual(res.statusCode, 200);
			const body = res.getBodyAsJson();
			assert.deepStrictEqual(body, []);
		});
	});

	describe('POST /api/slides (T131-T133)', () => {
		test('T131: should add new slide successfully', async () => {
			const mockFeature = new MockSlideshowFeature();
			const handler = createAddSlideHandler(mockFeature as any);

			const slideData = {
				id: 'slide-123',
				title: 'New Slide',
				concept: 'Functions',
				code: 'function test() { return true; }',
				language: 'javascript'
			};

			const req = new MockRequest('POST', '/api/slides', slideData) as any;
			const res = new MockResponse() as any;

			await handler(req, res, {}, slideData);

			assert.strictEqual(res.statusCode, 201);
			const body = res.getBodyAsJson();
			assert.strictEqual(body.success, true);
			assert.strictEqual(body.slide.id, 'slide-123');

			// Verify slide was added
			const slides = await mockFeature.getSlides();
			assert.strictEqual(slides.length, 1);
			assert.strictEqual(slides[0].id, 'slide-123');
		});

		test('T132: should return 500 if slideshowFeature is undefined', async () => {
			const handler = createAddSlideHandler(undefined as any);

			const slideData = { id: 'slide-1', title: 'Test' };

			const req = new MockRequest('POST', '/api/slides', slideData) as any;
			const res = new MockResponse() as any;

			await handler(req, res, {}, slideData);

			assert.strictEqual(res.statusCode, 500);
			const body = res.getBodyAsJson();
			assert.strictEqual(body.error, 'Slideshow feature not available');
		});

		test('T133: should handle errors during slide addition', async () => {
			const mockFeature = {
				addSlide: async () => {
					throw new Error('Database error');
				}
			};

			const handler = createAddSlideHandler(mockFeature as any);

			const slideData = { id: 'slide-1', title: 'Test' };

			const req = new MockRequest('POST', '/api/slides', slideData) as any;
			const res = new MockResponse() as any;

			await handler(req, res, {}, slideData);

			assert.strictEqual(res.statusCode, 400);
			const body = res.getBodyAsJson();
			assert.strictEqual(body.error, 'Failed to save slide');
			assert.ok(body.details.includes('Database error'));
		});
	});

	describe('DELETE /api/slides/:id (T134-T136)', () => {
		test('T134: should delete slide by id', async () => {
			const mockFeature = new MockSlideshowFeature();
			await mockFeature.addSlide({ id: 'slide-1', title: 'Test 1' });
			await mockFeature.addSlide({ id: 'slide-2', title: 'Test 2' });

			const handler = createDeleteSlideHandler(mockFeature as any);

			const req = new MockRequest('DELETE', '/api/slides/slide-1') as any;
			const res = new MockResponse() as any;

			await handler(req, res, { id: 'slide-1' }, undefined);

			assert.strictEqual(res.statusCode, 200);
			const body = res.getBodyAsJson();
			assert.strictEqual(body.success, true);

			// Verify slide was deleted
			const slides = await mockFeature.getSlides();
			assert.strictEqual(slides.length, 1);
			assert.strictEqual(slides[0].id, 'slide-2');
		});

		test('T135: should return 400 if id is missing', async () => {
			const mockFeature = new MockSlideshowFeature();
			const handler = createDeleteSlideHandler(mockFeature as any);

			const req = new MockRequest('DELETE', '/api/slides/') as any;
			const res = new MockResponse() as any;

			await handler(req, res, {}, undefined);

			assert.strictEqual(res.statusCode, 400);
			const body = res.getBodyAsJson();
			assert.strictEqual(body.error, 'Slide ID required');
		});

		test('T136: should return 500 if slideshowFeature is undefined', async () => {
			const handler = createDeleteSlideHandler(undefined as any);

			const req = new MockRequest('DELETE', '/api/slides/123') as any;
			const res = new MockResponse() as any;

			await handler(req, res, { id: '123' }, undefined);

			assert.strictEqual(res.statusCode, 500);
			const body = res.getBodyAsJson();
			assert.strictEqual(body.error, 'Slideshow feature not available');
		});
	});

	describe('Edge Cases (T137-T138)', () => {
		test('T137: should handle CORS headers correctly', async () => {
			const mockFeature = new MockSlideshowFeature();
			const handler = createGetSlidesHandler(mockFeature as any);

			const req = new MockRequest('GET', '/api/slides') as any;
			const res = new MockResponse() as any;

			await handler(req, res, {}, undefined);

			assert.strictEqual(res.headers['Access-Control-Allow-Origin'], '*');
		});

		test('T138: should maintain slide order', async () => {
			const mockFeature = new MockSlideshowFeature();
			const handler = createAddSlideHandler(mockFeature as any);

			// Add slides in specific order
			for (let i = 1; i <= 5; i++) {
				const slideData = { id: `slide-${i}`, title: `Slide ${i}`, order: i };
				const req = new MockRequest('POST', '/api/slides', slideData) as any;
				const res = new MockResponse() as any;
				await handler(req, res, {}, slideData);
			}

			// Verify order preserved
			const slides = await mockFeature.getSlides();
			assert.strictEqual(slides.length, 5);
			for (let i = 0; i < 5; i++) {
				assert.strictEqual(slides[i].id, `slide-${i + 1}`);
			}
		});
	});
});
