<!-- Account keys. Accounts are named and unbounded, so they scroll sideways
     rather than sitting in fixed slots; the identity sits under them. -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import AccountInfo from './AccountInfo.svelte';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { currentAccount, db, selectAccount, status } from '#lib/db.svelte.js';
	import { copy } from '#lib/ui.svelte.js';

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

	/** Mouse users page with the edge chevrons; touch swipes. */
	const page = (dir: 1 | -1) =>
		strip?.scrollBy({
			left: dir * strip.clientWidth * 0.8,
			behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
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

<!-- a small round key in the faded edge, shown on hover; touch swipes instead -->
{#snippet arrow(dir: 1 | -1)}
	<button
		type="button"
		tabindex={-1}
		aria-hidden="true"
		data-show={more === 'both' || more === (dir < 0 ? 'left' : 'right')}
		class="pointer-events-none absolute top-1/2 z-10 grid size-7 -translate-y-[calc(50%+1px)] scale-90 place-items-center rounded-full text-muted-foreground opacity-0 raised transition-[opacity,scale,color,background-color,border-color] duration-150 ease-snappy hover:border-[color-mix(in_srgb,var(--link)_40%,var(--border))] hover:bg-[color-mix(in_srgb,var(--link)_8%,var(--raise))] hover:text-foreground active:scale-90 group-hover/strip:data-[show=true]:pointer-events-auto group-hover/strip:data-[show=true]:scale-100 group-hover/strip:data-[show=true]:opacity-100 motion-reduce:scale-100 pointer-coarse:hidden {dir <
		0
			? 'left-0'
			: 'right-0'}"
		onclick={() => page(dir)}
	>
		{#if dir < 0}<ChevronLeft class="size-4" />{:else}<ChevronRight class="size-4" />{/if}
	</button>
{/snippet}

<div class="group/strip relative">
	{@render arrow(-1)}
	{@render arrow(1)}
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
			variant="key"
			size="icon"
			aria-label="Add an account"
			title="Add an account"
			class="flex-none"
			href={resolve('/accounts/add')}
		>
			<Plus />
		</Button>
	</div>
</div>

<div class={compact ? 'grid pt-2' : 'mt-auto grid gap-0.5 pt-3'}>
	{#if !status.ready}
		<Skeleton class="h-4 w-44" /><Skeleton class="mt-1 h-3 w-56" />
	{:else if account}
		{@const who = `${account.username}@duck.com`}
		{#if !compact}<button
				type="button"
				class="w-fit max-w-full copyable text-[15px] leading-normal font-semibold [overflow-wrap:anywhere]"
				title="Copy {who}"
				onclick={() => copy(who)}
			>
				{who}
			</button>{/if}
		<AccountInfo {account} class="text-muted-foreground" />
	{:else}
		<span class="text-[13px] text-muted-foreground"
			>No account yet. Press + to sign in with your Duck username.</span
		>
	{/if}
</div>
