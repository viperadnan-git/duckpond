import { describe, expect, it } from 'vitest';
import { seal, unseal } from './crypto.js';
import { SealedBackup } from './schema.js';

// low iteration count keeps the test fast; the format is what's under test
const ITER = 1000;

describe('sealed backups', () => {
	const backup = { app: 'duckpond', v: 1, accounts: [{ username: 'me', token: 'secret' }] };

	it('round-trips with the right passphrase', async () => {
		const sealed = await seal(backup, 'correct horse', ITER);
		expect(JSON.stringify(sealed)).not.toContain('secret');
		expect(await unseal(sealed, 'correct horse')).toEqual(backup);
	});

	it('rejects a wrong passphrase and a tampered file alike', async () => {
		const sealed = await seal(backup, 'correct horse', ITER);
		await expect(unseal(sealed, 'wrong horse')).rejects.toThrow('Wrong passphrase');
		const tampered = { ...sealed, data: sealed.data.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')) };
		await expect(unseal(tampered, 'correct horse')).rejects.toThrow('Wrong passphrase');
	});

	it('uses a fresh salt and iv every time', async () => {
		const [a, b] = await Promise.all([seal(backup, 'x', ITER), seal(backup, 'x', ITER)]);
		expect(a.salt).not.toBe(b.salt);
		expect(a.iv).not.toBe(b.iv);
	});

	it('produces a file the restore path recognises', async () => {
		const file = { app: 'duckpond', v: 2, sealed: await seal(backup, 'x', ITER) };
		expect(SealedBackup.safeParse(JSON.parse(JSON.stringify(file))).success).toBe(true);
	});
});
