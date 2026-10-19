<!-- The one confirmation dialog, driven by ask() in ui.svelte.ts. On phones a
     typed confirmation opens as a drawer, which stays above the keyboard. -->
<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { typedConfirm } from '#lib/schema.js';
	import { answer, asking, lazy } from '#lib/ui.svelte.js';

	const expected = $derived(asking.request?.confirm);
	const unlocked = $derived(!expected || typedConfirm(expected).safeParse(asking.typed).success);

	const wide = new MediaQuery('min-width: 48rem');
	const drawer = $derived(!!expected && !wide.current);
	const sheet = lazy(
		() => import('./Sheet.svelte'),
		() => answer(false)
	);
	$effect(() => {
		if (drawer && asking.open) sheet.load();
	});
</script>

{#snippet typed(expected: string)}
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
{/snippet}

{#if drawer && asking.request && expected}
	{#if sheet.component}
		<sheet.component
			bind:open={() => asking.open, (open) => !open && answer(false)}
			title={asking.request.title}
			description={asking.request.body}
		>
			<div class="grid gap-4 pb-2">
				{@render typed(expected)}
				<div class="flex flex-col-reverse gap-2">
					<Button variant="ghost" onclick={() => answer(false)}>Cancel</Button>
					<Button
						variant={asking.request.danger ? 'destructive' : 'default'}
						disabled={!unlocked}
						onclick={() => answer(true)}
					>
						{asking.request.action ?? 'Confirm'}
					</Button>
				</div>
			</div>
		</sheet.component>
	{/if}
{:else}
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
				{#if expected}{@render typed(expected)}{/if}
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
{/if}
