<!-- Dialog on wide screens, bottom drawer on phones: one API for both. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';

	let {
		open = $bindable(false),
		title,
		description,
		children
	}: {
		open?: boolean;
		title: string;
		description?: string;
		children?: Snippet;
	} = $props();

	const wide = new MediaQuery('min-width: 48rem');
</script>

{#if wide.current}
	<Dialog.Root bind:open>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				{#if description}<Dialog.Description>{description}</Dialog.Description>{/if}
			</Dialog.Header>
			{@render children?.()}
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open shouldScaleBackground={false}>
		<Drawer.Content class="pb-[max(1rem,env(safe-area-inset-bottom))]">
			<Drawer.Header class="text-left">
				<Drawer.Title>{title}</Drawer.Title>
				{#if description}<Drawer.Description>{description}</Drawer.Description>{/if}
			</Drawer.Header>
			<div class="overflow-y-auto px-4">{@render children?.()}</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
