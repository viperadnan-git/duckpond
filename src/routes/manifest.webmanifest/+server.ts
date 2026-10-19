import { asset, resolve } from '$app/paths';
import { site } from '#lib/site.js';

export const prerender = true;

export function GET() {
	return Response.json(
		{
			name: site.name,
			short_name: site.name,
			description: site.description,
			id: resolve('/'),
			start_url: resolve('/'),
			scope: resolve('/'),
			display: 'standalone',
			background_color: site.themeColor.light,
			theme_color: site.themeColor.light,
			icons: [
				{ src: asset('favicon.svg'), sizes: 'any', type: 'image/svg+xml' },
				{ src: asset('icon-512.png'), sizes: '512x512', type: 'image/png' },
				{
					src: asset('icon-maskable.png'),
					sizes: '512x512',
					type: 'image/png',
					purpose: 'maskable'
				}
			],
			shortcuts: [
				{ name: 'Accounts', url: resolve('/accounts') },
				{ name: 'Settings', url: resolve('/settings') }
			]
		},
		{ headers: { 'Content-Type': 'application/manifest+json' } }
	);
}
