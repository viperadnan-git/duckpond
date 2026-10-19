<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Check from '@lucide/svelte/icons/check';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { displayName } from '#lib/db.svelte.js';
	import { ago, copy, pending, ui } from '#lib/ui.svelte.js';
	import { addressActions } from '#lib/actions.js';
	import { siteLabel } from '#lib/domains.js';
	import Swap from './Swap.svelte';
	import type { Address } from '#lib/store.js';

	let {
		item,
		showOwner = true,
		selected = false,
		onselect
	}: {
		item: Address;
		showOwner?: boolean;
		selected?: boolean;
		onselect?: (checked: boolean) => void;
	} = $props();

	const copied = $derived(ui.copied === item.address);
	const off = $derived(item.active === false);
</script>

<div
	class="-mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-control px-2 py-2.5 transition-colors duration-150 hover:bg-foreground/[0.03] data-[fresh=true]:animate-[fresh_1.6s_ease-out] data-[selected=true]:bg-[color-mix(in_srgb,var(--link)_8%,transparent)] motion-reduce:animate-none"
	data-fresh={ui.fresh === item.address}
	data-selected={selected}
	data-off={off}
	aria-busy={pending.address === item.address}
	onanimationend={() => (ui.fresh = null)}
>
	<Checkbox
		checked={selected}
		onCheckedChange={(checked) => onselect?.(checked)}
		aria-label="Select {item.address}"
	/>
	<div class="min-w-0">
		<button
			type="button"
			class="flex max-w-full rounded-sm text-left font-mono text-[13px] leading-snug outline-none hover:text-link focus-visible:ring-3 focus-visible:ring-ring/40 in-aria-busy:animate-pulse in-data-[off=true]:text-muted-foreground in-data-[off=true]:line-through in-data-[off=true]:decoration-muted-foreground/50 motion-reduce:in-aria-busy:animate-none"
			title="Copy {item.address}"
			onclick={() => copy(item.address)}
		>
			<span class="truncate">{item.address}</span>
		</button>
		<!-- the meta line gives way to the confirmation; the address stays put -->
		<Swap swapped={copied} class="mt-1 text-xs">
			<span
				class="min-w-0 truncate text-muted-foreground [&>*+*]:before:mx-1.5 [&>*+*]:before:content-['·']"
			>
				{#if off}<Badge variant="destructive" class="h-4 px-1.5 align-[1px] text-[10px]"
						>Deactivated</Badge
					>{/if}
				{#if item.site}<span class="text-foreground" title={item.site}>{siteLabel(item.site)}</span
					>{/if}
				{#if item.note}<span class="text-foreground">{item.note}</span>{/if}
				{#if showOwner}<span class="font-semibold text-foreground">{displayName(item.account)}</span
					>{/if}
				<time datetime={new Date(item.createdAt).toISOString()}>{ago(item.createdAt)}</time>
			</span>
			{#snippet alt()}<span class="flex items-center gap-1 font-medium text-primary"
					><Check class="size-3.5" />Copied to clipboard</span
				>{/snippet}
		</Swap>
	</div>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
			aria-label="Actions for {item.address}"
		>
			<Ellipsis />
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="min-w-52">
			{#each addressActions(item) as action (action.label)}
				{#if action.group}<DropdownMenu.Separator />{/if}
				<DropdownMenu.Item
					variant={action.destructive ? 'destructive' : 'default'}
					onSelect={action.run}
				>
					<action.icon />{action.label}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
