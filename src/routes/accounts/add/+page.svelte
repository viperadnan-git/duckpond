<!-- Adding an account as a guided flow: username → emailed passphrase → ready.
     An access token is a shortcut straight from the first step to the last. -->
<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Head from '#lib/components/Head.svelte';
	import Doodle from '#lib/components/Doodle.svelte';
	import PassphraseInput from '#lib/components/PassphraseInput.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as api from '#lib/api.js';
	import * as store from '#lib/db.svelte.js';
	import { enter } from '#lib/motion.js';
	import { Passphrase, Token, Username, firstError } from '#lib/schema.js';
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
	let error = $state('');
	let busy = $state(false);
	let cooldown = $state(0);
	let added: Account | null = $state(null);
	let form: HTMLElement | undefined = $state();

	const stage = $derived(step === 'done' ? 2 : step === 'passphrase' ? 1 : 0);
	const name = $derived(Username.safeParse(username).data ?? '');

	// each step starts with its first field focused
	$effect(() => {
		void step;
		tick().then(() => form?.querySelector<HTMLElement>('[data-autofocus]')?.focus());
	});

	/** Throws the schema's message so the step shows one inline error. */
	function valid<T>(
		result: { success: true; data: T } | { success: false; error: import('zod').ZodError }
	) {
		if (!result.success) throw new Error(firstError(result.error));
		return result.data;
	}

	async function run(action: () => Promise<void>) {
		error = '';
		busy = true;
		try {
			await action();
		} catch (err) {
			error = (err as Error).message;
		} finally {
			busy = false;
		}
	}

	function startCooldown() {
		cooldown = 30;
		const id = setInterval(() => {
			cooldown -= 1;
			if (cooldown <= 0) clearInterval(id);
		}, 1000);
	}

	const sendPassphrase = () =>
		run(async () => {
			const user = valid(Username.safeParse(username));
			await api.requestPassphrase(store.db.settings.proxy, user);
			passphrase = '';
			startCooldown();
			step = 'passphrase';
		});

	const signIn = () =>
		run(async () => {
			const otp = valid(Passphrase.safeParse(passphrase));
			const { nextAlias, addresses, ...account } = await api.signIn(
				store.db.settings.proxy,
				name,
				otp
			);
			store.addAccount(account);
			for (const address of addresses)
				store.recordAddress(address, account.username, { count: false });
			if (nextAlias) store.recordAddress(nextAlias, account.username, { count: false });
			added = account;
			step = 'done';
		});

	const addWithToken = () =>
		run(async () => {
			const user = valid(Username.safeParse(username));
			const account = { username: user, token: valid(Token.safeParse(token)), generated: 0 };
			store.addAccount(account);
			added = account;
			step = 'done';
		});

	function goTo(next: Step) {
		error = '';
		step = next;
	}

	function again() {
		username = passphrase = token = error = '';
		added = null;
		step = 'username';
	}
</script>

<Head title="Add an account" description="Sign in to a DuckDuckGo Email Protection account." />

<div class="grid gap-8 pt-2 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-12 md:pt-6">
	<!-- left: where you are in the flow -->
	<aside>
		<a
			href={resolve('/accounts')}
			class="inline-flex items-center gap-1.5 rounded-control text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			><ArrowLeft class="size-4" />Accounts</a
		>
		<h1 class="mt-4 text-[28px] leading-tight font-bold tracking-[-0.025em] md:text-[32px]">
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
		</h1>

		<!-- phones: a compact progress track -->
		<div class="mt-5 md:hidden" aria-hidden="true">
			<p class="text-xs text-muted-foreground">Step {stage + 1} of 3 · {rail[stage].title}</p>
			<div class="mt-2 grid grid-cols-3 gap-1.5">
				{#each [0, 1, 2] as i (i)}
					<span
						class="h-1.5 rounded-full bg-muted transition-colors duration-300 ease-snappy {i <=
						stage
							? 'bg-primary'
							: ''}"
					></span>
				{/each}
			</div>
		</div>

		<!-- wider: the full rail, keys joined by a doodled line -->
		<ol class="mt-8 hidden gap-9 md:grid" aria-label="Steps">
			{#each rail as item, i (item.title)}
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

		<p class="mt-10 hidden items-start gap-2 text-xs text-muted-foreground md:flex">
			<ShieldCheck class="mt-px size-4 flex-none text-link" />
			Your token stays in this browser. Duckpond has no server and keeps no copy.
		</p>
	</aside>

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
									aria-invalid={error ? true : undefined}
									aria-describedby={error ? 'add-error' : undefined}
								/>
								<InputGroup.Addon align="inline-end">@duck.com</InputGroup.Addon>
							</InputGroup.Root>
							<Field.Error id="add-error" errors={error ? [{ message: error }] : undefined} />
						</Field.Field>
						<div class="mt-6 flex flex-wrap items-center gap-2">
							<Button type="submit" size="lg" disabled={busy}>
								{#if busy}<Spinner />{/if}Send passphrase
							</Button>
							<Button variant="ghost" size="lg" onclick={() => goTo('token')}>
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
							Use the permanent token from DuckDuckGo, not the emailed passphrase. It’s checked the
							first time you make an address.
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
								aria-invalid={error ? true : undefined}
								aria-describedby={error ? 'add-error' : undefined}
							/>
							<Field.Error id="add-error" errors={error ? [{ message: error }] : undefined} />
						</Field.Field>
						<div class="mt-6 flex flex-wrap items-center gap-2">
							<Button type="submit" size="lg" disabled={busy}>Add account</Button>
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
							DuckDuckGo sent a one-time passphrase to the address
							<span class="font-semibold text-foreground">{name}@duck.com</span> forwards to. It expires
							in a few minutes.
						</p>
						<Field.Field class="mt-6">
							<div class="flex items-baseline justify-between gap-3">
								<Field.Label for="add-otp">Passphrase</Field.Label>
								<span class="hidden -rotate-2 font-hand text-lg leading-none text-link sm:block"
									>not there? check spam</span
								>
							</div>
							<PassphraseInput
								id="add-otp"
								autofocus
								bind:value={passphrase}
								invalid={!!error}
								describedby={error ? 'add-error' : undefined}
							/>
							<Field.Error id="add-error" errors={error ? [{ message: error }] : undefined} />
						</Field.Field>
						<div class="mt-6 flex flex-wrap items-center gap-2">
							<Button type="submit" size="lg" disabled={busy}>
								{#if busy}<Spinner />{/if}Sign in
							</Button>
							<Button
								variant="ghost"
								size="lg"
								disabled={busy || cooldown > 0}
								onclick={sendPassphrase}
							>
								{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend passphrase'}
							</Button>
						</div>
						<button
							type="button"
							class="mt-4 rounded-control text-[13px] text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
							onclick={() => goTo('username')}
						>
							Use a different username
						</button>
					</form>
				{:else if added}
					<div class="flex flex-col items-start">
						<span
							class="relative flex size-12 items-center justify-center rounded-key bg-primary text-primary-foreground"
						>
							<Check class="size-6" />
							<Doodle
								shape="circle"
								draw
								class="pointer-events-none absolute -inset-3.5 size-[76px] text-link/70"
							/>
						</span>
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
