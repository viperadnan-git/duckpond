// Pure data logic, no browser or rune dependencies, so it is testable as-is.
// Addresses are one flat list with an `account` field, so "all accounts" is
// the cheap view. Invariant: every address belongs to an account that is
// present; withOwners() enforces it wherever state comes from outside.

import { Backup, DEFAULT_PROXY, State, firstError, type Account } from './schema.js';

export { isSafeProxy } from './schema.js';
export type { Account, Address, Settings, State, Theme } from './schema.js';

export const KEY = 'duckpond.v1';

export type BackupParts = {
	accounts: boolean;
	addresses: boolean;
	notes: boolean;
	settings: boolean;
};

export const empty = (): State => ({
	v: 1,
	accounts: [],
	addresses: [],
	current: null,
	settings: { theme: 'system', proxy: DEFAULT_PROXY }
});

/** Drops addresses whose account isn't present. An address can't outlive its account. */
export function withOwners(state: State): State {
	const owners = new Set(state.accounts.map((a) => a.username));
	return { ...state, addresses: state.addresses.filter((a) => owners.has(a.account)) };
}

/** Hostile or half-written storage must not brick the app; the schema repairs what it can. */
export function parse(raw: string | null): State {
	if (!raw) return empty();
	try {
		const result = State.safeParse(JSON.parse(raw));
		return result.success ? withOwners(result.data) : empty();
	} catch {
		return empty();
	}
}

/** An account is its token: without it nothing can be generated, so they travel together. */
/** `account` limits the file to one account and its addresses; omit for all. */
export function buildBackup(src: State, parts: BackupParts, account?: string): Backup {
	const out: Backup = { app: 'duckpond', v: 1, exportedAt: new Date().toISOString() };
	const mine = <T extends { account: string } | { username: string }>(x: T) =>
		!account || ('username' in x ? x.username : x.account) === account;
	if (parts.accounts) {
		out.accounts = src.accounts.filter(mine).map((a) => ({ ...a }));
		out.current = account ?? src.current;
	}
	// addresses can't be restored without the accounts that own them
	if (parts.accounts && parts.addresses) {
		out.addresses = src.addresses
			.filter(mine)
			.map(({ note, site, ...rest }) => (parts.notes ? { ...rest, note, site } : rest));
	}
	if (parts.settings) out.settings = { ...src.settings };
	return out;
}

/**
 * Merge keeps whichever account copy has a token and the earliest address;
 * replace drops everything not in the file. A proxy from the file is never
 * applied, only returned for the user to accept.
 */
export function applyBackup(src: State, file: unknown, mode: 'merge' | 'replace') {
	const parsed = Backup.safeParse(file);
	if (!parsed.success) throw new Error(firstError(parsed.error));
	const backup = parsed.data;

	const base = mode === 'replace' ? empty() : src;
	const next: State = { ...base, settings: { ...base.settings } };

	const incomingProxy = backup.settings?.proxy;
	const proxy = incomingProxy && incomingProxy !== next.settings.proxy ? incomingProxy : null;
	if (backup.settings?.theme) next.settings.theme = backup.settings.theme;

	const accounts = [...next.accounts];
	let newAccounts = 0;
	for (const incoming of backup.accounts ?? []) {
		const at = accounts.findIndex((a) => a.username === incoming.username);
		if (at === -1) {
			accounts.push({ ...incoming });
			newAccounts++;
			continue;
		}
		accounts[at] = mergeAccount(accounts[at], incoming);
	}

	const addresses = [...next.addresses];
	const seen = new Set(addresses.map((a) => a.address));
	let newAddresses = 0;
	const owners = new Set(accounts.map((a) => a.username));
	for (const incoming of backup.addresses ?? []) {
		// an address without its account in the result can't be kept
		if (seen.has(incoming.address) || !owners.has(incoming.account)) continue;
		seen.add(incoming.address);
		addresses.push({ ...incoming });
		newAddresses++;
	}
	addresses.sort((a, b) => b.createdAt - a.createdAt);

	next.accounts = accounts;
	next.addresses = addresses;
	next.current =
		next.current && accounts.some((a) => a.username === next.current)
			? next.current
			: backup.current || accounts[0]?.username || null;

	return { state: next, newAccounts, newAddresses, proxy };
}

/** Counters only move forward, whichever copy is staler. */
function mergeAccount(held: Account, incoming: Account): Account {
	const addedAt = Math.min(incoming.addedAt || Infinity, held.addedAt || Infinity);
	return {
		...held,
		...incoming,
		token: incoming.token || held.token,
		generated: Math.max(incoming.generated || 0, held.generated || 0),
		lastUsed: Math.max(incoming.lastUsed || 0, held.lastUsed || 0) || undefined,
		addedAt: Number.isFinite(addedAt) ? addedAt : undefined
	};
}

/** Addresses as CSV for spreadsheets and password managers. No tokens. */
export function toCsv(addresses: State['addresses']) {
	const cell = (v: unknown) => {
		const s = String(v ?? '');
		// quote anything that would break a row, and defuse spreadsheet formulas
		const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
		return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
	};
	const rows = addresses.map((a) => [
		a.address,
		a.account,
		new Date(a.createdAt).toISOString(),
		a.active === false ? 'deactivated' : 'active',
		a.site,
		a.note
	]);
	return [['address', 'account', 'created', 'status', 'used_on', 'note'], ...rows]
		.map((r) => r.map(cell).join(','))
		.join('\r\n');
}
