import { site } from '#lib/site.js';

export const prerender = true;

export function GET() {
	return new Response(
		`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site.url).href}\n`,
		{
			headers: { 'Content-Type': 'text/plain' }
		}
	);
}
