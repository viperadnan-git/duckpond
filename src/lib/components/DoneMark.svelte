<!-- The finished mark at the end of a guided flow: a check key, circled. -->
<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Doodle from './Doodle.svelte';
</script>

<span
	class="relative flex size-12 items-center justify-center rounded-key bg-primary text-primary-foreground"
>
	<Check class="size-6" />
	<Doodle
		shape="circle"
		draw
		class="pointer-events-none absolute -inset-3.5 size-[76px] text-link/70"
	/>
</span>
