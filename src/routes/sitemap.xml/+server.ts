import { indexed, site } from '#lib/site.js';

export const prerender = true;

export function GET() {
	const urls = indexed.map((path) => `<url><loc>${new URL(path, site.url).href}</loc></url>`);
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`,
		{ headers: { 'Content-Type': 'application/xml' } }
	);
}
