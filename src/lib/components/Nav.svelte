<!-- The mode switch: a key track in the header from md up, a bottom key bar on
     phones. Hidden copies are display:none, so view-transition names never clash. -->
<script lang="ts">
	import { navigating, page } from '$app/state';
	import { resolve } from '$app/paths';
	import Mail from '@lucide/svelte/icons/mail';
	import Users from '@lucide/svelte/icons/users';
	import Settings from '@lucide/svelte/icons/settings';
	import Info from '@lucide/svelte/icons/info';
	import { cn } from '#lib/utils.js';

	let { variant }: { variant: 'header' | 'bar' } = $props();

	const tabs = [
		{ href: resolve('/'), label: 'Addresses', icon: Mail },
		{ href: resolve('/accounts'), label: 'Accounts', icon: Users },
		{ href: resolve('/settings'), label: 'Settings', icon: Settings },
		{ href: resolve('/about'), label: 'About', icon: Info }
	];

	// follow the click, not the finished navigation: the key moves the moment you
	// press, instead of after the next page has loaded
	const path = $derived(navigating.to?.url.pathname ?? page.url.pathname);
	// nested pages (like /accounts/add) light up their section's tab
	const active = $derived(
		tabs.findIndex(
			(t) => path === t.href || (t.href !== resolve('/') && path.startsWith(`${t.href}/`))
		)
	);

	const key =
		// colour and press share the indicator's timing so label and key land together
		'flex items-center justify-center rounded-full font-mono text-[10px] leading-none font-semibold tracking-[0.08em] text-muted-foreground uppercase outline-none transition-[color,background-color,scale] duration-240 ease-snappy select-none active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring data-[active=true]:text-foreground motion-reduce:transition-none';
</script>

<!-- One indicator slides under equal-width keys with a plain CSS transition, so it
     always paints beneath the labels (a view-transition name would lift it above). -->
{#snippet indicator(radius: string)}
	<span
		aria-hidden="true"
		style:translate="calc({active} * (100% + 2px)) 0"
		class={cn(
			'pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-12px)/4)] bg-raise shadow-raise transition-[translate] duration-240 ease-snappy motion-reduce:transition-none',
			radius,
			active < 0 && 'hidden'
		)}
	></span>
{/snippet}

{#if variant === 'header'}
	<nav aria-label="Main" class="hidden md:block">
		<ul class="relative grid grid-cols-4 gap-0.5 rounded-full p-[3px] sunken">
			{@render indicator('rounded-full')}
			{#each tabs as tab, i (tab.href)}
				<li class="relative">
					<a
						href={tab.href}
						aria-current={tab.href === page.url.pathname ? 'page' : undefined}
						data-active={i === active}
						class={cn(
							key,
							'px-3 py-2 hover:bg-foreground/5 hover:text-foreground data-[active=true]:hover:bg-transparent'
						)}>{tab.label}</a
					>
				</li>
			{/each}
		</ul>
	</nav>
{:else}
	<!-- edge to edge: no border or gutter; a soft shadow separates it from content -->
	<nav
		aria-label="Main"
		style:view-transition-name="bar"
		class="fixed inset-x-0 bottom-0 z-40 bg-card/90 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] shadow-[0_-1px_0_rgb(0_0_0/0.04),0_-8px_24px_rgb(0_0_0/0.06)] backdrop-blur-xl md:hidden dark:shadow-[0_-1px_0_rgb(255_255_255/0.04),0_-8px_24px_rgb(0_0_0/0.4)] solid:bg-card"
	>
		<ul class="relative grid grid-cols-4">
			<!-- one pill slides between icons with a plain CSS transition -->
			<span
				aria-hidden="true"
				style:translate="{active * 100}% 0"
				class={cn(
					'pointer-events-none absolute top-2 left-0 flex h-8 w-1/4 justify-center transition-[translate] duration-240 ease-snappy motion-reduce:transition-none',
					active < 0 && 'hidden'
				)}
			>
				<span class="w-14 rounded-full bg-secondary"></span>
			</span>
			{#each tabs as tab, i (tab.href)}
				<li class="relative">
					<a
						href={tab.href}
						aria-current={tab.href === page.url.pathname ? 'page' : undefined}
						data-active={i === active}
						class={cn(key, 'h-16 flex-col justify-start gap-1.5 rounded-none pt-2')}
					>
						<span class="flex h-8 items-center">
							<tab.icon
								class="size-5 transition-colors duration-240 ease-snappy in-data-[active=true]:text-secondary-foreground"
								strokeWidth={2}
								aria-hidden="true"
							/>
						</span>
						{tab.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
