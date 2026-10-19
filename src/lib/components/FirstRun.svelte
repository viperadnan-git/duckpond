<!-- Welcome view with no accounts, the app otherwise. Before storage is read,
     both are in the prerendered HTML and CSS picks one from the pre-paint
     `data-first-run` mark (+layout.svelte); nothing remounts after load. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { isFresh } from '#lib/db.svelte.js';

	let { welcome, children }: { welcome: Snippet; children: Snippet } = $props();

	const fresh = $derived(isFresh());
</script>

<div class={fresh === null ? 'hidden first-run:contents' : 'contents'}>
	{#if fresh !== false}{@render welcome()}{/if}
</div>
<div class={fresh === null ? 'contents first-run:hidden' : 'contents'}>
	{#if fresh !== true}{@render children()}{/if}
</div>
