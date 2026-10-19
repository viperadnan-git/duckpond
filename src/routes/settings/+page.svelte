<script lang="ts">
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Head from '#lib/components/Head.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Doodle from '#lib/components/Doodle.svelte';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import AccountSelect from '#lib/components/AccountSelect.svelte';
	import * as z from 'zod';
	import {
		BackupPassphrase,
		DEFAULT_PROXY,
		Proxy,
		Theme,
		firstError,
		themeNames
	} from '#lib/schema.js';
	import { seal } from '#lib/crypto.js';
	import { pickBackup } from '#lib/restore.svelte.js';
	import * as store from '#lib/db.svelte.js';
	import { buildBackup, toCsv, type BackupParts } from '#lib/store.js';
	import { ask, plural, stamp } from '#lib/ui.svelte.js';

	const { db } = store;

	// --- appearance ---
	function setTheme(value: string) {
		const theme = Theme.safeParse(value);
		if (!theme.success) return;
		store.setSetting('theme', theme.data);
	}

	// --- proxy ---
	let proxy = $derived(db.settings.proxy);
	let proxyError = $state('');

	function saveProxy() {
		const result = Proxy.safeParse(proxy.trim() || DEFAULT_PROXY);
		if (!result.success) {
			proxyError = firstError(result.error);
			return;
		}
		proxyError = '';
		store.setSetting('proxy', result.data);
		proxy = result.data;
		toast.success('Proxy saved');
	}

	// --- backup ---
	const parts: BackupParts = $state({
		accounts: true,
		addresses: true,
		notes: true,
		settings: true
	});
	const partLabels: {
		key: keyof BackupParts;
		label: string;
		hint?: string;
		/** Only meaningful when this part is included too. */
		needs?: keyof BackupParts;
	}[] = [
		{ key: 'accounts', label: 'Accounts', hint: 'Usernames and access tokens.' },
		{
			key: 'addresses',
			label: 'Addresses',
			hint: 'Restored with their accounts.',
			needs: 'accounts'
		},
		{ key: 'notes', label: 'Notes and sites', needs: 'addresses' },
		{ key: 'settings', label: 'Settings', hint: 'Theme and proxy' }
	];
	// an address can't exist without its account, so dependants follow what they need
	const effective: BackupParts = $derived({
		accounts: parts.accounts,
		addresses: parts.accounts && parts.addresses,
		notes: parts.accounts && parts.addresses && parts.notes,
		settings: parts.settings
	});
	const missing = $derived(
		partLabels.filter((p) => !effective[p.key]).map((p) => p.label.toLowerCase())
	);
	const nothing = $derived(!effective.accounts && !effective.settings);

	// tokens in a plain file can mint aliases for whoever finds it, so sealing is the default
	let protect = $state(true);
	let passphrase = $state('');
	let confirmPass = $state('');
	let passError = $state('');
	let sealing = $state(false);

	const Passphrases = z
		.object({ passphrase: BackupPassphrase, confirm: z.string() })
		.refine((v) => v.passphrase === v.confirm, { message: 'Passphrases don’t match.' });

	function saveFile(name: string, text: string, type: string) {
		const url = URL.createObjectURL(new Blob([text], { type }));
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.click();
		URL.revokeObjectURL(url);
	}

	// which accounts the backup and CSV cover: all of them, or one
	let backupScope = $state('');
	const activeBackupScope = $derived(store.scopeOf(backupScope));
	const scopeSlug = $derived(activeBackupScope || 'all');

	async function download() {
		const backup = buildBackup($state.snapshot(db), effective, activeBackupScope || undefined);
		let file: unknown = backup;
		if (protect) {
			const check = Passphrases.safeParse({ passphrase, confirm: confirmPass });
			if (!check.success) {
				passError = firstError(check.error);
				return;
			}
			passError = '';
			sealing = true;
			try {
				file = { app: 'duckpond', v: 2, sealed: await seal(backup, passphrase) };
			} finally {
				sealing = false;
			}
		}
		saveFile(
			`duckpond-${scopeSlug}-${stamp()}.json`,
			JSON.stringify(file, null, 2),
			'application/json'
		);
		toast.success(
			protect
				? 'Backup downloaded, locked with your passphrase.'
				: parts.accounts
					? 'Backup downloaded. It contains access tokens.'
					: 'Backup downloaded'
		);
	}

	function exportCsv() {
		const rows = store.addressesOf(activeBackupScope);
		saveFile(`duckpond-addresses-${scopeSlug}-${stamp()}.csv`, toCsv(rows), 'text/csv');
		toast.success(`Exported ${plural(rows.length, 'address')}`);
	}

	// --- restore ---
	let mode: 'merge' | 'replace' = $state('merge');

	// --- clear ---
	let clearScope = $state('');
	const activeScope = $derived(store.scopeOf(clearScope));
	const doomed = $derived(store.addressesOf(activeScope));

	async function clearAddresses() {
		const whose = activeScope ? activeScope : 'every account';
		const go = await ask({
			title: 'Delete saved addresses?',
			body: `${plural(doomed.length, 'address')} for ${whose} will be removed from this browser. They keep working at DuckDuckGo; this only forgets the record.`,
			action: `Delete ${doomed.length}`,
			danger: true
		});
		if (!go) return;
		const gone = new Set(doomed.map((a) => a.address));
		const n = store.removeAddresses((a) => gone.has(a.address));
		toast.success(`Deleted ${plural(n, 'address')}`);
	}

	async function eraseEverything() {
		const go = await ask({
			title: 'Erase everything?',
			body: 'Every account, access token, address, and note in this browser will be deleted. This cannot be undone, so download a backup first if you need one. Your DuckDuckGo accounts and aliases are not touched.',
			action: 'Erase everything',
			danger: true
		});
		if (!go) return;
		store.wipe();
		toast.success('Everything erased');
	}
</script>

<Head
	title="Settings"
	description="Theme, proxy, backup, restore, and data controls for Duckpond."
/>

{#snippet section(title: string, description: string, body: Snippet)}
	<Panel {title} id={title.toLowerCase().replace(/\W+/g, '-')}>
		<p class="text-[13px] text-muted-foreground">{description}</p>
		<div class="mt-3.5">{@render body()}</div>
	</Panel>
{/snippet}

<h1 class="sr-only">Settings</h1>

<!-- two columns that pack panels by their real height, so a short panel never
     stretches to match a tall neighbour; DOM order keeps the columns balanced -->
<div class="md:columns-2 md:gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
	{#snippet appearance()}
		<ToggleGroup.Root
			type="single"
			variant="segment"
			spacing={0.5}
			value={db.settings.theme}
			onValueChange={(v) => v && setTheme(v)}
			aria-label="Theme"
			class="w-full max-w-xs rounded-full p-[3px] sunken"
		>
			{#each Object.entries(themeNames) as [value, label] (value)}
				<ToggleGroup.Item {value} class="h-auto flex-1 px-2.5 py-1.5 pointer-coarse:py-3">
					{label}
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
	{/snippet}

	{#snippet connection()}
		<form
			class="flex flex-col gap-2 sm:flex-row"
			novalidate
			onsubmit={(e) => {
				e.preventDefault();
				saveProxy();
			}}
		>
			<Input
				bind:value={proxy}
				aria-label="CORS proxy"
				type="url"
				inputmode="url"
				aria-invalid={proxyError ? true : undefined}
				aria-describedby={proxyError ? 'proxy-error' : undefined}
				class="font-mono text-[13px] md:text-[13px]"
				spellcheck={false}
				autocapitalize="none"
			/>
			<Button type="submit" variant="outline">Save proxy</Button>
		</form>
		<Field.Error
			id="proxy-error"
			class="mt-2"
			errors={proxyError ? [{ message: proxyError }] : undefined}
		/>
	{/snippet}

	{#snippet backup()}
		{#if db.accounts.length > 1}
			<div class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
				<Label for="backup-scope" class="font-normal text-muted-foreground">Back up</Label>
				<AccountSelect
					id="backup-scope"
					bind:value={backupScope}
					class="min-w-44 max-[480px]:flex-1"
				/>
			</div>
		{/if}
		<div class="grid gap-3">
			{#each partLabels as part (part.key)}
				{@const off = part.needs && !effective[part.needs]}
				<Label class="flex items-start gap-3 font-normal {off ? 'opacity-50' : ''}">
					<Checkbox
						checked={off ? false : parts[part.key]}
						disabled={off}
						onCheckedChange={(v) => (parts[part.key] = v)}
						class="mt-0.5"
					/>
					<span>
						{part.label}
						{#if part.hint}<span class="block text-sm text-muted-foreground">{part.hint}</span>{/if}
					</span>
				</Label>
			{/each}
		</div>
		<p
			class="mt-4 text-sm {nothing || missing.length
				? 'text-destructive'
				: 'text-muted-foreground'}"
		>
			{nothing
				? 'Pick accounts or settings; there is nothing to back up otherwise.'
				: missing.length
					? `Restoring this file will not bring back: ${missing.join(', ')}.`
					: 'Restores this browser exactly as it is now.'}
		</p>
		<div class="mt-5 border-t pt-4">
			<Label class="flex items-start gap-3 font-normal">
				<Checkbox bind:checked={protect} class="mt-0.5" />
				<span>
					Protect with a passphrase
					<span class="ml-1 inline-flex -rotate-2 items-center gap-0.5 align-middle text-link"
						><Doodle shape="swoosh" class="h-3.5 w-7" /><span class="font-hand text-lg leading-none"
							>recommended</span
						></span
					>
					<span class="block text-sm text-muted-foreground">
						{protect
							? 'Encrypted with AES-256. Without the passphrase the file can’t be restored.'
							: parts.accounts
								? 'Anyone with the file can use the access tokens in it.'
								: 'The file is plain JSON.'}
					</span>
				</span>
			</Label>
			<Collapsible.Root open={protect}>
				<Collapsible.Content>
					<div class="grid gap-2 pt-3 sm:grid-cols-2">
						<Input
							type="password"
							bind:value={passphrase}
							placeholder="Passphrase"
							aria-label="Backup passphrase"
							autocomplete="new-password"
							aria-invalid={passError ? true : undefined}
						/>
						<Input
							type="password"
							bind:value={confirmPass}
							placeholder="Repeat passphrase"
							aria-label="Repeat backup passphrase"
							autocomplete="new-password"
							aria-invalid={passError ? true : undefined}
							aria-describedby={passError ? 'pass-error' : undefined}
						/>
					</div>
					<Field.Error
						id="pass-error"
						class="mt-2"
						errors={passError ? [{ message: passError }] : undefined}
					/>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>
		{#if store.storageUsed() > 0.8}
			<p class="mt-4 text-[13px] font-medium text-destructive" role="status">
				Browser storage is {Math.round(store.storageUsed() * 100)}% full. Download a backup, then
				delete addresses you no longer need.
			</p>
		{/if}
		<div class="mt-4 flex flex-wrap gap-2">
			<Button disabled={nothing || sealing} onclick={download}>
				{#if sealing}<Spinner />{/if}Download backup
			</Button>
			<Button
				variant="outline"
				disabled={!store.addressesOf(activeBackupScope).length}
				onclick={exportCsv}
			>
				Export addresses as CSV
			</Button>
		</div>
	{/snippet}

	{#snippet restoring()}
		<RadioGroup.Root bind:value={mode} class="grid gap-3" aria-label="Restore mode">
			<Label class="flex items-start gap-3 font-normal">
				<RadioGroup.Item value="merge" class="mt-0.5" />
				<span
					>Merge<span class="block text-sm text-muted-foreground"
						>Adds what is missing, keeps the rest.</span
					></span
				>
			</Label>
			<Label class="flex items-start gap-3 font-normal">
				<RadioGroup.Item value="replace" class="mt-0.5" />
				<span
					>Replace<span class="block text-sm text-muted-foreground"
						>Discards everything in this browser first.</span
					></span
				>
			</Label>
		</RadioGroup.Root>
		<Button class="mt-4" variant="outline" onclick={() => pickBackup(mode)}>
			Choose a backup file
		</Button>
	{/snippet}

	{#snippet clearing()}
		<div class="flex flex-col gap-2 sm:flex-row">
			<AccountSelect bind:value={clearScope} label="Which addresses to delete" class="sm:w-56" />
			<Button variant="destructive" disabled={!doomed.length} onclick={clearAddresses}>
				{doomed.length ? `Delete ${plural(doomed.length, 'address')}` : 'No addresses'}
			</Button>
		</div>
		<Button class="mt-3" variant="destructive" onclick={eraseEverything}>Erase everything</Button>
	{/snippet}
	{@render section('Appearance', 'Light, dark, or whatever your device uses.', appearance)}
	{@render section(
		'Backup',
		'A JSON file to restore from, or the addresses as CSV for a spreadsheet or password manager. CSV never includes tokens.',
		backup
	)}
	{@render section('Restore', 'Load a Duckpond backup. Backups from duckmail work too.', restoring)}
	{@render section(
		'CORS proxy',
		'DuckDuckGo blocks direct browser requests, so calls are relayed. The target URL is appended to this prefix.',
		connection
	)}
	{@render section(
		'Clear data',
		'Affects this browser only. Your DuckDuckGo accounts and aliases stay untouched.',
		clearing
	)}
	<!-- dropped from production builds -->
	{#if import.meta.env.DEV}
		{#await import('#lib/components/DevTools.svelte') then { default: DevTools }}<DevTools
			/>{/await}
	{/if}
</div>
