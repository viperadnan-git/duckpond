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
	data-slot="card-header"
	class={cn(
		'group/card-header @container/card-header grid min-h-11 auto-rows-min content-center items-center gap-x-2 gap-y-0.5 border-b bg-band px-(--card-spacing) py-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
