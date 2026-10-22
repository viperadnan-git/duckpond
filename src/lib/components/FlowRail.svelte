<!-- Left column of a guided account flow: back to Accounts, title, and where
     you are. A stage past the last step marks every step done. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';

	let {
		steps,
		stage,
		title,
		note
	}: {
		steps: { title: string; body: string }[];
		stage: number;
		title: Snippet;
		note?: Snippet;
	} = $props();

	const at = $derived(Math.min(stage, steps.length - 1));
</script>

<aside>
	<a
		href={resolve('/accounts')}
		class="inline-flex items-center gap-1.5 rounded-control text-[13px] text-muted-foreground focus-ring hover:text-foreground"
		><ArrowLeft class="size-4" />Accounts</a
	>
	<h1 class="mt-4 text-[28px] leading-tight font-bold tracking-[-0.025em] md:text-[32px]">
		{@render title()}
	</h1>

	<!-- phones: a compact progress track -->
	<div class="mt-5 md:hidden" aria-hidden="true">
		<p class="text-xs text-muted-foreground">
			Step {at + 1} of {steps.length} · {steps[at].title}
		</p>
		<div class="mt-2 grid gap-1.5" style:grid-template-columns="repeat({steps.length}, 1fr)">
			{#each steps as step, i (step.title)}
				<span
					class="h-1.5 rounded-full bg-muted transition-colors duration-300 ease-snappy {i <= stage
						? 'bg-primary'
						: ''}"
				></span>
			{/each}
		</div>
	</div>

	<!-- wider: the full rail, keys joined by a doodled line -->
	<ol class="mt-8 hidden gap-9 md:grid" aria-label="Steps">
		{#each steps as item, i (item.title)}
			<li
				class="relative grid grid-cols-[auto_1fr] gap-3 not-last:after:absolute not-last:after:top-10 not-last:after:-bottom-7 not-last:after:left-[13px] not-last:after:w-[6px] not-last:after:bg-muted-foreground/40 not-last:after:squiggle-y"
				aria-current={i === stage ? 'step' : undefined}
			>
				<span
					class="relative z-10 flex size-8 items-center justify-center rounded-key font-mono text-xs font-semibold transition-colors duration-300 ease-snappy {i <
					stage
						? 'bg-primary text-primary-foreground'
						: i === stage
							? 'text-foreground raised outline-2 outline-offset-2 outline-ring outline-solid'
							: 'text-muted-foreground raised'}"
				>
					{#if i < stage}<Check class="size-4" />{:else}{i + 1}{/if}
				</span>
				<span class={i > stage ? 'text-muted-foreground' : ''}>
					<span class="block text-sm font-semibold">{item.title}</span>
					<span class="block text-[13px] text-muted-foreground">{item.body}</span>
				</span>
			</li>
		{/each}
	</ol>

	{#if note}
		<p class="mt-10 hidden items-start gap-2 text-xs text-muted-foreground md:flex">
			{@render note()}
		</p>
	{/if}
</aside>
