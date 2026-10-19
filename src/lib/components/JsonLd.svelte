<script lang="ts">
	let { data }: { data: object } = $props();

	// `<` escaped so the JSON can't close the tag; closing tag split so this file's own <script> survives
	const html = $derived(
		`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</${'script'}>`
	);
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static JSON, escaped above -->
	{@html html}
</svelte:head>
