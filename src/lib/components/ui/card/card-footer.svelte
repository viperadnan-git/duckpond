<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-footer"
	class={cn(
		'flex items-center border-t bg-band px-(--card-spacing) py-2.5 text-xs text-muted-foreground',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
