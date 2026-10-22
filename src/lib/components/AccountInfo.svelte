<!-- Where an account forwards, swapped for the copied mark when its address is
     copied, plus the warning when its token is gone or refused. -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import Swap from './Swap.svelte';
	import type { Account } from '#lib/store.js';
	import { canUse } from '#lib/db.svelte.js';
	import { ui } from '#lib/ui.svelte.js';

	let { account, class: className }: { account: Account; class?: string } = $props();

	// inline, canUse would narrow a refused account to never
	const usable = $derived(canUse(account));
</script>

<Swap swapped={ui.copied === `${account.username}@duck.com`} class="text-[13px] {className}">
	<span class="min-w-0 truncate">
		{account.forwarding ? `Forwards to ${account.forwarding}` : 'Signed in with a token'}
	</span>
</Swap>
{#if !usable}
	<span class="relative z-10 text-[13px] text-destructive"
		>{account.token ? 'DuckDuckGo refused the token.' : 'No token.'}
		<a
			href="{resolve('/accounts/add')}?user={encodeURIComponent(account.username)}"
			class="rounded-control font-medium underline underline-offset-4 focus-ring">Sign in again</a
		></span
	>
{/if}
