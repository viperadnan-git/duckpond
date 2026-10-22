// Cross-page UI state: global sheets, confirmation, the latest address.

import { toast } from 'svelte-sonner';
import * as api from './api.js';
import * as store from './db.svelte.js';
import { plural } from './format.js';
import type { Account } from './store.js';

export { ago, plural, stamp } from './format.js';

const { db } = store;

export const ui = $state({
	/** Address whose note sheet is open. */
	noting: null as string | null,
	generating: false,
	/** Address flashed after generating; cleared once the highlight plays. */
	fresh: null as string | null,
	/** Key of whatever was just copied, so its own control can confirm inline. */
	copied: null as string | null
});

/**
 * A component fetched on first use. A failed download (usually a deploy that
 * replaced the chunk) offers a reload; `onFail` backs out whatever was waiting.
 */
export function lazy<T>(load: () => Promise<{ default: T }>, onFail: () => void) {
	let component = $state<T>();
	let loading = false;
	return {
		get component() {
			return component;
		},
		load() {
			if (component || loading) return;
			loading = true;
			load()
				.then(
					(m) => (component = m.default),
					() => {
						onFail();
						toast.error('Part of Duckpond failed to load. Reload to get the latest version.', {
							action: { label: 'Reload', onClick: () => location.reload() }
						});
					}
				)
				.finally(() => (loading = false));
		}
	};
}

let copiedTimer: ReturnType<typeof setTimeout> | undefined;

/** Newest address for the current account, so the readout is never blank when one exists. */
export const latest = () => db.addresses.find((a) => a.account === db.current) ?? null;

const asBlob = (text: Promise<string>) => text.then((t) => new Blob([t], { type: 'text/plain' }));

/**
 * Confirmation is shown by the control via `ui.copied`; only failure toasts.
 * Pass a pending `text` to start the write inside the tap, as Safari requires.
 */
export async function copy(text: string | Promise<string>, key?: string) {
	try {
		if (typeof text === 'string') await navigator.clipboard.writeText(text);
		else if (typeof ClipboardItem === 'undefined') await navigator.clipboard.writeText(await text);
		else await navigator.clipboard.write([new ClipboardItem({ 'text/plain': asBlob(text) })]);
	} catch {
		// a failed request is reported by whoever made it
		const settled = await Promise.resolve(text).then(
			() => true,
			() => false
		);
		if (settled) toast.error('Copy failed. Select the text and copy it instead.');
		return false;
	}
	ui.copied = key ?? (await text);
	clearTimeout(copiedTimer);
	copiedTimer = setTimeout(() => (ui.copied = null), 1600);
	return true;
}

/** When each token was last asked about, so failing checks don't repeat on every tab switch. */
const asked: Record<string, number> = Object.create(null);
const BACKOFF = 5 * 60 * 1000;

/** Asks DuckDuckGo about tokens not heard from in a while; `force` after the proxy changes. */
export function checkTokens(force = false) {
	for (const account of db.accounts) {
		const { username, token } = account;
		if (!token) continue;
		if (!force && (!store.isStale(account) || Date.now() - (asked[token] ?? 0) < BACKOFF)) continue;
		asked[token] = Date.now();
		api
			.checkToken(db.settings.proxy, username, token)
			.then((valid) => store.markToken(username, token, valid))
			// offline or a proxy fault says nothing about the token
			.catch(() => {});
	}
}

/** Runs a token call and records the verdict: accepted, or refused on a 401. */
async function authed<T>({ username, token }: Account, run: (token: string) => Promise<T>) {
	try {
		const result = await run(token);
		store.markToken(username, token, true);
		return result;
	} catch (err) {
		if (err instanceof api.ApiError && err.status === 401) store.markToken(username, token, false);
		throw err;
	}
}

export async function generate() {
	const account = store.currentAccount();
	if (!store.canUse(account) || ui.generating) return;
	ui.generating = true;
	const minted = authed(account, (token) => api.generate(db.settings.proxy, token));
	// the hero shows it, so the hero confirms the copy
	const copied = copy(minted, 'hero');
	try {
		const address = await minted;
		store.recordAddress(address, account.username);
		ui.fresh = address;
		await copied;
	} catch (err) {
		toast.error((err as Error).message);
	} finally {
		ui.generating = false;
	}
}

/** Addresses with a status request in flight, so their controls can show it. */
export const pending: Record<string, boolean> = $state({});

/** Menus disable these actions when the owner can't use its token. */
async function withStatus(address: string, run: (token: string) => Promise<boolean>) {
	const owner = db.addresses.find((a) => a.address === address)?.account ?? '';
	const account = store.accountFor(owner);
	if (!store.canUse(account) || pending[address]) return null;
	pending[address] = true;
	try {
		const active = await authed(account, run);
		store.setActive(address, active);
		return active;
	} catch (err) {
		toast.error((err as Error).message);
		return null;
	} finally {
		delete pending[address];
	}
}

/** Deactivated aliases drop incoming mail at DuckDuckGo; reactivating restores forwarding. */
export async function setForwarding(address: string, active: boolean) {
	const result = await withStatus(address, (token) =>
		api.setStatus(db.settings.proxy, token, address, active)
	);
	if (result !== null)
		toast.success(
			result ? 'Reactivated. Mail forwards again.' : 'Deactivated. Mail to it is dropped.'
		);
}

/** Picks up changes made elsewhere, like the deactivate banner in a forwarded email. */
export async function checkStatus(address: string) {
	const result = await withStatus(address, (token) =>
		api.getStatus(db.settings.proxy, token, address)
	);
	if (result !== null)
		toast.success(result ? 'Active: mail is forwarding.' : 'Deactivated at DuckDuckGo.');
}

// --- confirmation -----------------------------------------------------------

type Ask = {
	title: string;
	body: string;
	action?: string;
	danger?: boolean;
	/** Text the user must type before the action unlocks. */
	confirm?: string;
};

export const asking = $state({
	open: false,
	request: null as Ask | null,
	typed: '',
	resolve: null as ((confirmed: boolean) => void) | null
});

export function ask(request: Ask) {
	asking.request = request;
	asking.typed = '';
	asking.open = true;
	return new Promise<boolean>((resolve) => (asking.resolve = resolve));
}

/** Forgets one address after the user types it back. */
export async function forgetAddress(address: string) {
	const go = await ask({
		title: 'Delete this address?',
		body: 'It is removed from Duckpond only. The alias keeps forwarding at DuckDuckGo; deactivate it there to stop mail.',
		action: 'Delete address',
		danger: true,
		confirm: address
	});
	if (!go) return false;
	store.removeAddresses((a) => a.address === address);
	toast.success('Address deleted');
	return true;
}

/** Addresses can't outlive their account, so logging out takes them too. */
export async function logOut(account: Account) {
	const count = store.addressesOf(account.username).length;
	const go = await ask({
		title: `Log out of ${account.username}?`,
		body: count
			? `${account.username}@duck.com and its ${plural(count, 'saved address')} will be removed from this browser. The addresses keep working at DuckDuckGo. Download a backup first if you want to keep the list.`
			: `${account.username}@duck.com and its access token will be removed from this browser.`,
		action: 'Log out',
		danger: true
	});
	if (!go) return;
	store.removeAccount(account.username);
	toast.success(`Logged out of ${account.username}`);
}

export function answer(confirmed: boolean) {
	asking.resolve?.(confirmed);
	asking.resolve = null;
	asking.open = false;
}
