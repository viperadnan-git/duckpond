<!-- Dev-only Settings card: fake data and state tools. Never shipped; Settings
     imports it behind import.meta.env.DEV. -->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Panel from './Panel.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as store from '#lib/db.svelte.js';
	import { plural } from '#lib/ui.svelte.js';
	import type { Address } from '#lib/store.js';

	const { db } = store;

	// DuckDuckGo aliases are three hyphenated words, no digits
	const pool = [
		'putt',
		'salt',
		'blunt',
		'lung',
		'revisit',
		'crumb',
		'modular',
		'ivy',
		'upper',
		'crazy',
		'venus',
		'manila',
		'oak',
		'drift',
		'pebble',
		'lunar',
		'tidy',
		'harbor',
		'quill',
		'mossy'
	];
	const notes = ['Airline loyalty signup', 'Newsletter', 'Shopping', 'Forum account', 'Free trial'];
	const sites = ['airline.com', 'https://shop.example/signup', 'news.site', 'oauth.forum.dev'];
	const names = ['viperadnan', 'work', 'shopping', 'newsletters', 'travel'];

	/** `n` aliases not already in the list. */
	function aliases(n: number, existing = db.addresses) {
		const taken = Object.fromEntries(existing.map((a) => [a.address, true]));
		const out: string[] = [];
		for (let i = 0; out.length < n && i < 50_000; i++) {
			const [x, y, z] = [i % 20, Math.floor(i / 20) % 20, Math.floor(i / 400) % 20];
			if (x === y || y === z || x === z) continue;
			const a = `${pool[x]}-${pool[y]}-${pool[z]}@duck.com`;
			if (!taken[a]) out.push(a);
		}
		return out;
	}

	function fake(address: string, account: string, i: number, now = Date.now()): Address {
		return {
			address,
			account,
			createdAt: now - i * 3.7 * 3600e3,
			note: i % 6 === 1 ? notes[i % notes.length] : '',
			site: i % 4 === 2 ? sites[i % sites.length] : undefined,
			active: i % 9 === 4 ? false : undefined
		};
	}

	let count = $state(85);

	function fill() {
		const now = Date.now();
		const n = Math.max(0, Math.min(5000, Math.floor(count) || 0));
		const addresses = aliases(n, []).map((a, i) =>
			fake(a, names[i % 5 === 0 ? 1 : i % 3 === 0 ? 2 : i % 7 === 0 ? 3 : i % 11 === 0 ? 4 : 0], i)
		);
		store.replaceState({
			...$state.snapshot(db),
			current: names[0],
			accounts: names.map((username, i) => ({
				username,
				label: '',
				token: `dev-token-${username}`,
				forwarding: i === 3 ? '' : `${username}@example.com`,
				generated: addresses.filter((a) => a.account === username).length + i * 3,
				addedAt: now - (i + 1) * 86400e3
			})),
			addresses
		});
		toast.success(`Filled with ${names.length} accounts, ${plural(addresses.length, 'address')}`);
	}

	function addAccount() {
		const username = `dev${db.accounts.length + 1}`;
		store.addAccount({ username, token: `dev-token-${username}`, forwarding: '', generated: 0 });
		toast.success(`Added ${username}`);
	}

	function addAddresses() {
		const account = db.current;
		if (!account) return;
		const extra = aliases(100).map((a, i) => fake(a, account, i));
		store.replaceState({ ...$state.snapshot(db), addresses: [...extra, ...db.addresses] });
		toast.success(`Added ${plural(extra.length, 'address')} to ${account}`);
	}

	/** Shows the "sign in again" path without waiting for a real 401. */
	function expireToken() {
		if (!db.current) return;
		store.clearToken(db.current);
		toast.success(`Expired the token for ${db.current}`);
	}

	async function copyState() {
		await navigator.clipboard.writeText(JSON.stringify($state.snapshot(db), null, 2));
		toast.success('State copied as JSON');
	}

	/** Back to first run: theme and proxy stay. */
	function clear() {
		store.replaceState({ ...$state.snapshot(db), accounts: [], addresses: [] });
		toast.success('Cleared all accounts and addresses');
	}
</script>

<Panel title="Development" id="development" class="border-dashed">
	<p class="text-[13px] text-muted-foreground">
		Only in <code class="font-mono text-xs">bun run dev</code>. Fake data uses dummy tokens, so
		calls to DuckDuckGo fail.
	</p>
	<form
		class="mt-3.5 flex items-end gap-2"
		onsubmit={(e) => {
			e.preventDefault();
			fill();
		}}
	>
		<div class="grid gap-1.5">
			<Label for="dev-count" class="font-normal text-muted-foreground">Test addresses</Label>
			<Input id="dev-count" type="number" min="0" max="5000" bind:value={count} class="w-28" />
		</div>
		<Button type="submit">Fill test data</Button>
	</form>
	<p class="mt-1.5 text-xs text-muted-foreground">Replaces all accounts and addresses.</p>
	<div class="mt-4 flex flex-wrap gap-2 border-t pt-4">
		<Button variant="outline" onclick={addAccount}>Add account</Button>
		<Button variant="outline" disabled={!db.current} onclick={addAddresses}>
			Add 100 addresses
		</Button>
		<Button variant="outline" disabled={!store.currentAccount()?.token} onclick={expireToken}
			>Expire token</Button
		>
		<Button variant="outline" onclick={copyState}>Copy state</Button>
		<Button variant="destructive" disabled={!db.accounts.length} onclick={clear}>
			Clear accounts
		</Button>
	</div>
</Panel>
