<!-- One key that steps Auto → Light → Dark, so theme is reachable on phones too. -->
<script lang="ts">
	import Monitor from '@lucide/svelte/icons/monitor';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import { db, setSetting } from '#lib/db.svelte.js';
	import { applyTheme } from '#lib/ui.svelte.js';
	import type { Theme } from '#lib/store.js';

	const order: Theme[] = ['system', 'light', 'dark'];
	const names = { system: 'Auto', light: 'Light', dark: 'Dark' };
	const icons = { system: Monitor, light: Sun, dark: Moon };

	const Icon = $derived(icons[db.settings.theme]);
	const next = $derived(order[(order.indexOf(db.settings.theme) + 1) % order.length]);

	function step() {
		setSetting('theme', next);
		applyTheme();
	}
</script>

<button
	type="button"
	data-slot="button"
	class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
	aria-label="Theme: {names[db.settings.theme]}. Switch to {names[next]}"
	title="Theme: {names[db.settings.theme]}"
	onclick={step}
>
	<Icon />
</button>
