<!-- First run, no accounts and no addresses: a landing page that shows the
     product working (a mock of the generator) before asking for anything. -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { prefersReducedMotion } from 'svelte/motion';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import List from '@lucide/svelte/icons/list';
	import Users from '@lucide/svelte/icons/users';
	import MailX from '@lucide/svelte/icons/mail-x';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { pickBackup } from '#lib/restore.svelte.js';
	import { enter } from '#lib/motion.js';
	import Doodle from './Doodle.svelte';

	const examples = [
		'putt-salt-blunt@duck.com',
		'lung-revisit-crumb@duck.com',
		'modular-ivy-upper@duck.com',
		'crazy-venus-manila@duck.com'
	];
	const rows = [
		{ address: 'putt-salt-blunt@duck.com', site: 'airline.com', when: 'just now', off: false },
		{ address: 'modular-ivy-upper@duck.com', site: 'shop.example', when: '2d ago', off: false },
		{ address: 'crazy-venus-manila@duck.com', site: 'news.site', when: '1w ago', off: true }
	];

	// the one unprompted motion on the page: the demo readout cycles
	let shown = $state(0);
	$effect(() => {
		if (prefersReducedMotion.current) return;
		const id = setInterval(() => (shown = (shown + 1) % examples.length), 2600);
		return () => clearInterval(id);
	});

	const features = [
		{
			icon: List,
			title: 'Every alias, one list',
			body: 'DuckDuckGo keeps no list of the addresses you’ve made. Duckpond does, with notes, where each one is used, and search.'
		},
		{
			icon: Users,
			title: 'All your accounts',
			body: 'Add several Duck accounts and switch between them. Every address remembers which one made it.'
		},
		{
			icon: MailX,
			title: 'Turn aliases off',
			body: 'Deactivate an address at DuckDuckGo when it starts getting spam, and switch it back on anytime.'
		},
		{
			icon: ShieldCheck,
			title: 'Stays in your browser',
			body: 'No Duckpond account or server. Backups are locked with your passphrase before they leave the page.'
		}
	];

	const steps = [
		{ title: 'Add your Duck account', body: 'Type your Duck username.' },
		{ title: 'Enter the passphrase', body: 'DuckDuckGo emails it to your forwarding address.' },
		{ title: 'Press New address', body: 'It’s copied at once and kept in your list.' }
	];
</script>

<div class="px-1">
	<!-- hero -->
	<section aria-labelledby="landing" class="mx-auto max-w-2xl pt-8 text-center md:pt-14">
		<h2
			id="landing"
			class="text-[34px] leading-[1.08] font-bold tracking-[-0.03em] text-balance md:text-[52px]"
		>
			Every Duck Address you’ve made, in
			<span class="relative whitespace-nowrap"
				>one pond.<Doodle
					shape="underline"
					draw
					width={3.5}
					class="absolute -bottom-2 left-0 h-3 w-full text-link md:-bottom-3 md:h-4"
				/></span
			>
		</h2>
		<p
			class="mx-auto mt-4 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground md:text-lg"
		>
			Make private @duck.com aliases for every site, and keep track of all of them across your
			DuckDuckGo accounts.
		</p>
		<div class="mt-7 flex flex-wrap justify-center gap-2">
			<Button size="lg" class="max-[420px]:w-full" href={resolve('/accounts/add')}
				>Add your Duck account</Button
			>
			<Button variant="outline" size="lg" class="max-[420px]:w-full" onclick={() => pickBackup()}
				>Restore a backup</Button
			>
		</div>
		<a
			href="https://duckduckgo.com/email/"
			rel="external"
			class="mt-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
		>
			No Duck address yet? Get one from DuckDuckGo<ArrowUpRight class="size-3.5" />
		</a>
	</section>

	<!-- the product, working: a mock of the generator and the list it feeds -->
	<div aria-hidden="true" class="relative mx-auto mt-12 max-w-2xl md:mt-16">
		<!-- margin notes, only where there's margin for them -->
		<div
			class="pointer-events-none absolute top-6 left-full ml-3 hidden w-40 -rotate-3 text-muted-foreground lg:block"
		>
			<p class="font-hand text-[22px] leading-tight">one tap, and it’s copied</p>
			<svg
				viewBox="0 0 120 70"
				class="mt-1 -ml-6 h-14 w-28"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path pathLength="1" class="doodle-draw" d="M70 6C60 30 40 46 10 52" /><path
					d="M20 42 8 53 22 59"
				/></svg
			>
		</div>
		<div
			class="pointer-events-none absolute right-full bottom-16 mr-3 hidden w-40 rotate-2 text-right text-muted-foreground lg:block"
		>
			<p class="font-hand text-[22px] leading-tight">every alias you make, kept</p>
			<svg
				viewBox="0 0 120 70"
				class="mt-1 -mr-4 ml-auto h-14 w-28"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path pathLength="1" class="doodle-draw" d="M40 6C52 30 76 48 110 50" /><path
					d="M98 40 111 50 99 59"
				/></svg
			>
		</div>
		<div class="panel overflow-hidden">
			<div class="p-4 md:p-5">
				<div class="flex gap-1.5">
					<span
						class="rounded-key bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground"
						>you</span
					>
					<span class="rounded-key px-3 py-2 text-[13px] font-semibold raised">work</span>
					<span class="rounded-key px-3 py-2 text-[13px] font-semibold raised">shopping</span>
				</div>
				<div class="mt-4 grid items-center gap-3.5 min-[460px]:grid-cols-[minmax(0,1fr)_auto]">
					<div class="readout min-h-[84px]">
						<span class="legend">Latest address</span>
						{#key shown}
							<span in:enter={{ y: 6 }} class="readout-text font-semibold tracking-[-0.02em]"
								>{examples[shown]}</span
							>
						{/key}
					</div>
					<span
						class="flex h-[46px] w-full items-center justify-center gap-1.5 rounded-full bg-primary font-mono text-[10px] font-semibold tracking-[0.06em] text-primary-foreground uppercase shadow-key min-[460px]:size-[84px] min-[460px]:flex-col min-[460px]:gap-0.5"
						><span>New</span><span>address</span></span
					>
				</div>
			</div>
			<ul class="border-t px-4 md:px-5">
				{#each rows as row (row.address)}
					<li class="flex items-center gap-3 border-t py-3 first:border-t-0">
						<span class="size-[18px] flex-none rounded-[5px] border border-control bg-raise"></span>
						<span class="min-w-0 flex-1">
							<span
								class="block truncate font-mono text-[13px] {row.off
									? 'text-muted-foreground line-through decoration-muted-foreground/50'
									: ''}">{row.address}</span
							>
							<span
								class="mt-1 block truncate text-xs text-muted-foreground [&>*+*]:before:mx-1.5 [&>*+*]:before:content-['·']"
							>
								{#if row.off}<Badge variant="destructive" class="h-4 px-1.5 align-[1px] text-[10px]"
										>Deactivated</Badge
									>{/if}
								<span class="text-foreground">{row.site}</span>
								<span>{row.when}</span>
							</span>
						</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>

	<!-- what it does: a hairline grid, not cards -->
	<section aria-labelledby="features" class="mx-auto mt-16 max-w-4xl md:mt-24">
		<h2 id="features" class="sr-only">What Duckpond does</h2>
		<div class="grid border-t sm:grid-cols-2">
			{#each features as f, i (f.title)}
				<div class="border-b py-6 {i % 2 === 0 ? 'sm:border-r sm:pr-6' : 'sm:pl-6'}">
					<span class="flex size-9 items-center justify-center rounded-key text-primary raised"
						><f.icon class="size-[18px]" /></span
					>
					<h3 class="mt-4 font-semibold">{f.title}</h3>
					<p class="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{f.body}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- how it works: a real sequence, so numbered -->
	<section aria-labelledby="how" class="mx-auto mt-16 max-w-4xl md:mt-24">
		<h2 id="how" class="text-xl font-bold tracking-[-0.02em] md:text-2xl">How it works</h2>
		<!-- a hand-drawn squiggle joins each key to the next: down the side on phones,
		     across on wider screens; it stops short of the keys so they read as stations -->
		<ol class="mt-6 grid gap-6 md:grid-cols-3">
			{#each steps as step, i (step.title)}
				<li
					class="relative grid grid-cols-[auto_1fr] content-start gap-3 not-last:after:absolute not-last:after:top-10 not-last:after:-bottom-4 not-last:after:left-[13px] not-last:after:w-[6px] not-last:after:bg-muted-foreground/45 not-last:after:squiggle-y md:grid-cols-1 md:not-last:after:top-[13px] md:not-last:after:-right-4 md:not-last:after:bottom-auto md:not-last:after:left-10 md:not-last:after:h-[6px] md:not-last:after:w-auto md:not-last:after:squiggle-x"
				>
					<span
						class="relative z-10 flex size-8 items-center justify-center rounded-key font-mono text-xs font-semibold raised"
						aria-hidden="true">{i + 1}</span
					>
					<span>
						<span class="block font-semibold">{step.title}</span>
						<span class="mt-0.5 block text-sm text-muted-foreground">{step.body}</span>
					</span>
				</li>
			{/each}
		</ol>
	</section>

	<!-- close -->
	<section
		aria-labelledby="start"
		class="mx-auto mt-16 flex max-w-4xl flex-col items-start gap-4 border-t pt-10 pb-4 md:mt-24 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<h2
				id="start"
				class="flex items-center gap-3 text-xl font-bold tracking-[-0.02em] md:text-2xl"
			>
				Make your first address
				<!-- a doodled arrow toward the button -->
				<Doodle shape="arrow-right" draw class="hidden h-6 w-14 text-link md:block" />
			</h2>
			<p class="mt-1 text-sm text-muted-foreground">It takes about a minute.</p>
		</div>
		<Button size="lg" class="max-[420px]:w-full" href={resolve('/accounts/add')}
			>Add your Duck account</Button
		>
	</section>
</div>
