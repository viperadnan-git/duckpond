<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CollapsiblePrimitive.ContentProps = $props();
</script>

<!-- height animates from bits' measured --bits-collapsible-content-height -->
<CollapsiblePrimitive.Content
	bind:ref
	data-slot="collapsible-content"
	class={cn(
		'overflow-hidden motion-reduce:animate-none data-open:animate-collapsible-down data-closed:animate-collapsible-up',
		className
	)}
	{...restProps}
/>
