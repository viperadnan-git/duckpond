<script lang="ts">
	import { page } from '$app/state';
	import { site } from '#lib/site.js';

	let {
		title,
		description = site.description,
		index = false
	}: { title?: string; description?: string; index?: boolean } = $props();

	const fullTitle = $derived(title ? `${title} · ${site.name}` : site.title);
	const url = $derived(new URL(page.url.pathname, site.url).href);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta
		name="robots"
		content={index ? 'index, follow, max-image-preview:large' : 'noindex, follow'}
	/>
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
</svelte:head>
