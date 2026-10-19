// Restoring a backup from anywhere: Settings, the landing page, Accounts.
// A sealed file asks for its passphrase through the app-wide UnlockSheet.

import { toast } from 'svelte-sonner';
import { unseal } from './crypto.js';
import * as store from './db.svelte.js';
import { SealedBackup, type Sealed } from './schema.js';
import { applyBackup } from './store.js';
import { applyTheme, ask, plural } from './ui.svelte.js';

export const unlock = $state({
	sealed: null as Sealed | null,
	resolve: null as ((backup: unknown) => void) | null
});

/** Resolves to the decrypted backup, or null if dismissed. */
function askToUnlock(sealed: Sealed) {
	unlock.sealed = sealed;
	return new Promise<unknown>((resolve) => (unlock.resolve = resolve));
}

/** Throws on a wrong passphrase so the sheet can say so and let the user retry. */
export async function tryUnlock(passphrase: string) {
	if (!unlock.sealed) return;
	const backup = await unseal(unlock.sealed, passphrase);
	unlock.sealed = null;
	unlock.resolve?.(backup);
}

export function cancelUnlock() {
	unlock.sealed = null;
	unlock.resolve?.(null);
}

export async function restoreFile(file: File, mode: 'merge' | 'replace') {
	try {
		let backup: unknown = JSON.parse(await file.text());
		const sealed = SealedBackup.safeParse(backup);
		if (sealed.success) {
			backup = await askToUnlock(sealed.data.sealed);
			if (!backup) return;
		}
		if (mode === 'replace') {
			const go = await ask({
				title: 'Replace everything?',
				body: 'Every account, token, and address in this browser will be discarded and rebuilt from this file.',
				action: 'Replace',
				danger: true
			});
			if (!go) return;
		}
		const result = applyBackup($state.snapshot(store.db), backup, mode);
		store.replaceState(result.state);
		if (result.proxy) {
			const go = await ask({
				title: 'Use the proxy from this file?',
				body: `The backup points at ${result.proxy}. A proxy relays every request and sees your access tokens, so only accept one you run or trust. Declining keeps your current proxy.`,
				action: 'Use it'
			});
			if (go) store.setSetting('proxy', result.proxy);
		}
		applyTheme();
		toast.success(
			`Restored ${plural(result.newAccounts, 'account', 'accounts')} and ${plural(result.newAddresses, 'address')}`
		);
	} catch (err) {
		toast.error(
			err instanceof SyntaxError ? 'That file is not valid JSON.' : (err as Error).message
		);
	}
}

/** Opens the system file picker straight away and restores what's chosen. */
export function pickBackup(mode: 'merge' | 'replace' = 'merge') {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'application/json,.json';
	input.onchange = () => {
		const file = input.files?.[0];
		if (file) restoreFile(file, mode);
	};
	input.click();
}
