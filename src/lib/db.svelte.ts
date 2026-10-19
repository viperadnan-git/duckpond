// Reactive app state, persisted to localStorage. Starts empty on server and
// client alike so prerendered HTML hydrates cleanly; load() fills it in.

import { toast } from 'svelte-sonner';
import {
	KEY,
	empty,
	parse,
	withOwners,
	type Account,
	type Address,
	type Settings,
	type State
} from './store.js';

export const db: State = $state(empty());

/** False until storage is read, so views can tell "loading" from "empty". `used` is the stored size in characters. */
export const status = $state({ ready: false, used: 0 });

/** localStorage holds about 5M characters per site in every major browser. */
const LIMIT = 5_000_000;

/** Share of storage in use, 0–1. */
export const storageUsed = () => status.used / LIMIT;

let persisting = false;

/**
 * DuckDuckGo keeps no list of aliases, so ask the browser not to clear ours
 * (Safari's 7-day rule, storage pressure). Called on user actions: Firefox prompts.
 */
function keep() {
	if (persisting) return;
	persisting = true;
	navigator.storage?.persist?.().catch(() => {});
}

/** No accounts yet; null until storage is read. */
export const isFresh = () => (status.ready ? !db.accounts.length : null);

export function load() {
	try {
		const raw = localStorage.getItem(KEY);
		status.used = raw?.length ?? 0;
		Object.assign(db, parse(raw));
	} catch {
		/* blocked storage: run empty */
	}
	status.ready = true;
	// set by the pre-paint script in +layout when storage is blocked
	if ('memoryStorage' in document.documentElement.dataset)
		toast.warning('This browser blocks site storage. Nothing is kept after this tab closes.');
	// every save writes the whole state, so another tab's save must land here first
	window.addEventListener('storage', (e) => {
		if (e.key !== KEY && e.key !== null) return;
		status.used = e.newValue?.length ?? 0;
		Object.assign(db, parse(e.newValue));
	});
}

/** A silent failure here means the user thinks an address was saved when it was not. */
export function save() {
	try {
		const raw = JSON.stringify(db);
		localStorage.setItem(KEY, raw);
		status.used = raw.length;
		return true;
	} catch {
		toast.error("Could not save. This browser's storage is full or blocked.");
		return false;
	}
}

export const accountFor = (username: string | null) =>
	db.accounts.find((a) => a.username === username);

export const currentAccount = () => accountFor(db.current);

export const displayName = (username: string) => {
	const account = accountFor(username);
	return account ? account.label || account.username : username;
};

/** Account filter options: every account, plus all of them together. */
export function accountOptions(): { value: string; label: string }[] {
	return [
		{ value: '', label: 'All accounts' },
		...db.accounts.map((a) => ({ value: a.username, label: a.label || a.username }))
	];
}

/** A picked account, or '' (all) once that account is gone. */
export const scopeOf = (username: string) => (accountFor(username) ? username : '');

export const addressesOf = (username: string) =>
	db.addresses.filter((a) => !username || a.account === username);

/** `known` are aliases DuckDuckGo already reports; its stats include them, so they aren't counted. */
export function addAccount(account: Account, known: string[] = []) {
	const existing = accountFor(account.username);
	if (existing) Object.assign(existing, account, { addedAt: existing.addedAt });
	else db.accounts.push({ label: '', addedAt: Date.now(), ...account });
	db.current = account.username;
	keep();
	const have = Object.fromEntries(db.addresses.map((a) => [a.address, true]));
	const now = Date.now();
	const fresh = known.filter((a, i) => !have[a] && known.indexOf(a) === i);
	db.addresses = [
		...fresh.map((address) => ({ address, account: account.username, createdAt: now, note: '' })),
		...db.addresses
	];
	save();
}

/** Account order is the order of the account keys on Home. */
export function moveAccount(username: string, to: number) {
	const from = db.accounts.findIndex((a) => a.username === username);
	if (from === -1 || from === to || to < 0 || to >= db.accounts.length) return;
	const [account] = db.accounts.splice(from, 1);
	db.accounts.splice(to, 0, account);
	save();
}

export function selectAccount(username: string) {
	db.current = username;
	save();
}

/** Called when DuckDuckGo rejects a token, so the UI stops offering to generate. */
export function clearToken(username: string) {
	const account = accountFor(username);
	if (!account) return;
	account.token = '';
	save();
}

/** Logging out removes the account and every address it owns. */
export function removeAccount(username: string) {
	db.accounts = db.accounts.filter((a) => a.username !== username);
	db.addresses = db.addresses.filter((a) => a.account !== username);
	if (db.current === username) db.current = db.accounts[0]?.username ?? null;
	save();
}

export function recordAddress(address: string, account: string) {
	if (db.addresses.some((a) => a.address === address)) return;
	db.addresses.unshift({ address, account, createdAt: Date.now(), note: '' });
	keep();
	const acct = accountFor(account);
	if (acct) acct.generated = (acct.generated || 0) + 1;
	save();
}

export function removeAddresses(pred: (a: Address) => boolean) {
	const before = db.addresses.length;
	db.addresses = db.addresses.filter((a) => !pred(a));
	save();
	return before - db.addresses.length;
}

export function setDetails(address: string, details: { note: string; site: string }) {
	const entry = db.addresses.find((a) => a.address === address);
	if (!entry) return false;
	entry.note = details.note;
	entry.site = details.site;
	save();
	return true;
}

export function setActive(address: string, active: boolean) {
	const entry = db.addresses.find((a) => a.address === address);
	if (!entry) return;
	entry.active = active;
	save();
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
	db.settings[key] = value;
	save();
}

export function replaceState(next: State) {
	Object.assign(db, empty(), withOwners(next));
	save();
}

/** Leaves nothing behind: keys are removed, not blanked. */
export function wipe() {
	for (const key of Object.keys(localStorage)) {
		if (key === KEY || key.startsWith('duckpond.')) localStorage.removeItem(key);
	}
	Object.assign(db, empty());
	status.used = 0;
}
