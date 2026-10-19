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

/** False until storage is read, so views can tell "loading" from "empty". */
export const status = $state({ ready: false });

/** No accounts yet; null until storage is read (app.html's `data-fresh` covers that gap). */
export const isFresh = () => (status.ready ? !db.accounts.length : null);

export function load() {
	try {
		Object.assign(db, parse(localStorage.getItem(KEY)));
	} catch {
		/* blocked storage: run empty */
	}
	status.ready = true;
}

/** A silent failure here means the user thinks an address was saved when it was not. */
export function save() {
	try {
		localStorage.setItem(KEY, JSON.stringify(db));
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

export const addressesOf = (username: string) =>
	db.addresses.filter((a) => !username || a.account === username);

export function addAccount(account: Account) {
	const existing = accountFor(account.username);
	if (existing) Object.assign(existing, account, { addedAt: existing.addedAt });
	else db.accounts.push({ label: '', addedAt: Date.now(), ...account });
	db.current = account.username;
	save();
}

export function selectAccount(username: string) {
	db.current = username;
	const account = accountFor(username);
	if (account) account.lastUsed = Date.now();
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

/** `count` is off for aliases that arrive with the dashboard; its stats already include them. */
export function recordAddress(address: string, account: string, { count = true } = {}) {
	if (db.addresses.some((a) => a.address === address)) return;
	db.addresses.unshift({ address, account, createdAt: Date.now(), note: '' });
	const acct = accountFor(account);
	if (acct) {
		if (count) acct.generated = (acct.generated || 0) + 1;
		acct.lastUsed = Date.now();
	}
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
}
