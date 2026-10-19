<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import CheckIcon from '@lucide/svelte/icons/check';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
</script>

<CheckboxPrimitive.Root
	bind:ref
	data-slot="checkbox"
	class={cn(
		'peer relative flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-control bg-raise shadow-[0_1px_1px_rgb(0_0_0/0.06)] transition-[background-color,border-color] duration-150 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground',
		className
	)}
	bind:checked
	bind:indeterminate
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<div
			data-slot="checkbox-indicator"
			class="grid place-content-center text-current [&>svg]:size-3 [&>svg]:stroke-[3.5]"
		>
			{#if checked}
				<CheckIcon />
			{:else if indeterminate}
				<MinusIcon />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
