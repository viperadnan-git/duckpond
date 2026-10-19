<!-- Crossfades two states stacked in one grid cell, so the box keeps the
     size of the larger one and nothing around it shifts. `alt` defaults to
     the copied mark. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import { cn } from '#lib/utils.js';

	let {
		swapped,
		children,
		alt,
		class: className
	}: { swapped: boolean; children: Snippet; alt?: Snippet; class?: string } = $props();

	const layer =
		'col-start-1 row-start-1 flex min-w-0 items-center gap-1.5 transition-[opacity,filter,scale] duration-200 ease-snappy motion-reduce:transition-opacity';
	// hidden state: invisible, and never part of a text selection or a click
	const hidden =
		'pointer-events-none opacity-0 blur-[2px] scale-95 select-none motion-reduce:blur-none motion-reduce:scale-100';
</script>

<span class={cn('grid min-w-0 grid-cols-[minmax(0,1fr)]', className)}>
	<span class={cn(layer, swapped && hidden)} aria-hidden={swapped}>{@render children()}</span>
	<span class={cn(layer, !swapped && hidden)} aria-hidden={!swapped}>
		{#if alt}{@render alt()}{:else}<span class="flex items-center gap-1 font-medium text-primary"
				><Check class="size-3.5" />Copied to clipboard</span
			>{/if}
	</span>
</span>
