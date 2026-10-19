<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { cn, type WithoutChild } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		level = 3,
		children,
		...restProps
	}: WithoutChild<AccordionPrimitive.TriggerProps> & {
		level?: AccordionPrimitive.HeaderProps['level'];
	} = $props();
</script>

<AccordionPrimitive.Header {level} class="flex">
	<AccordionPrimitive.Trigger
		data-slot="accordion-trigger"
		bind:ref
		class={cn(
			'group/accordion-trigger relative flex flex-1 items-center justify-between gap-6 px-4 py-3.5 text-left text-sm font-semibold transition-colors duration-150 outline-none hover:bg-foreground/[0.03] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		<ChevronDownIcon
			data-slot="accordion-trigger-icon"
			class="pointer-events-none shrink-0 transition-transform duration-200 ease-snappy group-aria-expanded/accordion-trigger:rotate-180 motion-reduce:transition-none"
		/>
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
