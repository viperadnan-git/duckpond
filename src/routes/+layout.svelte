<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { ModeWatcher } from 'mode-watcher';
	import { asset, resolve } from '$app/paths';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import Nav from '#lib/components/Nav.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Doodle from '#lib/components/Doodle.svelte';
	import '@fontsource-variable/caveat';
	import NoteSheet from '#lib/components/NoteSheet.svelte';
	import Confirm from '#lib/components/Confirm.svelte';
	import UnlockSheet from '#lib/components/UnlockSheet.svelte';
	import { load } from '#lib/db.svelte.js';
	import { applyTheme, ui } from '#lib/ui.svelte.js';
	import { site } from '#lib/site.js';
	import { DEFAULT_PROXY } from '#lib/api.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// cross-fade between routes where the View Transitions API exists
	onNavigate((navigation) => {
		if (!document.startViewTransition || navigation.from?.route.id === navigation.to?.route.id)
			return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Header slides away while scrolling down and returns on any scroll up. A small
	// threshold ignores jitter; near the top it always shows.
	let headerHidden = $state(false);
	let lastY = 0;
	let ticking = false;

	function onScroll() {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(() => {
			const y = Math.max(0, window.scrollY);
			const delta = y - lastY;
			if (y < 80) headerHidden = false;
			else if (delta > 6) headerHidden = true;
			else if (delta < -6) headerHidden = false;
			if (Math.abs(delta) > 6 || y < 80) lastY = y;
			ticking = false;
		});
	}

	onMount(() => {
		load();
		applyTheme();
	});
</script>

<svelte:head>
	<link rel="icon" href={asset('favicon.svg')} type="image/svg+xml" />
	<link rel="apple-touch-icon" href={asset('apple-touch-icon.png')} />
	<link rel="manifest" href={resolve('/manifest.webmanifest')} />
	<link rel="preconnect" href={new URL(DEFAULT_PROXY).origin} />
	<meta name="author" content={site.author.name} />
	<meta name="apple-mobile-web-app-title" content={site.name} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={site.name} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:image" content={new URL(asset('og.png'), site.url).href} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="{site.name}: generate and track DuckDuckGo email aliases"
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content={site.author.twitter} />
	<meta name="twitter:creator" content={site.author.twitter} />
	<meta name="twitter:image" content={new URL(asset('og.png'), site.url).href} />
</svelte:head>

<svelte:window onscroll={onScroll} />

<ModeWatcher themeColors={site.themeColor} />
<Toaster
	position="bottom-center"
	mobileOffset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
	toastOptions={{
		classes: {
			toast:
				'!rounded-full !border-0 !bg-foreground !px-5 !py-3 !font-mono !text-xs !font-semibold !tracking-[0.04em] !text-background !shadow-lg'
		}
	}}
/>

<a
	href="#main"
	class="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-[calc(env(safe-area-inset-top)+0.5rem)] focus:left-4"
	>Skip to content</a
>

<div class="flex min-h-dvh flex-col">
	<!-- a floating faceplate, built like the panels, so the header reads as part of
	     the device rather than a generic bar -->
	<header
		style:view-transition-name="header"
		data-hidden={headerHidden}
		onfocusin={() => (headerHidden = false)}
		class="sticky top-0 z-30 mx-auto w-full max-w-[940px] pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] transition-[translate] duration-280 ease-snappy data-[hidden=true]:-translate-y-full data-[hidden=true]:duration-200 motion-reduce:transition-none md:pt-3"
	>
		<div
			class="flex h-14 panel items-center gap-3 bg-card/85 pr-2 pl-3 backdrop-blur-xl solid:bg-card"
		>
			<a
				href={resolve('/')}
				class="flex items-center gap-2.5 rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			>
				<img src={asset('favicon.svg')} alt="" width="30" height="30" class="size-[30px]" />
				<span class="text-[19px] leading-none font-extrabold tracking-[-0.02em] lowercase"
					>duck<span class="relative"
						>pond<Doodle
							shape="underline"
							width={2.5}
							class="absolute -bottom-1.5 left-0 h-2 w-full text-link"
						/></span
					></span
				>
			</a>
			<span
				class="hidden -rotate-3 font-hand text-[19px] leading-none text-muted-foreground lg:block"
				>for your duck addresses</span
			>
			<span class="flex-1"></span>
			<Nav variant="header" />
			<ThemeToggle />
		</div>
	</header>

	<div
		class="mx-auto flex w-full max-w-[940px] flex-1 flex-col pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(5.25rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] md:pt-6 md:pb-6"
	>
		<!-- flex-1 pins the footer to the viewport bottom on short pages -->
		<main id="main" style:view-transition-name="page" class="flex-1">
			{@render children()}
		</main>

		<footer
			style:view-transition-name="footer"
			class="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-1 pt-4 text-xs text-muted-foreground"
		>
			<p class="flex-1 basis-64">
				Tokens and addresses stay in this browser. Requests reach DuckDuckGo through a CORS proxy.
			</p>
			<nav aria-label="Footer" class="flex gap-4">
				<a href={resolve('/about')} class="hover:text-foreground">About</a>
				<a href={site.repo} rel="external" class="hover:text-foreground">Source</a>
				<a href="https://duckduckgo.com/email/" rel="external" class="hover:text-foreground"
					>DuckDuckGo Email</a
				>
			</nav>
		</footer>
	</div>
</div>

<!-- inline "Copied" marks are visual; this announces them -->
<p class="sr-only" aria-live="polite">{ui.copied ? 'Copied to clipboard' : ''}</p>

<Nav variant="bar" />
<NoteSheet />
<Confirm />
<UnlockSheet />
