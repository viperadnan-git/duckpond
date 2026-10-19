<!-- The one confirmation dialog, driven by ask() in ui.svelte.ts. -->
<script lang="ts">
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { typedConfirm } from '#lib/schema.js';
	import { answer, asking } from '#lib/ui.svelte.js';

	const expected = $derived(asking.request?.confirm);
	const unlocked = $derived(!expected || typedConfirm(expected).safeParse(asking.typed).success);
</script>

<AlertDialog.Root
	open={asking.open}
	onOpenChange={(open) => {
		if (!open) answer(false);
	}}
>
	<AlertDialog.Content>
		{#if asking.request}
			<AlertDialog.Header>
				<AlertDialog.Title>{asking.request.title}</AlertDialog.Title>
				<AlertDialog.Description>{asking.request.body}</AlertDialog.Description>
			</AlertDialog.Header>
			{#if asking.request.option}
				<Label class="flex items-center gap-3 text-sm font-normal">
					<Checkbox bind:checked={asking.checked} />
					{asking.request.option.label}
				</Label>
			{/if}
			{#if expected}
				<form
					class="grid gap-2"
					onsubmit={(e) => {
						e.preventDefault();
						if (unlocked) answer(true);
					}}
				>
					<Label for="confirm-typed" class="font-normal text-muted-foreground">
						Type <span class="font-mono font-medium text-foreground select-all">{expected}</span> to confirm
					</Label>
					<Input
						id="confirm-typed"
						bind:value={asking.typed}
						class="font-mono"
						autocomplete="off"
						autocapitalize="none"
						spellcheck={false}
						placeholder={expected}
					/>
				</form>
			{/if}
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action
					class={asking.request.danger ? buttonVariants({ variant: 'destructive' }) : undefined}
					disabled={!unlocked}
					onclick={() => answer(true)}
				>
					{asking.request.action ?? 'Confirm'}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		{/if}
	</AlertDialog.Content>
</AlertDialog.Root>
