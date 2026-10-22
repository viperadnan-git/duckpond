// Zod schemas for everything that crosses a trust boundary: storage, backup
// files, API responses, and form input.

import * as z from 'zod';
import { site } from './site.js';

export const DEFAULT_PROXY = site.proxy.url;

/** One bad entry drops itself, not the whole list. */
const listOf = <T extends z.ZodType>(item: T) =>
	z
		.array(z.unknown())
		.catch([])
		.transform((items) =>
			items.flatMap((i) => {
				const r = item.safeParse(i);
				return r.success ? [r.data as z.output<T>] : [];
			})
		);

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/** A proxy sees every Bearer token, so only https (or a local dev host) passes. */
export function isSafeProxy(url: string) {
	try {
		const { protocol, hostname } = new URL(url);
		return protocol === 'https:' || (protocol === 'http:' && LOCAL_HOSTS.includes(hostname));
	} catch {
		return false;
	}
}

// --- form input -------------------------------------------------------------

export const Username = z
	.string()
	.trim()
	.transform((s) => s.replace(/@duck\.com$/i, ''))
	.pipe(
		z
			.string()
			.min(1, 'Enter your Duck username.')
			.regex(/^[^\s@]+$/, 'Usernames have no spaces or @.')
	);

export const Passphrase = z
	.string()
	.trim()
	.min(1, 'Enter the passphrase from the email.')
	.refine((s) => s.split(/\s+/).length === 4, 'The passphrase is four words. Enter all four.');

export const Forwarding = z
	.string()
	.trim()
	.toLowerCase()
	// loose on purpose: DuckDuckGo judges the rest, and z.email() refuses IDN domains
	.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'That doesn’t look like an email address.')
	.refine((s) => !s.endsWith('@duck.com'), 'A Duck address can’t forward to another Duck address.');

export const Token = z
	.string()
	.trim()
	.min(1, 'Paste the access token.')
	.regex(/^\S+$/, 'Tokens have no spaces.');

/** Typed confirmation: must match `expected`, ignoring case and outer spaces. */
export const typedConfirm = (expected: string) =>
	z
		.string()
		.trim()
		.toLowerCase()
		.pipe(z.literal(expected.toLowerCase(), { error: `Type ${expected} to confirm.` }));

export const Note = z.string().trim().max(500, 'Keep notes under 500 characters.');

/** Where an alias was given out: a full URL, a host, or a name. Kept as typed. */
export const Site = z.string().trim().max(500, 'Keep it under 500 characters.');

export const BackupPassphrase = z.string().min(8, 'Use at least 8 characters.');

export const Proxy = z
	.string()
	.trim()
	.refine(isSafeProxy, 'A proxy must be an https address. It carries your access token.');

/** First issue's message, for a single inline form error. */
export const firstError = (error: z.ZodError) => error.issues[0]?.message ?? 'Invalid input.';

// --- stored data ------------------------------------------------------------

/** Display names, in the order the theme key steps through them. */
export const themeNames = { system: 'Auto', light: 'Light', dark: 'Dark' } as const;

export const Theme = z.enum(['system', 'light', 'dark']);

/** Epoch ms that Date can hold; beyond it, toISOString throws. */
const time = z.number().positive().max(8.64e15);

export const Account = z.object({
	username: z.string().min(1),
	token: z.string().catch(''),
	label: z.string().optional().catch(undefined),
	forwarding: z.string().optional().catch(undefined),
	generated: z.number().nonnegative().optional().catch(undefined),
	addedAt: time.optional().catch(undefined),
	/** Last time DuckDuckGo accepted or refused the token. */
	checkedAt: time.optional().catch(undefined),
	/** DuckDuckGo refused the token; kept so a wrong 401 can't destroy it. */
	rejected: z.boolean().optional().catch(undefined)
});

export const Address = z.object({
	address: z.string().min(1),
	account: z.string().catch(''),
	// a missing timestamp would otherwise sort and display as 1970
	createdAt: time.catch(() => Date.now()),
	note: z.string().optional().catch(undefined),
	site: z.string().optional().catch(undefined),
	/** DuckDuckGo's forwarding state; missing means never checked (new aliases are active). */
	active: z.boolean().optional().catch(undefined)
});

export const Settings = z.object({
	theme: Theme.catch('system'),
	proxy: Proxy.catch(() => DEFAULT_PROXY)
});

export const State = z.object({
	v: z.literal(1).catch(1),
	accounts: listOf(Account),
	addresses: listOf(Address),
	current: z.string().nullable().catch(null),
	settings: Settings.catch(() => ({ theme: 'system' as const, proxy: DEFAULT_PROXY }))
});

export const Backup = z.object({
	app: z.enum(['duckpond', 'duckmail'], { error: 'Not a Duckpond backup file.' }),
	v: z.number().catch(1),
	exportedAt: z.string().optional().catch(undefined),
	accounts: listOf(Account).optional(),
	current: z.string().nullable().optional().catch(undefined),
	addresses: listOf(Address).optional(),
	// a bad proxy is dropped here; a good one is still only offered, never applied
	settings: z
		.object({
			theme: Theme.optional().catch(undefined),
			proxy: Proxy.optional().catch(undefined)
		})
		.optional()
		.catch(undefined)
});

// --- API responses ----------------------------------------------------------

export const LoginResponse = z.object({ token: z.string().min(1) });

export const DashboardResponse = z.object({
	user: z.object({
		username: z.string().optional(),
		access_token: z.string().min(1),
		email: z.string().optional().catch(undefined),
		next_alias: z.string().optional().catch(undefined)
	}),
	stats: z.object({ addresses_generated: z.number().optional() }).optional().catch(undefined),
	// undocumented and usually empty
	addresses: z.array(z.string()).optional().catch(undefined)
});

export const GenerateResponse = z.object({ address: z.string().min(1) });

export const StatusResponse = z.object({ active: z.boolean() });

export const ValidResponse = z.object({ valid: z.boolean() });

export const ChangeResponse = z.object({
	status: z.enum(['changed', 'verify', 'confirm']),
	hash: z.string().optional()
});

/** A backup sealed with a passphrase; the inner JSON is a plain Backup. */
export const SealedBackup = z.object({
	app: z.enum(['duckpond']),
	v: z.number(),
	sealed: z.object({
		alg: z.literal('AES-GCM'),
		kdf: z.literal('PBKDF2-SHA256'),
		iterations: z.number().int().positive(),
		salt: z.string(),
		iv: z.string(),
		data: z.string()
	})
});

export type Theme = z.infer<typeof Theme>;
export type Account = z.infer<typeof Account>;
export type Address = z.infer<typeof Address>;
export type Settings = z.infer<typeof Settings>;
export type State = z.infer<typeof State>;
export type Backup = z.infer<typeof Backup>;
export type Sealed = z.infer<typeof SealedBackup>['sealed'];
