<script lang="ts">
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import FirstRun from '#lib/components/FirstRun.svelte';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import { flipOptions } from '#lib/motion.js';
	import { resolve } from '$app/paths';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Plus from '@lucide/svelte/icons/plus';
	import Users from '@lucide/svelte/icons/users';
	import Head from '#lib/components/Head.svelte';
	import AccountInfo from '#lib/components/AccountInfo.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import { accountActions } from '#lib/actions.js';
	import { pickBackup } from '#lib/restore.svelte.js';
	import * as store from '#lib/db.svelte.js';
	import { plural } from '#lib/ui.svelte.js';

	const { db, status } = store;

	const counts = $derived(
		db.addresses.reduce<Record<string, number>>(
			(n, a) => ((n[a.account] = (n[a.account] ?? 0) + 1), n),
			{}
		)
	);

	// --- reordering: drag a row by its grip, or ↑/↓ on a focused grip
	let list: HTMLUListElement | undefined = $state();
	let drag: { username: string; dy: number; held: boolean } | null = $state(null);
	let origin = { y: 0, top: 0, index: 0 };
	let moved = $state('');

	const rowOf = (username: string) =>
		list?.querySelector<HTMLElement>(`[data-account="${CSS.escape(username)}"]`);

	let pointerY = 0;

	// Tracked on the window: moving the row to its new slot drops the grip's pointer capture.
	function grab(e: PointerEvent, username: string) {
		if (e.button !== 0 || drag) return;
		e.preventDefault();
		origin = {
			y: e.clientY,
			top: rowOf(username)!.offsetTop,
			index: db.accounts.findIndex((a) => a.username === username)
		};
		drag = { username, dy: 0, held: true };
		const stop = new AbortController();
		const end = (cancel: boolean) => {
			stop.abort();
			drop(cancel);
		};
		const on = { signal: stop.signal };
		addEventListener('pointermove', (ev) => follow(ev.clientY), on);
		addEventListener('pointerup', () => end(false), on);
		addEventListener('pointercancel', () => end(true), on);
		addEventListener('keydown', (ev) => ev.key === 'Escape' && end(true), on);
	}

	async function follow(y: number) {
		pointerY = y;
		if (!drag?.held || !list) return;
		const row = rowOf(drag.username)!;
		const rows = [...list.children] as HTMLElement[];
		const center = origin.top + y - origin.y + row.offsetHeight / 2;
		const to = rows.filter((r) => r !== row && r.offsetTop + r.offsetHeight / 2 < center).length;
		store.moveAccount(drag.username, to);
		await tick();
		// offsetTop ignores the translate, so this keeps the row under the pointer as its slot moves
		if (drag?.held) drag.dy = pointerY - origin.y - (row.offsetTop - origin.top);
	}

	function drop(cancel = false) {
		if (!drag?.held) return;
		const { username } = drag;
		if (cancel) store.moveAccount(username, origin.index);
		drag.held = false;
		drag.dy = 0;
		announce(username);
		setTimeout(() => drag?.username === username && !drag.held && (drag = null), 200);
	}

	async function nudge(e: KeyboardEvent, username: string) {
		const by = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
		if (!by) return;
		e.preventDefault();
		store.moveAccount(username, db.accounts.findIndex((a) => a.username === username) + by);
		announce(username);
		await tick();
		// moving the row in the DOM drops focus
		rowOf(username)?.querySelector<HTMLElement>('[data-grip]')?.focus();
	}

	/** Row under the pointer when the context menu opens. */
	let target: string | null = $state(null);
	const targetAccount = $derived(store.accountFor(target));

	function pick(event: Event) {
		target =
			(event.target as Element).closest<HTMLElement>('[data-account]')?.dataset.account ?? null;
	}

	function announce(username: string) {
		const at = db.accounts.findIndex((a) => a.username === username) + 1;
		moved = `${username} is now ${at} of ${db.accounts.length}`;
	}
</script>

<Head title="Accounts" description="DuckDuckGo Email Protection accounts signed in to Duckpond." />

<h1 class="sr-only">Accounts</h1>

<!-- the note explains Log out, so it only shows when there is an account to log out of -->
{#snippet logoutNote()}
	Logging out removes an account and its saved addresses from this browser. They keep working at
	DuckDuckGo.
{/snippet}

<FirstRun>
	{#snippet welcome()}
		<!-- nothing to frame yet, so no card: the empty state sits on the page -->
		<div class="mx-auto max-w-xl pt-6 md:pt-12">
			<EmptyState icon={Users} title="No accounts yet">
				Add a DuckDuckGo account to make addresses. You only need your Duck username and a
				passphrase DuckDuckGo emails you.
				{#snippet actions()}
					<Button href={resolve('/accounts/add')}><Plus />Add account</Button>
					<Button variant="outline" onclick={() => pickBackup()}>Restore a backup</Button>
				{/snippet}
			</EmptyState>
		</div>
	{/snippet}
	<div>
		<Panel title="Accounts" id="accounts" footnote={logoutNote}>
			{#snippet actions()}
				<Button variant="outline" size="sm" href={resolve('/accounts/add')}
					><Plus />Add account</Button
				>
			{/snippet}

			{#if !status.ready}
				<div class="grid gap-3 py-2" aria-hidden="true">
					<Skeleton class="h-14 w-full" /><Skeleton class="h-14 w-full" />
				</div>
			{:else if db.accounts.length}
				{@const sortable = db.accounts.length > 1}
				<!-- one menu for every row; the row is read from the event target -->
				<ContextMenu.Root>
					<ContextMenu.Trigger disabled={!!drag}>
						{#snippet child({ props })}
							<ul
								{...props}
								bind:this={list}
								class="relative grid gap-1"
								oncontextmenucapture={pick}
								onpointerdowncapture={pick}
							>
								{#each db.accounts as account (account.username)}
									{@const current = account.username === db.current}
									{@const count = counts[account.username] ?? 0}
									{@const who = `${account.username}@duck.com`}
									{@const dragged = drag?.username === account.username}
									<li
										data-account={account.username}
										data-current={current}
										data-lifted={dragged && drag?.held}
										style:translate={dragged ? `0 ${drag?.dy}px` : undefined}
										animate:flip={dragged ? { duration: 0 } : flipOptions()}
										class="group relative flex items-center gap-1.5 rounded-key border border-transparent py-2.5 pr-1.5 transition-[background-color,border-color] duration-150 ease-snappy hover:bg-[color-mix(in_srgb,var(--link)_4%,var(--card))] data-[current=true]:border-[color-mix(in_srgb,var(--link)_35%,var(--border))] data-[current=true]:bg-[color-mix(in_srgb,var(--link)_8%,var(--card))] data-[lifted=true]:z-10 data-[lifted=true]:bg-card data-[lifted=true]:shadow-[0_10px_28px_-6px_rgb(17_17_17/0.28),0_0_0_1px_var(--border)] {sortable
											? 'pl-0.5'
											: 'pl-3'} {dragged && !drag?.held
											? 'transition-[translate,box-shadow] duration-180'
											: ''}"
									>
										{#if sortable}
											<button
												type="button"
												data-grip
												class="relative z-10 grid h-9 w-7 flex-none cursor-grab touch-none place-items-center rounded-control text-muted-foreground opacity-50 focus-ring transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing pointer-coarse:h-11 pointer-coarse:w-9 pointer-coarse:opacity-70"
												aria-label="Reorder {who}"
												aria-keyshortcuts="ArrowUp ArrowDown"
												onpointerdown={(e) => grab(e, account.username)}
												onkeydown={(e) => nudge(e, account.username)}
											>
												<GripVertical class="size-4" />
											</button>
										{/if}
										<div class="grid min-w-0 flex-1 gap-0.5">
											<div class="flex min-w-0 items-baseline gap-2.5">
												<!-- the whole row picks the account: this button's hit area covers it -->
												<button
													type="button"
													aria-pressed={current}
													class="min-w-0 truncate text-left text-[15px] font-semibold outline-none after:absolute after:inset-0 after:rounded-key focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
													onclick={() => store.selectAccount(account.username)}
												>
													{who}
												</button>
												{#if current}
													<span class="flex-none text-xs font-semibold text-link">In use</span>
												{/if}
											</div>
											<div class="flex min-w-0 gap-3 text-[13px] text-muted-foreground">
												<div class="grid min-w-0 flex-1"><AccountInfo {account} /></div>
												<span class="flex-none tabular-nums max-sm:hidden"
													>{account.generated || 0} made · {count} saved</span
												>
											</div>
										</div>
										<DropdownMenu.Root>
											<DropdownMenu.Trigger
												class="{buttonVariants({
													variant: 'ghost',
													size: 'icon-sm'
												})} relative z-10 flex-none pointer-coarse:size-11"
												aria-label="Actions for {who}"
											>
												<Ellipsis />
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end" class="min-w-52">
												<DropdownMenu.Label
													class="text-xs font-normal text-muted-foreground tabular-nums sm:hidden"
												>
													{plural(account.generated || 0, 'address')} made · {count} saved here
												</DropdownMenu.Label>
												{#each accountActions(account) as action (action.label)}
													{#if action.group}<DropdownMenu.Separator />{/if}
													<DropdownMenu.Item
														variant={action.destructive ? 'destructive' : 'default'}
														onSelect={action.run}
													>
														<action.icon />{action.label}
													</DropdownMenu.Item>
												{/each}
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</li>
								{/each}
							</ul>
						{/snippet}
					</ContextMenu.Trigger>
					<!-- the trigger is the whole list; focusing it on close would scroll to its top -->
					<ContextMenu.Content class="min-w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
						{#if targetAccount}
							{#each accountActions(targetAccount) as action (action.label)}
								{#if action.group}<ContextMenu.Separator />{/if}
								<ContextMenu.Item
									variant={action.destructive ? 'destructive' : 'default'}
									onSelect={action.run}
								>
									<action.icon />{action.label}
								</ContextMenu.Item>
							{/each}
						{/if}
					</ContextMenu.Content>
				</ContextMenu.Root>
				<p class="sr-only" aria-live="polite">{moved}</p>
			{/if}
		</Panel>
	</div>
</FirstRun>
