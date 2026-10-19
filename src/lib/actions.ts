// The per-address actions, defined once for both the row menu and the
// right-click menu.

import type { Component } from 'svelte';
import Copy from '@lucide/svelte/icons/copy';
import NotebookPen from '@lucide/svelte/icons/notebook-pen';
import MailX from '@lucide/svelte/icons/mail-x';
import MailCheck from '@lucide/svelte/icons/mail-check';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import Trash from '@lucide/svelte/icons/trash-2';
import { checkStatus, copy, forgetAddress, setForwarding, ui } from './ui.svelte.js';
import type { Address } from './store.js';

export type Action = {
	label: string;
	icon: Component;
	run: () => unknown;
	destructive?: boolean;
	/** Draws a separator above this action. */
	group?: boolean;
};

export const addressActions = (item: Address): Action[] => [
	{ label: 'Copy address', icon: Copy, run: () => copy(item.address) },
	{
		label: item.note || item.site ? 'Edit details' : 'Add details',
		icon: NotebookPen,
		run: () => (ui.noting = item.address)
	},
	item.active === false
		? {
				label: 'Reactivate',
				icon: MailCheck,
				run: () => setForwarding(item.address, true),
				group: true
			}
		: {
				label: 'Deactivate',
				icon: MailX,
				run: () => setForwarding(item.address, false),
				group: true
			},
	{ label: 'Check status', icon: RefreshCw, run: () => checkStatus(item.address) },
	{
		label: 'Delete from Duckpond',
		icon: Trash,
		run: () => forgetAddress(item.address),
		destructive: true,
		group: true
	}
];
