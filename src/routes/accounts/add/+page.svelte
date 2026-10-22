<!-- Adding an account as a guided flow: username → emailed passphrase → ready.
     An access token is a shortcut straight from the first step to the last. -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Head from '#lib/components/Head.svelte';
	import Doodle from '#lib/components/Doodle.svelte';
	import FlowRail from '#lib/components/FlowRail.svelte';
	import PassphraseField from '#lib/components/PassphraseField.svelte';
	import DoneMark from '#lib/components/DoneMark.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as api from '#lib/api.js';
	import * as store from '#lib/db.svelte.js';
	import { enter } from '#lib/motion.js';
	import { Passphrase, Token, Username } from '#lib/schema.js';
	import { Flow, valid } from '#lib/flow.svelte.js';
	import type { Account } from '#lib/store.js';

	type Step = 'username' | 'token' | 'passphrase' | 'done';

	const rail = [
		{ title: 'Duck username', body: 'The part before @duck.com' },
		{ title: 'Passphrase', body: 'Emailed to you by DuckDuckGo' },
		{ title: 'Ready', body: 'Make your first address' }
	];

	let step = $state<Step>('username');
	let username = $state('');
	let passphrase = $state('');
	let token = $state('');
	const flow = new Flow();
	let added: Account | null = $state(null);
	let form: HTMLElement | undefined = $state();

	// "Sign in again" links carry the username
	onMount(() => {
		const user = new URLSearchParams(location.search).get('user');
		if (user) username = user;
	});

	const stage = $derived(step === 'done' ? 2 : step === 'passphrase' ? 1 : 0);
	const name = $derived(Username.safeParse(username).data ?? '');

	// each step starts with its first field focused
	$effect(() => {
		void step;
		tick().then(() => form?.querySelector<HTMLElement>('[data-autofocus]')?.focus());
	});

	const sendPassphrase = () =>
		flow.run(async () => {
			const user = valid(Username.safeParse(username));
			await api.requestPassphrase(store.db.settings.proxy, user);
			passphrase = '';
			flow.sent();
			step = 'passphrase';
		});

	const signIn = () =>
		flow.run(async () => {
			const otp = valid(Passphrase.safeParse(passphrase));
			const { nextAlias, addresses, ...account } = await api.signIn(
				store.db.settings.proxy,
				name,
				otp
			);
			store.addAccount(account, nextAlias ? [nextAlias, ...addresses] : addresses);
			added = account;
			step = 'done';
		});

	const addWithToken = () =>
		flow.run(async () => {
			const user = valid(Username.safeParse(username));
			const account = { username: user, token: valid(Token.safeParse(token)) };
			if (!(await api.checkToken(store.db.settings.proxy, user, account.token)))
				throw new Error('DuckDuckGo refused this token. Check it and try again.');
			store.addAccount(account);
			added = account;
			step = 'done';
		});

	function goTo(next: Step) {
		flow.error = '';
		step = next;
	}

	function again() {
		username = passphrase = token = flow.error = '';
		added = null;
		step = 'username';
	}
</script>

<Head title="Add an account" description="Sign in to a DuckDuckGo Email Protection account." />

<div class="grid gap-8 pt-2 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-12 md:pt-6">
	<FlowRail steps={rail} {stage}>
		{#snippet title()}
			Add a
			<span class="relative whitespace-nowrap"
				>Duck<Doodle
					shape="underline"
					draw
					width={3.5}
					class="absolute -bottom-1.5 left-0 h-2.5 w-full text-link"
				/></span
			>
			account
		{/snippet}
		{#snippet note()}
			<ShieldCheck class="mt-px size-4 flex-none text-link" />
			Your token stays in this browser. Duckpond has no server and keeps no copy.
		{/snippet}
	</FlowRail>

	<!-- right: the current step -->
	<section bind:this={form} class="panel p-5 md:p-8" aria-live="polite">
		{#key step}
			<div in:enter={{ y: 10 }}>
				{#if step === 'username'}
					<form
						novalidate
						onsubmit={(e) => {
							e.preventDefault();
							sendPassphrase();
						}}
					>
						<h2 class="text-xl font-bold tracking-[-0.015em]">What’s your Duck username?</h2>
						<p class="mt-1.5 max-w-prose text-sm text-muted-foreground">
							DuckDuckGo will email a one-time passphrase to the address your Duck address forwards
							to. Nothing to install, no password to remember.
						</p>
						<Field.Field class="mt-6">
							<Field.Label for="add-user">Duck username</Field.Label>
							<InputGroup.Root class="h-11">
								<InputGroup.Input
									id="add-user"
									data-autofocus
									bind:value={username}
									autocomplete="username"
									autocapitalize="none"
									spellcheck={false}
									placeholder="yourname"
									class="text-base"
									aria-invalid={flow.error ? true : undefined}
									aria-describedby={flow.error ? 'add-error' : undefined}
								/>
								<InputGroup.Addon align="inline-end">@duck.com</InputGroup.Addon>
							</InputGroup.Root>
							<Field.Error id="add-error" errors={flow.errors} />
						</Field.Field>
						<div class="mt-6 flex flex-wrap items-center gap-2">
							<Button type="submit" size="lg" disabled={flow.busy}>
								{#if flow.busy}<Spinner />{/if}Send passphrase
							</Button>
							<Button variant="outline" size="lg" onclick={() => goTo('token')}>
								<KeyRound />I have an access token
							</Button>
						</div>
					</form>
				{:else if step === 'token'}
					<form
						novalidate
						onsubmit={(e) => {
							e.preventDefault();
							addWithToken();
						}}
					>
						<h2 class="text-xl font-bold tracking-[-0.015em]">Add with an access token</h2>
						<p class="mt-1.5 max-w-prose text-sm text-muted-foreground">
							Use the permanent token from DuckDuckGo, not the emailed passphrase. DuckDuckGo checks
							it before it’s added.
						</p>
						<Field.Field class="mt-6">
							<Field.Label for="add-token-user">Duck username</Field.Label>
							<InputGroup.Root class="h-11">
								<InputGroup.Input
									id="add-token-user"
									data-autofocus
									bind:value={username}
									autocomplete="username"
									autocapitalize="none"
									spellcheck={false}
									placeholder="yourname"
									class="text-base"
								/>
								<InputGroup.Addon align="inline-end">@duck.com</InputGroup.Addon>
							</InputGroup.Root>
						</Field.Field>
						<Field.Field class="mt-4">
							<Field.Label for="add-token">Access token</Field.Label>
							<Input
								id="add-token"
								bind:value={token}
								class="h-11 font-mono text-[13px]"
								autocomplete="off"
								spellcheck={false}
								placeholder="frfwn1v…"
								aria-invalid={flow.error ? true : undefined}
								aria-describedby={flow.error ? 'add-error' : undefined}
							/>
							<Field.Error id="add-error" errors={flow.errors} />
						</Field.Field>
						<div class="mt-6 flex flex-wrap items-center gap-2">
							<Button type="submit" size="lg" disabled={flow.busy}>
								{#if flow.busy}<Spinner />{/if}Add account
							</Button>
							<Button variant="ghost" size="lg" onclick={() => goTo('username')}>
								Use a passphrase instead
							</Button>
						</div>
					</form>
				{:else if step === 'passphrase'}
					<form
						novalidate
						onsubmit={(e) => {
							e.preventDefault();
							signIn();
						}}
					>
						<h2 class="text-xl font-bold tracking-[-0.015em]">Check your inbox</h2>
						<p class="mt-1.5 max-w-prose text-sm text-muted-foreground">
							DuckDuckGo sent a one-time passphrase to the address your Duck address forwards to. It
							expires in a few minutes.
						</p>
						<div
							class="mt-4 flex w-fit max-w-full items-center gap-3 rounded-control py-1.5 pr-1.5 pl-3 sunken"
						>
							<span class="min-w-0 truncate text-[15px] font-semibold">{name}@duck.com</span>
							<Button variant="ghost" size="sm" onclick={() => goTo('username')}>Change</Button>
						</div>
						<PassphraseField
							id="add-otp"
							bind:value={passphrase}
							{flow}
							action="Sign in"
							onresend={sendPassphrase}
						/>
					</form>
				{:else if added}
					<div class="flex flex-col items-start">
						<DoneMark />
						<h2 class="mt-6 text-xl font-bold tracking-[-0.015em]">You’re in</h2>
						<p class="mt-1.5 max-w-prose text-sm text-muted-foreground">
							<span class="font-semibold text-foreground">{added.username}@duck.com</span> is ready{added.forwarding
								? `, forwarding to ${added.forwarding}`
								: ''}. Its token stays in this browser.
						</p>
						<div class="mt-6 flex flex-wrap items-center gap-2">
							<Button size="lg" href={resolve('/')}>Make your first address</Button>
							<Button variant="outline" size="lg" onclick={again}>Add another account</Button>
						</div>
					</div>
				{/if}
			</div>
		{/key}
	</section>
</div>
