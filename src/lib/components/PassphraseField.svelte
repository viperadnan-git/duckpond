<!-- An emailed passphrase step's field and buttons: submit, and resend once
     the flow's cooldown ends. Sits inside the step's form. -->
<script lang="ts">
	import PassphraseInput from './PassphraseInput.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { Flow } from '#lib/flow.svelte.js';

	let {
		id,
		value = $bindable(''),
		flow,
		action,
		onresend
	}: { id: string; value?: string; flow: Flow; action: string; onresend: () => void } = $props();
</script>

<Field.Field class="mt-6">
	<div class="flex items-baseline justify-between gap-3">
		<Field.Label for={id}>Passphrase</Field.Label>
		<span class="hidden -rotate-2 font-hand text-lg leading-none text-link sm:block"
			>not there? check spam</span
		>
	</div>
	<PassphraseInput
		{id}
		autofocus
		bind:value
		invalid={!!flow.error}
		describedby={flow.error ? `${id}-error` : undefined}
	/>
	<Field.Error id="{id}-error" errors={flow.errors} />
</Field.Field>
<div class="mt-6 flex flex-wrap items-center gap-2">
	<Button type="submit" size="lg" disabled={flow.busy}>
		{#if flow.busy}<Spinner />{/if}{action}
	</Button>
	<Button variant="ghost" size="lg" disabled={flow.busy || flow.cooldown > 0} onclick={onresend}>
		{flow.cooldown > 0 ? `Resend in ${flow.cooldown}s` : 'Resend passphrase'}
	</Button>
</div>
