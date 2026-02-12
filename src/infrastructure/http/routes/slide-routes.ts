import {RouteHandler} from '../Router';

/**
 * Slideshow routes for managing presentation slides
 * 
 * Gracefully handles cases where SlideshowFeature is not available.
 * Returns empty data or clear error messages rather than throwing exceptions.
 */

/**
 * GET /api/slides - Get all slides
 * Returns empty array if slideshow feature not available (graceful degradation)
 */
export function createGetSlidesHandler(
    slideshowFeature: any
): RouteHandler {
    return async (req, res, params, body) => {
        try {
            // Graceful degradation: return empty array if feature not available
            if (!slideshowFeature) {
                res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                res.end(JSON.stringify([]));
                return;
            }

            const slides = await slideshowFeature.getSlides();
            res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify(slides));
        } catch (error) {
            console.error('Error getting slides:', error);
            res.writeHead(500, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify({error: 'Failed to load slides'}));
        }
    };
}

/**
 * POST /api/slides - Add new slide
 * Returns clear error if slideshow feature not available
 */
export function createAddSlideHandler(
    slideshowFeature: any
): RouteHandler {
    return async (req, res, params, body) => {
        try {
            // Feature check: return user-friendly error if not available
            if (!slideshowFeature) {
                res.writeHead(503, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                res.end(JSON.stringify({
                    error: 'Slideshow feature not available',
                    message: 'The slideshow feature is not currently enabled. Please ensure the extension is fully activated.'
                }));
                return;
            }

            const addedSlide = await slideshowFeature.addSlide(body);
            res.writeHead(201, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify({success: true, slide: addedSlide}));
        } catch (error) {
            console.error('Error saving slide:', error);
            res.writeHead(400, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify({
                error: 'Failed to save slide',
                details: error instanceof Error ? error.message : String(error)
            }));
        }
    };
}

/**
 * DELETE /api/slides/:id - Delete a slide
 * Returns clear error if slideshow feature not available
 */
export function createDeleteSlideHandler(
    slideshowFeature: any
): RouteHandler {
    return async (req, res, params, body) => {
        try {
            // Feature check: return user-friendly error if not available
            if (!slideshowFeature) {
                res.writeHead(503, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                res.end(JSON.stringify({
                    error: 'Slideshow feature not available',
                    message: 'The slideshow feature is not currently enabled. Please ensure the extension is fully activated.'
                }));
                return;
            }

            const slideId = params.id;
            if (!slideId) {
                res.writeHead(400, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                res.end(JSON.stringify({error: 'Slide ID required'}));
                return;
            }

            await slideshowFeature.deleteSlide(slideId);

            res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify({success: true, message: 'Slide deleted'}));
        } catch (error) {
            console.error('Error deleting slide:', error);
            res.writeHead(500, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            res.end(JSON.stringify({error: 'Failed to delete slide'}));
        }
    };
}
