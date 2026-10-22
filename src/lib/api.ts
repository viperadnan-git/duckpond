// DuckDuckGo Email Protection API.
//
// quack.duckduckgo.com sends no CORS headers and answers OPTIONS with 403, so
// every call goes through a proxy. POST /email/addresses also 403s without a
// browser User-Agent, which JS cannot set, so the proxy must forward the
// client's own.

import type * as z from 'zod';
import {
	ChangeResponse,
	DashboardResponse,
	GenerateResponse,
	LoginResponse,
	StatusResponse,
	ValidResponse
} from './schema.js';

const BASE = 'https://quack.duckduckgo.com/api';

export class ApiError extends Error {
	status: number;
	/** DuckDuckGo's `error` code, if it sent one. */
	code: string;
	constructor(status: number, body?: unknown) {
		// DuckDuckGo sometimes reports a bad token in the body instead of a 401
		const code = (body as { error?: string } | null)?.error ?? '';
		if (code === 'invalid_token') status = 401;
		super(Object.hasOwn(codes, code) ? codes[code] : messageFor(status));
		this.status = status;
		this.code = code;
	}
}

const WRONG_PASSPHRASE = 'Wrong passphrase. Check the email and try again.';

/** DuckDuckGo's own error codes, from its email web app. */
export const codes: Record<string, string> = {
	max_number_of_addresses_reached:
		'Daily limit reached. DuckDuckGo allows 30 new addresses a day; try again tomorrow.',
	invalid_otp: WRONG_PASSPHRASE,
	invalid_login_credentials: WRONG_PASSPHRASE,
	invalid_confirm_credentials: WRONG_PASSPHRASE,
	expired_otp: 'That passphrase expired. Send a new one.',
	unrecognized_username: 'DuckDuckGo doesn’t recognize that Duck username.',
	invalid_email_address: 'That doesn’t look like an email address.',
	duck_address_not_allowed: 'A Duck address can’t forward to another Duck address.',
	email_address_not_changed: 'Mail already forwards there. Enter a different address.',
	change_email_address_not_allowed:
		'DuckDuckGo blocks this change for new accounts. Try again in a few days.',
	change_email_quota_reached: 'Too many attempts. Wait a few minutes and try again.'
};

function messageFor(status: number) {
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

type CallOptions = {
	method?: string;
	token?: string;
	params?: Record<string, string>;
	body?: FormData;
};

async function call(
	proxy: string,
	path: string,
	{ method = 'GET', token, params, body }: CallOptions = {}
) {
	const target = new URL(BASE + path);
	for (const [k, v] of Object.entries(params ?? {})) target.searchParams.set(k, v);

	let res: Response;
	try {
		res = await fetch(proxy + encodeURIComponent(target.toString()), {
			method,
			headers: token ? { Authorization: `Bearer ${token}` } : {},
			body
		});
	} catch {
		throw new ApiError(0);
	}

	const text = await res.text();
	let reply: unknown = null;
	try {
		reply = JSON.parse(text);
	} catch {
		/* non-JSON bodies stay null */
	}
	if (!res.ok) throw new ApiError(res.status, reply);
	return reply;
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
		WRONG_PASSPHRASE
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

/** Whether DuckDuckGo still accepts an access token. Mints nothing. */
export async function checkToken(proxy: string, username: string, token: string) {
	try {
		// Duck usernames are lowercase; older token sign-ins kept whatever was typed
		const body = await call(proxy, '/auth/validate-autofill', {
			token,
			params: { user: username.toLowerCase() }
		});
		return expect(ValidResponse, body, 'DuckDuckGo returned no token status.').valid;
	} catch (err) {
		if (err instanceof ApiError && err.status === 401) return false;
		throw err;
	}
}

// Changing the forwarding address, as DuckDuckGo's own site does it: a
// passphrase to the current address proves the account, then one to the new
// address proves that.

const CHANGE = 'change_email_address';

/** Emails a passphrase to the address mail forwards to now. */
export const requestChangePassphrase = (proxy: string, username: string) =>
	call(proxy, '/auth/confirmlink', { params: { action: CHANGE, user: username } });

/** Trades that passphrase for a token that can change the address. */
export async function confirmChange(proxy: string, username: string, passphrase: string) {
	const body = await call(proxy, '/auth/confirm', {
		params: { action: CHANGE, user: username, otp: passphrase }
	});
	return expect(LoginResponse, body, WRONG_PASSPHRASE).token;
}

/**
 * False when the address's domain has no SPF record: mail still forwards, but
 * DuckDuckGo can't send replies from the Duck address.
 */
export async function supportsReplies(proxy: string, email: string) {
	try {
		await call(proxy, '/auth/validate-email-address', { params: { email } });
		return true;
	} catch (err) {
		if (err instanceof ApiError && err.code === 'secure_reply_not_supported') return false;
		throw err;
	}
}

export type Change = { form: FormData; status: 'changed' | 'verify' | 'confirm'; hash?: string };

/** `verify` means a passphrase went to the new address; `confirm` means DuckDuckGo emailed why it failed. */
export async function changeForwarding(
	proxy: string,
	token: string,
	username: string,
	email: string,
	replies: boolean
): Promise<Change> {
	const form = new FormData();
	form.append('user', username);
	form.append('email', email);
	form.append('disable_secure_reply', replies ? '0' : '1');
	const body = await call(proxy, '/auth/change-email-address', {
		method: 'POST',
		token,
		body: form
	});
	return { form, ...expect(ChangeResponse, body, 'DuckDuckGo returned no result.') };
}

/** Sends the passphrase from the new address; resends the same form. */
export async function confirmForwarding(
	proxy: string,
	change: Change,
	passphrase: string
): Promise<Change> {
	const body = await call(proxy, '/auth/change-email-address/confirm', {
		method: 'POST',
		params: { otp: passphrase, hash: change.hash ?? '' },
		body: change.form
	});
	return { ...change, ...expect(ChangeResponse, body, 'DuckDuckGo returned no result.') };
}
