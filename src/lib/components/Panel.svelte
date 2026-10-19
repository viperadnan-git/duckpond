<!-- The app's panel: shadcn Card with a heading in its faceplate header. A thin
     composition so every page gets the same structure and semantics. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { cn } from '#lib/utils.js';

	let {
		title,
		id,
		actions,
		footnote,
		flush = false,
		children,
		class: className
	}: {
		title: string;
		id?: string;
		actions?: Snippet;
		footnote?: Snippet;
		/** Body without padding, for full-bleed rows like accordions. */
		flush?: boolean;
		children: Snippet;
		class?: string;
	} = $props();
</script>

<Card.Root role="region" aria-labelledby={id} class={className}>
	<Card.Header>
		<Card.Title><h2 {id}>{title}</h2></Card.Title>
		{#if actions}<Card.Action>{@render actions()}</Card.Action>{/if}
	</Card.Header>
	<Card.Content class={cn(flush && 'p-0')}>
		{@render children()}
	</Card.Content>
	{#if footnote}<Card.Footer>{@render footnote()}</Card.Footer>{/if}
</Card.Root>
