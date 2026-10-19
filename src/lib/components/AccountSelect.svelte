<!-- Pick one account or all of them. Shows "All accounts" once a picked
     account is gone, matching scopeOf(). -->
<script lang="ts">
	import * as Select from '#lib/components/ui/select/index.js';
	import { accountOptions, scopeOf } from '#lib/db.svelte.js';

	let {
		value = $bindable(''),
		id,
		label,
		align,
		class: className
	}: {
		value?: string;
		id?: string;
		/** Accessible name when no <label for> points at `id`. */
		label?: string;
		align?: 'start' | 'center' | 'end';
		class?: string;
	} = $props();

	const options = $derived(accountOptions());
	const active = $derived(scopeOf(value));
</script>

<Select.Root type="single" bind:value>
	<Select.Trigger {id} class={className} aria-label={label}>
		{options.find((o) => o.value === active)?.label}
	</Select.Trigger>
	<Select.Content {align}>
		{#each options as option (option.value)}
			<Select.Item value={option.value} label={option.label} />
		{/each}
	</Select.Content>
</Select.Root>
