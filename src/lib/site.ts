// Single source for metadata: <head>, manifest, sitemap, robots.

export const site = {
	name: 'Duckpond',
	title: 'Duckpond — Duck Address Generator & Alias Manager',
	description:
		'Generate @duck.com email aliases and keep a searchable record of every one, across multiple DuckDuckGo Email Protection accounts. Runs in your browser; tokens and addresses never leave your device.',
	url: 'https://duck.viperadnan.com',
	repo: 'https://github.com/viperadnan-git/duckpond',
	author: {
		name: 'Adnan Ahmad',
		alias: 'viperadnan',
		url: 'https://viperadnan.com',
		twitter: '@viperadn'
	},
	/** Default relay for DuckDuckGo's API; the target URL is appended, encoded. Swappable in Settings. */
	proxy: {
		url: 'https://cors.viperadnan.com/?url=',
		/** Who runs it, as shown on the About page. */
		operator: 'Duckpond’s author'
	},
	/** Light and dark backgrounds, mirrored in layout.css. */
	themeColor: { light: '#f0f4ff', dark: '#111111' }
} as const;

/** Routes search engines should index; the rest only show on-device data. */
export const indexed = ['/', '/about'] as const;
