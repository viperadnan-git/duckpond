<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<RadioGroupPrimitive.ItemProps> = $props();
</script>

<RadioGroupPrimitive.Item
	bind:ref
	data-slot="radio-group-item"
	class={cn(
		'group/radio-group-item peer relative flex aspect-square size-[18px] shrink-0 items-center justify-center rounded-full border border-control bg-raise shadow-[0_1px_1px_rgb(0_0_0/0.06)] transition-[background-color,border-color] duration-150 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-checked:border-primary data-checked:bg-primary',
		className
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		{#if checked}
			<span data-slot="radio-group-indicator" class="size-1.5 rounded-full bg-primary-foreground"
			></span>
		{/if}
	{/snippet}
</RadioGroupPrimitive.Item>
