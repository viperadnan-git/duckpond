import { describe, expect, it } from 'vitest';
import { applyBackup, buildBackup, empty, parse, toCsv, withOwners } from './store.js';
import { DEFAULT_PROXY, Passphrase, Proxy, Site, Username } from './schema.js';

const account = (username: string, extra = {}) => ({ username, token: `t-${username}`, ...extra });
const address = (addr: string, acct: string, createdAt = 1) => ({
	address: addr,
	account: acct,
	createdAt,
	note: ''
});

describe('parse', () => {
	it('falls back to empty on garbage', () => {
		expect(parse(null)).toEqual(empty());
		expect(parse('{not json')).toEqual(empty());
		expect(parse('42')).toEqual(empty());
	});

	it('drops bad entries but keeps good ones', () => {
		const state = parse(
			JSON.stringify({
				accounts: [account('a'), { nope: 1 }, null],
				addresses: [address('x@duck.com', 'a'), { address: 5 }],
				current: 7,
				settings: { theme: 'neon', proxy: 'http://evil.example/?url=' }
			})
		);
		expect(state.accounts.map((a) => a.username)).toEqual(['a']);
		expect(state.addresses).toHaveLength(1);
		expect(state.current).toBeNull();
		expect(state.settings).toEqual({ theme: 'system', proxy: DEFAULT_PROXY });
	});
});

describe('applyBackup', () => {
	const src = { ...empty(), accounts: [account('a', { generated: 5 })], current: 'a' };

	it('rejects files from other apps', () => {
		expect(() => applyBackup(src, { app: 'other' }, 'merge')).toThrow(
			'Not a Duckpond backup file.'
		);
	});

	it('accepts duckmail backups and merges without duplicates', () => {
		const backup = {
			app: 'duckmail',
			v: 1,
			accounts: [account('a', { token: '', generated: 2 }), account('b')],
			addresses: [address('x@duck.com', 'a', 2), address('y@duck.com', 'b', 3)]
		};
		const once = applyBackup(src, backup, 'merge');
		expect(once.newAccounts).toBe(1);
		expect(once.newAddresses).toBe(2);
		// held token survives an empty incoming one; counters never go back
		expect(once.state.accounts[0]).toMatchObject({ token: 't-a', generated: 5 });
		expect(once.state.addresses.map((a) => a.address)).toEqual(['y@duck.com', 'x@duck.com']);

		const twice = applyBackup(once.state, backup, 'merge');
		expect(twice.newAddresses).toBe(0);
	});

	it("merge keeps a token's verdict with that token", () => {
		const held = {
			...empty(),
			accounts: [{ ...account('a'), token: 'T1', rejected: true, checkedAt: 2 }]
		};
		const swapped = applyBackup(
			held,
			{ app: 'duckpond', v: 1, accounts: [{ ...account('a'), token: 'T2' }] },
			'merge'
		);
		expect(swapped.state.accounts[0]).toMatchObject({
			token: 'T2',
			rejected: undefined,
			checkedAt: undefined
		});
		const same = { ...account('a'), token: 'T1', checkedAt: 1, rejected: undefined };
		const older = applyBackup(held, { app: 'duckpond', v: 1, accounts: [same] }, 'merge');
		expect(older.state.accounts[0]).toMatchObject({ rejected: true, checkedAt: 2 });
	});

	it('replace drops what the file lacks', () => {
		const { state } = applyBackup(
			src,
			{ app: 'duckpond', v: 1, accounts: [account('b')] },
			'replace'
		);
		expect(state.accounts.map((a) => a.username)).toEqual(['b']);
		expect(state.current).toBe('b');
	});

	it("replace keeps this browser's proxy", () => {
		const mine = {
			...src,
			settings: { theme: 'dark' as const, proxy: 'https://mine.example/?u=' }
		};
		const { state, proxy } = applyBackup(mine, { app: 'duckpond', v: 1 }, 'replace');
		expect(state.settings.proxy).toBe('https://mine.example/?u=');
		expect(proxy).toBeNull();
	});

	it('repairs timestamps Date cannot hold', () => {
		const { state } = applyBackup(
			src,
			{
				app: 'duckpond',
				v: 1,
				accounts: [account('a')],
				addresses: [address('y@duck.com', 'a', 9e15)]
			},
			'merge'
		);
		expect(() => toCsv(state.addresses)).not.toThrow();
	});

	it('offers a safe proxy but never applies one, and drops unsafe ones', () => {
		const safe = applyBackup(
			src,
			{ app: 'duckpond', v: 1, settings: { proxy: 'https://p.example/?u=' } },
			'merge'
		);
		expect(safe.proxy).toBe('https://p.example/?u=');
		expect(safe.state.settings.proxy).toBe(DEFAULT_PROXY);

		const unsafe = applyBackup(
			src,
			{ app: 'duckpond', v: 1, settings: { proxy: 'http://p.example/' } },
			'merge'
		);
		expect(unsafe.proxy).toBeNull();
	});

	it('round-trips through buildBackup', () => {
		const full = { ...src, addresses: [address('x@duck.com', 'a')] };
		const backup = buildBackup(full, {
			accounts: true,
			addresses: true,
			notes: true,
			settings: true
		});
		expect(applyBackup(empty(), backup, 'replace').state).toEqual(full);
	});
});

describe('form schemas', () => {
	it('normalises usernames', () => {
		expect(Username.parse('  me@Duck.com ')).toBe('me');
		expect(Username.safeParse('two words').success).toBe(false);
		expect(Username.safeParse('').success).toBe(false);
	});

	it('only allows https or local proxies', () => {
		expect(Proxy.safeParse('https://cors.example/?url=').success).toBe(true);
		expect(Proxy.safeParse('http://localhost:8787/?url=').success).toBe(true);
		expect(Proxy.safeParse('http://cors.example/?url=').success).toBe(false);
	});
});

describe('toCsv', () => {
	it('quotes awkward cells and defuses spreadsheet formulas', () => {
		const csv = toCsv([
			{
				address: 'a@duck.com',
				account: 'me',
				createdAt: 0,
				note: 'says "hi", twice',
				active: false
			},
			{ address: 'b@duck.com', account: 'me', createdAt: 0, site: '=HYPERLINK("x")' }
		]);
		const [head, first, second] = csv.split('\r\n');
		expect(head).toBe('address,account,created,status,used_on,note');
		expect(first).toBe('a@duck.com,me,1970-01-01T00:00:00.000Z,deactivated,,"says ""hi"", twice"');
		expect(second).toContain(`"'=HYPERLINK(""x"")"`);
		expect(second).toContain(',active,');
	});
});

describe('Site', () => {
	it('keeps what was pasted, trimmed', () => {
		expect(Site.parse(' https://www.airline.com/signup?x=1 ')).toBe(
			'https://www.airline.com/signup?x=1'
		);
		expect(Site.parse('')).toBe('');
	});
});

describe('an address cannot outlive its account', () => {
	it('drops unowned addresses when loading storage', () => {
		const state = parse(
			JSON.stringify({
				accounts: [account('a')],
				addresses: [address('kept@duck.com', 'a'), address('gone@duck.com', 'logged-out')]
			})
		);
		expect(state.addresses.map((a) => a.address)).toEqual(['kept@duck.com']);
	});

	it('skips backup addresses whose account is not restored, and counts only what landed', () => {
		const result = applyBackup(
			empty(),
			{
				app: 'duckpond',
				v: 1,
				accounts: [account('a')],
				addresses: [address('kept@duck.com', 'a'), address('gone@duck.com', 'b')]
			},
			'merge'
		);
		expect(result.state.addresses.map((a) => a.address)).toEqual(['kept@duck.com']);
		expect(result.newAddresses).toBe(1);
	});

	it('never writes addresses into a backup without their accounts', () => {
		const src = { ...empty(), accounts: [account('a')], addresses: [address('x@duck.com', 'a')] };
		const backup = buildBackup(src, {
			accounts: false,
			addresses: true,
			notes: true,
			settings: true
		});
		expect(backup.addresses).toBeUndefined();
	});

	it('withOwners is a no-op on valid state', () => {
		const src = { ...empty(), accounts: [account('a')], addresses: [address('x@duck.com', 'a')] };
		expect(withOwners(src)).toEqual(src);
	});
});

describe('buildBackup for one account', () => {
	it('keeps only that account and its addresses', () => {
		const src = {
			...empty(),
			current: 'a',
			accounts: [account('a'), account('b')],
			addresses: [address('x@duck.com', 'a'), address('y@duck.com', 'b')]
		};
		const parts = { accounts: true, addresses: true, notes: true, settings: false };
		const one = buildBackup(src, parts, 'b');
		expect(one.accounts?.map((a) => a.username)).toEqual(['b']);
		expect(one.addresses?.map((a) => a.address)).toEqual(['y@duck.com']);
		expect(one.current).toBe('b');
		// and it restores cleanly on its own
		expect(applyBackup(empty(), one, 'merge').state.addresses).toHaveLength(1);
	});
});

describe('Passphrase', () => {
	it('needs exactly four words', () => {
		expect(Passphrase.parse('  parkway expanse rotation vehicle ')).toBe(
			'parkway expanse rotation vehicle'
		);
		expect(Passphrase.safeParse('parkway expanse rotation').success).toBe(false);
		expect(Passphrase.safeParse('').success).toBe(false);
	});
});
