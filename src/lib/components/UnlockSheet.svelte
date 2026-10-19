<!-- Passphrase prompt for a sealed backup, driven by restore.svelte.ts. -->
<script lang="ts">
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import Sheet from './Sheet.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { cancelUnlock, tryUnlock, unlock } from '#lib/restore.svelte.js';

	let passphrase = $state('');
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		if (unlock.sealed) passphrase = error = '';
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		try {
			await tryUnlock(passphrase);
		} catch (err) {
			error = (err as Error).message;
		} finally {
			busy = false;
		}
	}
</script>

<Sheet
	bind:open={() => unlock.sealed !== null, (open) => !open && cancelUnlock()}
	title="Unlock backup"
	description="This backup is protected. Enter the passphrase it was saved with."
>
	<form class="grid gap-4" novalidate onsubmit={submit}>
		<Field.Field>
			<Field.Label for="unlock-pass">Passphrase</Field.Label>
			<Input
				id="unlock-pass"
				type="password"
				bind:value={passphrase}
				autocomplete="current-password"
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? 'unlock-error' : undefined}
			/>
			<Field.Error id="unlock-error" errors={error ? [{ message: error }] : undefined} />
		</Field.Field>
		<div class="flex flex-col-reverse gap-2 pb-2 sm:flex-row sm:justify-end">
			<Button variant="ghost" onclick={cancelUnlock}>Cancel</Button>
			<Button type="submit" disabled={!passphrase || busy}
				>{#if busy}<Spinner />{/if}Unlock</Button
			>
		</div>
	</form>
</Sheet>
