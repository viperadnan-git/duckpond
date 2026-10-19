<!-- "Nothing here": shadcn Empty, with a doodled ring around its icon. -->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import Doodle from './Doodle.svelte';

	let {
		icon: Icon,
		title,
		children,
		actions
	}: { icon: Component; title: string; children?: Snippet; actions?: Snippet } = $props();
</script>

<div in:fade={{ duration: 150 }}>
	<Empty.Root>
		<Empty.Header>
			<Empty.Media variant="icon">
				<Icon class="size-[18px]" />
				<Doodle shape="circle" class="pointer-events-none absolute -inset-3 size-16 text-link/60" />
			</Empty.Media>
			<Empty.Title>{title}</Empty.Title>
			{#if children}<Empty.Description>{@render children()}</Empty.Description>{/if}
		</Empty.Header>
		{#if actions}
			<Empty.Content class="flex-row flex-wrap justify-center gap-2"
				>{@render actions()}</Empty.Content
			>
		{/if}
	</Empty.Root>
</div>
