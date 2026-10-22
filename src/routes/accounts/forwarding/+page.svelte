<!-- Changing where an account's mail goes, as DuckDuckGo's own site does it:
     a passphrase to the current inbox proves the account, a review shows the
     swap, and a passphrase to the new inbox proves that one. -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Users from '@lucide/svelte/icons/users';
	import Head from '#lib/components/Head.svelte';
	import Doodle from '#lib/components/Doodle.svelte';
	import FlowRail from '#lib/components/FlowRail.svelte';
	import PassphraseField from '#lib/components/PassphraseField.svelte';
	import DoneMark from '#lib/components/DoneMark.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as api from '#lib/api.js';
	import * as store from '#lib/db.svelte.js';
	import { enter } from '#lib/motion.js';
	import { Forwarding, Passphrase } from '#lib/schema.js';
	import { Flow, valid } from '#lib/flow.svelte.js';

	type Step = 'start' | 'passphrase' | 'address' | 'review' | 'code' | 'done';

	const rail = [
		{ title: 'Confirm it’s you', body: 'Passphrase to your current inbox' },
		{ title: 'New address', body: 'Where mail should go' },
		{ title: 'Verify it', body: 'Passphrase to the new inbox' }
	];
	const stages: Record<Step, number> = {
		start: 0,
		passphrase: 0,
		address: 1,
		review: 1,
		code: 2,
		done: 3
	};

	/** From the account menu's link; otherwise the account in use, once storage loads. */
	let param = $state('');
	let step = $state<Step>('start');
	let passphrase = $state('');
	let email = $state('');
	/** False when the new address's domain can't take replies from the Duck address. */
	let replies = $state(true);
	/** Where mail went before, kept for the done screen once the account is updated. */
	let from = $state('');
	const flow = new Flow();
	let form: HTMLElement | undefined = $state();

	onMount(() => (param = new URLSearchParams(location.search).get('user') ?? ''));

	const username = $derived(param || store.db.current || '');
	const account = $derived(store.accountFor(username));
	const who = $derived(`${username}@duck.com`);
	const proxy = () => store.db.settings.proxy;

	/** Proves the account; a change token from DuckDuckGo, never stored. */
	let token = '';
	let change: api.Change | null = null;

	$effect(() => {
		void step;
		tick().then(() => form?.querySelector<HTMLElement>('[data-autofocus]')?.focus());
	});

	const sendPassphrase = () =>
		flow.run(async () => {
			await api.requestChangePassphrase(proxy(), username);
			passphrase = '';
			flow.sent();
			step = 'passphrase';
		});

	const confirm = () =>
		flow.run(async () => {
			token = await api.confirmChange(proxy(), username, valid(Passphrase.safeParse(passphrase)));
			step = 'address';
		});

	const review = () =>
		flow.run(async () => {
			const next = valid(Forwarding.safeParse(email));
			replies = await api.supportsReplies(proxy(), next);
			email = next;
			step = 'review';
		});

	/** Also resends the passphrase to the new inbox. */
	const submit = () =>
		flow.run(() =>
			api.changeForwarding(proxy(), token, username, email, replies).then(settle, expired)
		);

	const verify = () =>
		flow.run(async () => {
			if (!change) return;
			const otp = valid(Passphrase.safeParse(passphrase));
			await api.confirmForwarding(proxy(), change, otp).then(settle, expired);
		});

	/** The change token only lasts a while; a 401 means starting over, not signing in. */
	function expired(err: unknown): never {
		if (err instanceof api.ApiError && err.status === 401) {
			step = 'start';
			throw new Error('That confirmation expired. Send a new passphrase to start again.');
		}
		throw err;
	}

	function settle(result: api.Change) {
		change = result;
		// what was sent, even if the field changed while waiting
		email = String(result.form.get('email'));
		if (result.status === 'confirm')
			throw new Error(
				'DuckDuckGo didn’t change the address and emailed your current inbox to say why.'
			);
		if (result.status === 'verify') {
			passphrase = '';
			flow.sent();
			step = 'code';
			return;
		}
		from = account?.forwarding ?? '';
		store.setForwardingAddress(username, email);
		step = 'done';
	}

	function goTo(next: Step) {
		flow.error = '';
		step = next;
	}
</script>

<Head title="Change forwarding address" description="Change where a Duck address forwards mail." />

<div class="grid gap-8 pt-2 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-12 md:pt-6">
	<FlowRail steps={rail} stage={stages[step]}>
		{#snippet title()}
			Change where mail
			<span class="relative whitespace-nowrap"
				>goes<Doodle
					shape="underline"
					draw
					width={3.5}
					class="absolute -bottom-1.5 left-0 h-2.5 w-full text-link"
				/></span
			>
		{/snippet}
		{#snippet note()}
			<ShieldCheck class="mt-px size-4 flex-none text-link" />
			Duckpond keeps neither passphrase. Like every request, they pass through the CORS proxy.
		{/snippet}
	</FlowRail>

	<section bind:this={form} class="panel p-5 md:p-8" aria-live="polite">
		{#if !store.status.ready}
			<Skeleton class="h-6 w-56" /><Skeleton class="mt-3 h-4 w-full max-w-sm" />
		{:else if !account}
			<EmptyState icon={Users} title="Pick an account first">
				Open the menu on an account and choose Change forwarding address.
				{#snippet actions()}
					<Button href={resolve('/accounts')}>Go to accounts</Button>
				{/snippet}
			</EmptyState>
		{:else}
			{#key step}
				<div in:enter={{ y: 10 }}>
					{#if step === 'start'}
						<form
							novalidate
							onsubmit={(e) => {
								e.preventDefault();
								sendPassphrase();
							}}
						>
							<h2 class="text-xl font-bold tracking-[-0.015em]">First, confirm it’s you</h2>
							<p class="mt-1.5 max-w-prose text-sm text-muted-foreground">
								DuckDuckGo will email a one-time passphrase to the inbox
								<span class="font-semibold text-foreground">{who}</span> forwards to now.
							</p>
							{#if account.forwarding}
								<p
									class="mt-4 w-fit max-w-full rounded-control px-3 py-2 text-[15px] font-semibold [overflow-wrap:anywhere] sunken"
								>
									{account.forwarding}
								</p>
							{/if}
							<Field.Error class="mt-4" errors={flow.errors} />
							<div class="mt-6 flex flex-wrap items-center gap-2">
								<Button type="submit" size="lg" disabled={flow.busy} data-autofocus>
									{#if flow.busy}<Spinner />{/if}Send passphrase
								</Button>
							</div>
						</form>
					{:else if step === 'passphrase' || step === 'code'}
						{@const isCode = step === 'code'}
						<form
							novalidate
							onsubmit={(e) => {
								e.preventDefault();
								if (isCode) verify();
								else confirm();
							}}
						>
							<h2 class="text-xl font-bold tracking-[-0.015em]">
								{isCode ? 'Check the new inbox' : 'Check your inbox'}
							</h2>
							<p class="mt-1.5 max-w-prose text-sm text-muted-foreground">
								DuckDuckGo sent a one-time passphrase to
								<span class="font-semibold text-foreground"
									>{isCode ? email : account.forwarding || `the inbox ${who} forwards to`}</span
								>. It expires in a few minutes.
							</p>
							<PassphraseField
								id="fwd-otp"
								bind:value={passphrase}
								{flow}
								action={isCode ? 'Change forwarding address' : 'Continue'}
								onresend={isCode ? submit : sendPassphrase}
							/>
							{#if isCode}
								<button
									type="button"
									class="mt-4 rounded-control text-[13px] text-muted-foreground underline-offset-4 focus-ring hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
									disabled={flow.busy}
									onclick={() => goTo('address')}
								>
									Use a different address
								</button>
							{/if}
						</form>
					{:else if step === 'address'}
						<form
							novalidate
							onsubmit={(e) => {
								e.preventDefault();
								review();
							}}
						>
							<h2 class="text-xl font-bold tracking-[-0.015em]">Where should mail go?</h2>
							<p class="mt-1.5 max-w-prose text-sm text-muted-foreground">
								Mail to {who} and every address it made will forward here.
							</p>
							<Field.Field class="mt-6">
								<Field.Label for="fwd-email">New forwarding address</Field.Label>
								<Input
									id="fwd-email"
									data-autofocus
									type="email"
									bind:value={email}
									autocomplete="email"
									autocapitalize="none"
									spellcheck={false}
									placeholder="you@example.com"
									class="h-11 text-base"
									aria-invalid={flow.error ? true : undefined}
									aria-describedby={flow.error ? 'fwd-error' : undefined}
								/>
								<Field.Error id="fwd-error" errors={flow.errors} />
							</Field.Field>
							<div class="mt-6 flex flex-wrap items-center gap-2">
								<Button type="submit" size="lg" disabled={flow.busy}>
									{#if flow.busy}<Spinner />{/if}Review change
								</Button>
							</div>
						</form>
					{:else if step === 'review'}
						<form
							novalidate
							onsubmit={(e) => {
								e.preventDefault();
								submit();
							}}
						>
							<h2 class="text-xl font-bold tracking-[-0.015em]">Check the change</h2>
							<p class="mt-1.5 max-w-prose text-sm text-muted-foreground">
								A typo here sends your mail to a stranger, so read the new address once more.
							</p>
							<div class="mt-6 grid justify-items-start gap-1 rounded-key px-4 py-4 sunken md:px-5">
								<span class="text-xs text-muted-foreground">{who} forwards to</span>
								<span
									class="text-[15px] [overflow-wrap:anywhere] text-muted-foreground line-through decoration-muted-foreground/50"
									>{account.forwarding || 'your current inbox'}</span
								>
								<Doodle shape="arrow-down" draw class="my-0.5 ml-2 h-9 w-4 text-link" />
								<span
									class="text-[19px] leading-snug font-semibold tracking-[-0.015em] [overflow-wrap:anywhere]"
									>{email}</span
								>
							</div>
							{#if !replies}
								<div class="mt-4 flex max-w-prose items-start gap-2.5 text-sm">
									<TriangleAlert class="mt-0.5 size-4 flex-none text-destructive" />
									<p class="text-muted-foreground">
										<span class="font-semibold text-foreground"
											>Replies won’t come from your Duck address.</span
										>
										{email.split('@')[1]} has no SPF record, so DuckDuckGo can’t secure them. Mail still
										forwards.
									</p>
								</div>
							{/if}
							<Field.Error class="mt-4" errors={flow.errors} />
							<div class="mt-6 flex flex-wrap items-center gap-2">
								<Button type="submit" size="lg" disabled={flow.busy} data-autofocus>
									{#if flow.busy}<Spinner />{/if}Change forwarding address
								</Button>
								<Button
									variant="ghost"
									size="lg"
									disabled={flow.busy}
									onclick={() => goTo('address')}>Edit address</Button
								>
							</div>
						</form>
					{:else}
						<div class="flex flex-col items-start">
							<DoneMark />
							<h2 class="mt-6 text-xl font-bold tracking-[-0.015em]">Forwarding changed</h2>
							<p class="mt-1.5 max-w-prose text-sm text-muted-foreground">
								Mail to <span class="font-semibold text-foreground">{who}</span> now goes to
								<span class="font-semibold text-foreground">{email}</span>{from
									? `, not ${from}`
									: ''}.
							</p>
							<div class="mt-6 flex flex-wrap items-center gap-2">
								<Button size="lg" href={resolve('/accounts')}>Back to accounts</Button>
							</div>
						</div>
					{/if}
				</div>
			{/key}
		{/if}
	</section>
</div>
