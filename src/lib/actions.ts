// Per-address and per-account actions, defined once for both the row menu and
// the right-click menu.

import type { Component } from 'svelte';
import Copy from '@lucide/svelte/icons/copy';
import NotebookPen from '@lucide/svelte/icons/notebook-pen';
import MailX from '@lucide/svelte/icons/mail-x';
import MailCheck from '@lucide/svelte/icons/mail-check';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import Trash from '@lucide/svelte/icons/trash-2';
import Check from '@lucide/svelte/icons/check';
import LogOut from '@lucide/svelte/icons/log-out';
import Forward from '@lucide/svelte/icons/forward';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { checkStatus, copy, forgetAddress, logOut, setForwarding, ui } from './ui.svelte.js';
import { accountFor, canUse, db, selectAccount } from './db.svelte.js';
import type { Account, Address } from './store.js';

export type Action = {
	label: string;
	icon: Component;
	run: () => unknown;
	destructive?: boolean;
	/** Draws a separator above this action. */
	group?: boolean;
	/** Needs something the account lacks, like a working token. */
	disabled?: boolean;
};

export const addressActions = (item: Address): Action[] => {
	const offline = !canUse(accountFor(item.account));
	const off = item.active === false;
	return [
		{ label: 'Copy address', icon: Copy, run: () => copy(item.address) },
		{
			label: item.note || item.site ? 'Edit details' : 'Add details',
			icon: NotebookPen,
			run: () => (ui.noting = item.address)
		},
		{
			label: off ? 'Reactivate' : 'Deactivate',
			icon: off ? MailCheck : MailX,
			run: () => setForwarding(item.address, off),
			group: true,
			disabled: offline
		},
		{
			label: 'Check status',
			icon: RefreshCw,
			run: () => checkStatus(item.address),
			disabled: offline
		},
		{
			label: 'Delete from Duckpond',
			icon: Trash,
			run: () => forgetAddress(item.address),
			destructive: true,
			group: true
		}
	];
};

/** Why an address's token actions are disabled, for the foot of its menu. */
export const addressNote = (item: Address) =>
	canUse(accountFor(item.account))
		? null
		: `Sign in to ${item.account} again to deactivate or check this address.`;

export const accountActions = (account: Account): Action[] => {
	const who = `${account.username}@duck.com`;
	return [
		...(account.username === db.current
			? []
			: [{ label: 'Use this account', icon: Check, run: () => selectAccount(account.username) }]),
		{ label: 'Copy address', icon: Copy, run: () => copy(who) },
		{
			label: 'Change forwarding address',
			icon: Forward,
			run: () =>
				// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved path plus a query string
				goto(`${resolve('/accounts/forwarding')}?user=${encodeURIComponent(account.username)}`)
		},
		{ label: 'Log out', icon: LogOut, run: () => logOut(account), destructive: true, group: true }
	];
};
