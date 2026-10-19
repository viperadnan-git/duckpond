<!-- Where an account forwards, swapped for the copied mark when its address is
     copied, plus the warning when its token is gone. -->
<script lang="ts">
	import Swap from './Swap.svelte';
	import type { Account } from '#lib/store.js';
	import { ui } from '#lib/ui.svelte.js';

	let { account, class: className }: { account: Account; class?: string } = $props();
</script>

<Swap swapped={ui.copied === `${account.username}@duck.com`} class="text-[13px] {className}">
	<span class="min-w-0 truncate">
		{account.forwarding ? `Forwards to ${account.forwarding}` : 'Signed in with a token'}
	</span>
</Swap>
{#if !account.token}
	<span class="text-[13px] text-destructive">No token. Sign in again to generate addresses.</span>
{/if}
