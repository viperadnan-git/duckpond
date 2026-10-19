// DuckDuckGo Email Protection API.
//
// quack.duckduckgo.com sends no CORS headers and answers OPTIONS with 403, so
// every call goes through a proxy. POST /email/addresses also 403s without a
// browser User-Agent, which JS cannot set, so the proxy must forward the
// client's own.

import type * as z from 'zod';
import { DashboardResponse, GenerateResponse, LoginResponse, StatusResponse } from './schema.js';

export { DEFAULT_PROXY } from './schema.js';

const BASE = 'https://quack.duckduckgo.com/api';

export class ApiError extends Error {
	status: number;
	body: unknown;
	constructor(status: number, body?: unknown) {
		super(messageFor(status, body));
		this.status = status;
		this.body = body;
	}
}

function messageFor(status: number, body: unknown) {
	if ((body as { error?: string } | null)?.error === 'invalid_token')
		return 'Token rejected. Sign in again to get a new one.';
	switch (status) {
		case 401:
			return 'Token rejected. Sign in again to get a new one.';
		case 404:
			return 'DuckDuckGo says this address doesn’t belong to that account.';
		case 403:
			return 'DuckDuckGo refused the request. The proxy may not be forwarding the browser User-Agent.';
		case 429:
			return 'Too many requests. Wait a minute and try again.';
		case 0:
			return 'Cannot reach the proxy. Check your connection or set a different proxy in Settings.';
		default:
			return `Request failed (${status}).`;
	}
}

type CallOptions = { method?: string; token?: string; params?: Record<string, string> };

async function call(
	proxy: string,
	path: string,
	{ method = 'GET', token, params }: CallOptions = {}
) {
	const target = new URL(BASE + path);
	for (const [k, v] of Object.entries(params ?? {})) target.searchParams.set(k, v);

	let res: Response;
	try {
		res = await fetch(proxy + encodeURIComponent(target.toString()), {
			method,
			headers: token ? { Authorization: `Bearer ${token}` } : {}
		});
	} catch {
		throw new ApiError(0);
	}

	const text = await res.text();
	let body: unknown = null;
	try {
		body = JSON.parse(text);
	} catch {
		/* non-JSON bodies stay null */
	}
	if (!res.ok) throw new ApiError(res.status, body);
	return body;
}

/** Parses a response, or throws `message` when DuckDuckGo changed its shape. */
function expect<T extends z.ZodType>(schema: T, body: unknown, message: string): z.output<T> {
	const result = schema.safeParse(body);
	if (!result.success) throw new Error(message);
	return result.data;
}

/** Aliases come back bare from some fields and qualified from others. */
export const asEmail = (a: string) => (a.includes('@') ? a : `${a}@duck.com`);

/** Emails a one-time passphrase. Returns 200 even for unknown usernames. */
export const requestPassphrase = (proxy: string, username: string) =>
	call(proxy, '/auth/loginlink', { params: { user: username } });

export type SignedIn = {
	username: string;
	token: string;
	cohort: string;
	forwarding: string;
	generated: number;
	nextAlias: string;
	addresses: string[];
};

/**
 * Trades the passphrase for a short-lived login token, spends it on the
 * dashboard, and keeps only the permanent access_token found there.
 */
export async function signIn(
	proxy: string,
	username: string,
	passphrase: string
): Promise<SignedIn> {
	const login = expect(
		LoginResponse,
		await call(proxy, '/auth/login', { params: { user: username, otp: passphrase } }),
		'Wrong passphrase. Check the email and try again.'
	);
	const dashboard = expect(
		DashboardResponse,
		await call(proxy, '/email/dashboard', { token: login.token }),
		'DuckDuckGo returned no access token.'
	);
	const { user } = dashboard;

	return {
		username: user.username || username,
		token: user.access_token,
		cohort: user.cohort || '',
		forwarding: user.email || '',
		generated: dashboard.stats?.addresses_generated || 0,
		// already minted; DuckDuckGo's own page shows it on load
		nextAlias: user.next_alias ? asEmail(user.next_alias) : '',
		// undocumented and usually empty, but worth keeping if present
		addresses: (dashboard.addresses ?? []).map(asEmail)
	};
}

/** Mints a new @duck.com alias. Takes the permanent token. */
export async function generate(proxy: string, token: string) {
	const { address } = expect(
		GenerateResponse,
		await call(proxy, '/email/addresses', { method: 'POST', token }),
		'DuckDuckGo returned no address.'
	);
	return asEmail(address);
}

// Alias status: what DuckDuckGo's own apps call from their Passwords screen.
// The address goes without @duck.com; 404 means another account owns it.

const bare = (address: string) => address.replace(/@duck\.com$/i, '');

/** Whether DuckDuckGo still forwards mail sent to this alias. */
export async function getStatus(proxy: string, token: string, address: string) {
	const body = await call(proxy, '/email/addresses', { token, params: { address: bare(address) } });
	return expect(StatusResponse, body, 'DuckDuckGo returned no status.').active;
}

/** Deactivates (stops forwarding) or reactivates an alias. Returns the new state. */
export async function setStatus(proxy: string, token: string, address: string, active: boolean) {
	const body = await call(proxy, '/email/addresses', {
		method: 'PUT',
		token,
		params: { address: bare(address), active: String(active) }
	});
	return expect(StatusResponse, body, 'DuckDuckGo returned no status.').active;
}
