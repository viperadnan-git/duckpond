<script lang="ts">
	import { resolve } from '$app/paths';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import Check from '@lucide/svelte/icons/check';
	import Plus from '@lucide/svelte/icons/plus';
	import Users from '@lucide/svelte/icons/users';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { toast } from 'svelte-sonner';
	import Head from '#lib/components/Head.svelte';
	import Swap from '#lib/components/Swap.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Item from '#lib/components/ui/item/index.js';
	import { Toggle } from '#lib/components/ui/toggle/index.js';
	import { pickBackup } from '#lib/restore.svelte.js';
	import * as store from '#lib/db.svelte.js';
	import { ask, copy, plural, ui } from '#lib/ui.svelte.js';
	import type { Account } from '#lib/store.js';

	const { db, status } = store;

	/** Addresses can't outlive their account, so logging out takes them too. */
	async function logOut(account: Account) {
		const count = store.addressesOf(account.username).length;
		const go = await ask({
			title: `Log out of ${account.username}?`,
			body: count
				? `${account.username}@duck.com and its ${plural(count, 'saved address')} will be removed from this browser. The addresses keep working at DuckDuckGo. Download a backup first if you want to keep the list.`
				: `${account.username}@duck.com and its access token will be removed from this browser.`,
			action: 'Log out',
			danger: true
		});
		if (!go) return;
		store.removeAccount(account.username);
		toast.success(`Logged out of ${account.username}`);
	}
</script>

<Head title="Accounts" description="DuckDuckGo Email Protection accounts signed in to Duckpond." />

<h1 class="sr-only">Accounts</h1>

<!-- the note explains Log out, so it only shows when there is an account to log out of -->
{#snippet logoutNote()}
	Logging out removes an account and its saved addresses from this browser. They keep working at
	DuckDuckGo.
{/snippet}

{#if status.ready && !db.accounts.length}
	<!-- nothing to frame yet, so no card: the empty state sits on the page -->
	<div class="mx-auto max-w-xl pt-6 md:pt-12">
		<EmptyState icon={Users} title="No accounts yet">
			Add a DuckDuckGo account to make addresses. You only need your Duck username and a passphrase
			DuckDuckGo emails you.
			{#snippet actions()}
				<Button href={resolve('/accounts/add')}><Plus />Add account</Button>
				<Button variant="outline" onclick={() => pickBackup()}>Restore a backup</Button>
			{/snippet}
		</EmptyState>
	</div>
{:else}
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
				<ul>
					{#each db.accounts as account (account.username)}
						{@const current = account.username === db.current}
						{@const count = store.addressesOf(account.username).length}
						{@const who = `${account.username}@duck.com`}
						<li class="border-t first:border-t-0">
							<Item.Root class="flex-nowrap items-start px-0">
								<Item.Media class="self-start">
									<Toggle
										variant="key"
										pressed={current}
										onPressedChange={() => store.selectAccount(account.username)}
										aria-label="Use {who}"
										title={current ? 'In use' : 'Use this account'}
										class="size-8 min-w-8 p-0 text-muted-foreground pointer-coarse:size-11 pointer-coarse:min-w-11"
									>
										<Check />
									</Toggle>
								</Item.Media>
								<Item.Content class="min-w-0">
									<Item.Title class="max-w-full">
										<button
											type="button"
											class="max-w-full truncate rounded-[4px] text-left text-[15px] font-semibold outline-none hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
											title="Copy {who}"
											onclick={() => copy(who)}
										>
											{who}
										</button>
									</Item.Title>
									<Item.Description>
										<Swap swapped={ui.copied === who} class="text-[13px]">
											<span class="min-w-0 truncate">
												{account.forwarding
													? `Forwards to ${account.forwarding}`
													: 'Signed in with a token'}
											</span>
											{#snippet alt()}<span class="flex items-center gap-1 font-medium text-primary"
													><Check class="size-3.5" />Copied to clipboard</span
												>{/snippet}
										</Swap>
									</Item.Description>
									<p class="text-xs text-muted-foreground">
										{plural(account.generated || 0, 'address')} made · {count} saved here
									</p>
									{#if !account.token}
										<p class="text-[13px] text-destructive">
											No token. Sign in again to generate addresses.
										</p>
									{/if}
								</Item.Content>
								<Item.Actions>
									<!-- a labelled icon on phones keeps the row to one line of actions -->
									<Button
										variant="destructive"
										size="sm"
										class="max-sm:size-8 max-sm:px-0"
										aria-label="Log out of {who}"
										onclick={() => logOut(account)}
										><LogOut class="sm:hidden" /><span class="max-sm:hidden">Log out</span></Button
									>
								</Item.Actions>
							</Item.Root>
						</li>
					{/each}
				</ul>
			{/if}
		</Panel>
	</div>
{/if}
