import { RouteHandler } from '../Router';

/**
 * Slideshow routes for managing presentation slides
 */

/**
 * GET /api/slides - Get all slides
 */
export function createGetSlidesHandler(
	slideshowFeature: any
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			if (!slideshowFeature) {
				console.error('SlideshowFeature not initialized');
				res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
				res.end(JSON.stringify([]));
				return;
			}

			const slides = await slideshowFeature.getSlides();
			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify(slides));
		} catch (error) {
			console.error('Error getting slides:', error);
			res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Failed to load slides' }));
		}
	};
}

/**
 * POST /api/slides - Add new slide
 */
export function createAddSlideHandler(
	slideshowFeature: any
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			if (!slideshowFeature) {
				console.error('SlideshowFeature not initialized');
				res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
				res.end(JSON.stringify({ error: 'Slideshow feature not available' }));
				return;
			}

			const addedSlide = await slideshowFeature.addSlide(body);
			res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: true, slide: addedSlide }));
		} catch (error) {
			console.error('Error saving slide:', error);
			res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Failed to save slide', details: error instanceof Error ? error.message : String(error) }));
		}
	};
}

/**
 * DELETE /api/slides/:id - Delete a slide
 */
export function createDeleteSlideHandler(
	slideshowFeature: any
): RouteHandler {
	return async (req, res, params, body) => {
		try {
			if (!slideshowFeature) {
				res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
				res.end(JSON.stringify({ error: 'Slideshow feature not available' }));
				return;
			}

			const slideId = params.id;
			if (!slideId) {
				res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
				res.end(JSON.stringify({ error: 'Slide ID required' }));
				return;
			}

			await slideshowFeature.deleteSlide(slideId);

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ success: true, message: 'Slide deleted' }));
		} catch (error) {
			console.error('Error deleting slide:', error);
			res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Failed to delete slide' }));
		}
	};
}
