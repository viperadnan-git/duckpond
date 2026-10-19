// Cross-page UI state: global sheets, confirmation, the latest address.

import { toast } from 'svelte-sonner';
import { setMode } from 'mode-watcher';
import * as api from './api.js';
import * as store from './db.svelte.js';
import type { Theme } from './store.js';

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

let copiedTimer: ReturnType<typeof setTimeout> | undefined;

/** Newest address for the current account, so the readout is never blank when one exists. */
export const latest = () => db.addresses.find((a) => a.account === db.current) ?? null;

/** Confirmation is shown by the control via `ui.copied`; only failure toasts. */
export async function copy(text: string, key = text) {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		toast.error('Copy failed. Select the text and copy it instead.');
		return false;
	}
	ui.copied = key;
	clearTimeout(copiedTimer);
	copiedTimer = setTimeout(() => (ui.copied = null), 1600);
	return true;
}

export async function generate() {
	const account = store.currentAccount();
	if (!account?.token || ui.generating) return;
	ui.generating = true;
	try {
		const address = await api.generate(db.settings.proxy, account.token);
		store.recordAddress(address, account.username);
		ui.fresh = address;
		// the hero shows it, so the hero confirms the copy
		await copy(address, 'hero');
	} catch (err) {
		if (err instanceof api.ApiError && err.status === 401) store.clearToken(account.username);
		toast.error((err as Error).message);
	} finally {
		ui.generating = false;
	}
}

/** Address whose status request is in flight, so its controls can show it. */
export const pending = $state({ address: null as string | null });

function tokenFor(address: string) {
	const owner = db.addresses.find((a) => a.address === address)?.account ?? '';
	const token = store.accountFor(owner)?.token;
	if (!token) toast.error(`Sign in to ${owner || 'its account'} again to manage this address.`);
	return token;
}

async function withStatus(address: string, run: (token: string) => Promise<boolean>) {
	const token = tokenFor(address);
	if (!token || pending.address) return null;
	pending.address = address;
	try {
		const active = await run(token);
		store.setActive(address, active);
		return active;
	} catch (err) {
		toast.error((err as Error).message);
		return null;
	} finally {
		pending.address = null;
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

export function applyTheme(theme: Theme = db.settings.theme) {
	setMode(theme);
}

// --- confirmation -----------------------------------------------------------

type Ask = {
	title: string;
	body: string;
	action?: string;
	danger?: boolean;
	/** One follow-up choice folded into the same step instead of a second prompt. */
	option?: { label: string; checked: boolean };
	/** Text the user must type before the action unlocks. */
	confirm?: string;
};

export const asking = $state({
	open: false,
	request: null as Ask | null,
	checked: false,
	typed: '',
	resolve: null as ((value: { checked: boolean } | null) => void) | null
});

/** Resolves to null when dismissed, otherwise to `{ checked }`. */
export function ask(request: Ask) {
	asking.request = request;
	asking.checked = request.option?.checked ?? false;
	asking.typed = '';
	asking.open = true;
	return new Promise<{ checked: boolean } | null>((resolve) => (asking.resolve = resolve));
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

export function answer(confirmed: boolean) {
	asking.resolve?.(confirmed ? { checked: asking.checked } : null);
	asking.resolve = null;
	asking.open = false;
}
