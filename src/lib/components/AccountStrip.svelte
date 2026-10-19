<!-- Account keys. Accounts are named and unbounded, so they scroll sideways
     rather than sitting in fixed slots; the identity sits under them. -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Swap from './Swap.svelte';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { currentAccount, db, selectAccount, status } from '#lib/db.svelte.js';
	import { copy, ui } from '#lib/ui.svelte.js';

	/** Compact: the keys already name the account, so only the forwarding line shows. */
	let { compact = false }: { compact?: boolean } = $props();

	const account = $derived(currentAccount());

	let strip: HTMLDivElement | undefined = $state();
	let more = $state('');

	/** Fade whichever edge hides more keys, so a clipped key reads as scrollable. */
	function edges() {
		if (!strip) return;
		const left = strip.scrollLeft > 4;
		const right = strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 4;
		more = left && right ? 'both' : left ? 'left' : right ? 'right' : '';
	}

	// Most mice only scroll vertically, and browsers won't turn that into sideways
	// scrolling. Map it here while the strip can still move that way; at either end
	// the page scrolls as usual. Non-passive, so the page doesn't scroll as well.
	$effect(() => {
		if (!strip) return;
		const el = strip;
		const onWheel = (e: WheelEvent) => {
			if (e.shiftKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
			const max = el.scrollWidth - el.clientWidth;
			const atEnd = e.deltaY > 0 ? el.scrollLeft >= max - 1 : el.scrollLeft <= 0;
			if (max <= 0 || atEnd) return;
			e.preventDefault();
			el.scrollBy({ left: e.deltaY, behavior: 'instant' });
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});

	$effect(() => {
		void db.accounts.length;
		edges();
		const key = strip?.querySelector<HTMLElement>('[data-state=on]');
		if (strip && key) {
			const offset = key.getBoundingClientRect().left - strip.getBoundingClientRect().left;
			strip.scrollLeft += offset - (strip.clientWidth - key.offsetWidth) / 2;
		}
	});
</script>

<svelte:window onresize={edges} />

<div
	bind:this={strip}
	onscroll={edges}
	data-more={more}
	class="flex snap-x snap-proximity [scrollbar-width:none] gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 data-[more=both]:[mask-image:linear-gradient(90deg,transparent,#000_34px,#000_calc(100%-34px),transparent)] data-[more=left]:[mask-image:linear-gradient(90deg,transparent,#000_34px)] data-[more=right]:[mask-image:linear-gradient(90deg,#000_calc(100%-34px),transparent)] [&::-webkit-scrollbar]:hidden"
>
	<ToggleGroup.Root
		type="single"
		variant="key"
		spacing={1.5}
		value={db.current ?? ''}
		onValueChange={(v) => v && selectAccount(v)}
		aria-label="Account"
		class="flex-none"
	>
		{#each db.accounts as a (a.username)}
			<ToggleGroup.Item
				value={a.username}
				title="{a.username}@duck.com"
				class="h-auto max-w-[190px] flex-none snap-start px-3 py-2 leading-tight pointer-coarse:py-3"
			>
				<span class="truncate">{a.label || a.username}</span>
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>
	<Button
		variant="outline"
		size="icon"
		aria-label="Add an account"
		title="Add an account"
		class="flex-none rounded-key text-muted-foreground hover:text-foreground"
		href={resolve('/accounts/add')}
	>
		<Plus />
	</Button>
</div>

<div class={compact ? 'grid pt-2' : 'mt-auto grid gap-0.5 pt-3'}>
	{#if !status.ready}
		<Skeleton class="h-4 w-44" /><Skeleton class="mt-1 h-3 w-56" />
	{:else if account}
		{@const who = `${account.username}@duck.com`}
		{#if !compact}<button
				type="button"
				class="w-fit max-w-full rounded-[4px] text-left text-[15px] leading-normal font-semibold [overflow-wrap:anywhere] outline-none hover:text-link focus-visible:ring-3 focus-visible:ring-ring/40"
				title="Copy {who}"
				onclick={() => copy(who)}
			>
				{who}
			</button>{/if}
		<Swap swapped={ui.copied === who} class="text-[13px]">
			<span class="min-w-0 truncate text-muted-foreground">
				{account.forwarding ? `Forwards to ${account.forwarding}` : 'Signed in with a token'}
			</span>
			{#snippet alt()}<span class="flex items-center gap-1 font-medium text-primary"
					><Check class="size-3.5" />Copied to clipboard</span
				>{/snippet}
		</Swap>
		{#if !account.token}
			<span class="text-[13px] text-destructive"
				>No token. Sign in again to generate addresses.</span
			>
		{/if}
	{:else}
		<span class="text-[13px] text-muted-foreground"
			>No account yet. Press + to sign in with your Duck username.</span
		>
	{/if}
</div>
