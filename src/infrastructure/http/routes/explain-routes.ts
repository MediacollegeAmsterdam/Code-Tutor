import { RouteHandler } from '../Router';

/**
 * Explain route for generating AI explanations of code concepts
 */

/**
 * POST /api/explain - Generate explanation for highlighted text
 */
export function createExplainHandler(): RouteHandler {
	return async (req, res, params, body) => {
		try {
			const { text } = body;

			// Fallback explanations for common programming concepts
			const fallbackExplanations: Record<string, string> = {
				'int': '**Integer (int)** - Een heel getal\\n\\nEen integer is gewoon een getal zonder kommagetallen.',
				'string': '**String** - Tekst/woorden\\n\\nEen string is tekst die je tussen aanhalingstekens zet.',
				'boolean': '**Boolean** - Waar of onwaar\\n\\nEen boolean kan maar twee waarden hebben: true of false.',
				'if': '**if-statement** - Doe iets ALS...\\n\\nEen if-statement laat je code controleren en uitvoeren als een voorwaarde waar is.',
				'for': '**for-loop** - Herhaal X aantal keer\\n\\nEen for-loop voert code uit een vastgesteld aantal keer.',
				'function': '**Function** - Herbruikbare code\\n\\nEen function laat je code schrijven, opslaan, en meerdere keren gebruiken!'
			};

			const lowerText = text.toLowerCase().trim();
			let explanation = fallbackExplanations[lowerText];

			if (!explanation) {
				explanation = `**"${text}"** is een belangrijk concept in programmeren. Bekijk voorbeelden online of test het uit in je editor.`;
			}

			res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({
				explanation: explanation,
				message: explanation,
				success: true
			}));
		} catch (error) {
			console.error('Error in explain endpoint:', error);
			res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
			res.end(JSON.stringify({ error: 'Failed to generate explanation' }));
		}
	};
}
