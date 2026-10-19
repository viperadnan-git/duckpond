<script lang="ts">
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { resolve } from '$app/paths';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Head from '#lib/components/Head.svelte';
	import JsonLd from '#lib/components/JsonLd.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import AccountStrip from '#lib/components/AccountStrip.svelte';
	import Welcome from '#lib/components/Welcome.svelte';
	import AddressList from '#lib/components/AddressList.svelte';
	import Swap from '#lib/components/Swap.svelte';
	import Doodle from '#lib/components/Doodle.svelte';
	import { enter } from '#lib/motion.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { currentAccount, db, status } from '#lib/db.svelte.js';
	import { copy, generate, latest, plural, ui } from '#lib/ui.svelte.js';
	import { site } from '#lib/site.js';

	const account = $derived(currentAccount());
	const last = $derived(latest());
	const canGenerate = $derived(!!account?.token && !ui.generating);

	/** N new address, C copy latest, / search. Ignored while typing or with a dialog open. */
	function shortcut(e: KeyboardEvent) {
		if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
		const el = e.target as HTMLElement;
		if (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
		if (document.querySelector('[role=dialog], [role=alertdialog], [role=menu]')) return;
		const key = e.key.toLowerCase();
		if (key === 'n' && canGenerate) generate();
		else if (key === 'c' && last) copy(last.address, 'hero');
		else if (key === '/') document.getElementById('address-search')?.focus();
		else return;
		e.preventDefault();
	}

	const app = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: site.name,
		alternateName: 'Duck Address Generator',
		url: site.url,
		description: site.description,
		applicationCategory: 'SecurityApplication',
		operatingSystem: 'Any',
		browserRequirements: 'Requires JavaScript and localStorage',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		author: {
			'@type': 'Person',
			name: site.author.name,
			alternateName: site.author.alias,
			url: site.author.url
		}
	};
</script>

<svelte:window onkeydown={shortcut} />

<Head index />
<JsonLd data={app} />

<h1 class="sr-only">Duckpond: Duck Address generator and alias manager for DuckDuckGo</h1>

{#if status.ready && !db.accounts.length}
	<Welcome />
{:else}
	<div class="grid gap-4">
		<!-- duckmail's rack: account on the left, the generator takes the larger share -->
		<!-- tablets and up: duckmail's two panels; phones: one compact module, so the
	     list starts within the first screen -->
		<div class="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
			<Panel title="Account" id="account" class="hidden md:flex">
				{#snippet actions()}
					<a href={resolve('/accounts')} class="text-xs text-muted-foreground hover:text-foreground"
						>Manage</a
					>
				{/snippet}
				<AccountStrip />
			</Panel>

			<Panel title="Generate" id="generate">
				{#snippet actions()}
					{#if account}
						<span class="text-xs text-muted-foreground tabular-nums"
							>{plural(account.generated || 0, 'address')} made</span
						>
					{/if}
				{/snippet}

				<div class="mb-4 md:hidden"><AccountStrip compact /></div>

				<div class="grid items-center gap-3.5 min-[460px]:grid-cols-[minmax(0,1fr)_auto]">
					<!-- recessed readout: the one place an alias is big enough to read across a desk -->
					<div
						class="flex min-h-[92px] flex-col justify-center gap-2.5 overflow-hidden rounded-key p-3.5 sunken"
					>
						<Swap swapped={ui.copied === 'hero'} class="legend">
							Latest address
							{#snippet alt()}<span class="text-primary">Copied to clipboard</span>{/snippet}
						</Swap>
						{#if last}
							{#key last.address}
								<button
									in:enter={{ y: 4 }}
									type="button"
									class="w-fit max-w-full rounded-[4px] text-left font-mono text-[clamp(15px,4.2vw,18px)] leading-[1.35] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] outline-none hover:text-link focus-visible:ring-3 focus-visible:ring-ring/40 data-[fresh=true]:animate-[fresh_1.6s_ease-out] motion-reduce:animate-none md:text-[15px] lg:text-[18px]"
									data-fresh={ui.fresh === last.address}
									title="Copy {last.address}"
									onclick={() => copy(last.address, 'hero')}
								>
									{last.address}
								</button>
							{/key}
						{:else}
							<p
								class="font-mono text-[clamp(15px,4.2vw,18px)] leading-[1.35] text-muted-foreground md:text-[15px] lg:text-[18px]"
							>
								{#if status.ready && account}
									<span class="inline-flex items-center gap-2"
										>Press new address<Doodle
											shape="arrow-right"
											class="hidden h-5 w-11 text-link min-[460px]:block"
										/><Doodle
											shape="arrow-down"
											class="h-7 w-4 translate-y-1 text-link min-[460px]:hidden"
										/></span
									>
								{:else}—{/if}
							</p>
						{/if}
					</div>

					<!-- the encoder: a round key beside the readout, a full-width bar on phones -->
					<button
						type="button"
						class="flex h-[46px] w-full items-center justify-center gap-1.5 rounded-full bg-primary font-mono text-[10px] leading-[1.35] font-semibold tracking-[0.06em] text-primary-foreground uppercase shadow-key transition-[translate,box-shadow,opacity] duration-120 ease-snappy hover:-translate-y-px active:translate-y-[3px] active:shadow-none disabled:translate-y-0 disabled:opacity-50 disabled:shadow-key min-[460px]:size-[92px] min-[460px]:flex-col min-[460px]:gap-0.5 min-[460px]:text-[11px]"
						disabled={!canGenerate}
						title="New address (N)"
						aria-keyshortcuts="N"
						onclick={generate}
					>
						{#if ui.generating}
							<Spinner class="size-5" />
						{:else}
							<span>New</span><span>address</span>
						{/if}
					</button>
				</div>

				<div class="mt-3 grid grid-cols-2 gap-2 min-[460px]:flex">
					<Button
						variant="outline"
						size="sm"
						disabled={!last}
						title="Copy (C)"
						aria-keyshortcuts="C"
						onclick={() => last && copy(last.address, 'hero')}
					>
						<Swap swapped={ui.copied === 'hero'} class="justify-items-center">
							<span class="flex items-center gap-1.5"><Copy />Copy</span>
							{#snippet alt()}<span class="flex items-center gap-1.5"><Check />Copied</span
								>{/snippet}
						</Swap>
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={!last}
						onclick={() => last && (ui.noting = last.address)}
					>
						<NotebookPen />{last?.note ? 'Edit note' : 'Add note'}
					</Button>
				</div>
			</Panel>
		</div>

		<AddressList />
	</div>
{/if}
