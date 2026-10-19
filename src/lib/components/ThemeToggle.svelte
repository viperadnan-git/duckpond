<!-- One key that steps Auto → Light → Dark, so theme is reachable on phones too. -->
<script lang="ts">
	import Monitor from '@lucide/svelte/icons/monitor';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { Button } from '#lib/components/ui/button/index.js';
	import { db, setSetting } from '#lib/db.svelte.js';
	import { themeNames as names } from '#lib/schema.js';
	import type { Theme } from '#lib/store.js';

	const order = Object.keys(names) as Theme[];
	const icons = { system: Monitor, light: Sun, dark: Moon };
	const Icon = $derived(icons[db.settings.theme]);
	const next = $derived(order[(order.indexOf(db.settings.theme) + 1) % order.length]);
</script>

<Button
	variant="ghost"
	size="icon-sm"
	aria-label="Theme: {names[db.settings.theme]}. Switch to {names[next]}"
	title="Theme: {names[db.settings.theme]}"
	onclick={() => setSetting('theme', next)}
>
	<Icon />
</Button>
