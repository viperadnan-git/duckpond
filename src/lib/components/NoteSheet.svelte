<!-- Details for one address: where it was given out, and a free-form note. -->
<script lang="ts">
	import * as Field from '#lib/components/ui/field/index.js';
	import * as z from 'zod';
	import { toast } from 'svelte-sonner';
	import Sheet from './Sheet.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { db, setDetails } from '#lib/db.svelte.js';
	import { ui } from '#lib/ui.svelte.js';
	import { Note, Site } from '#lib/schema.js';

	const Details = z.object({ site: Site, note: Note });

	let site = $state('');
	let note = $state('');
	let address = $state('');
	let errors: { site?: string; note?: string } = $state({});

	$effect(() => {
		if (!ui.noting) return;
		const entry = db.addresses.find((a) => a.address === ui.noting);
		address = ui.noting;
		site = entry?.site ?? '';
		note = entry?.note ?? '';
		errors = {};
	});

	function save() {
		const result = Details.safeParse({ site, note });
		if (!result.success) {
			errors = Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]));
			return;
		}
		setDetails(address, result.data);
		ui.noting = null;
		toast.success('Details saved');
	}
</script>

<Sheet
	bind:open={() => ui.noting !== null, (open) => (ui.noting = open ? ui.noting : null)}
	title="Details"
	description={address}
>
	<form
		class="grid gap-4"
		novalidate
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
	>
		<Field.Field>
			<Field.Label for="detail-site">Used on</Field.Label>
			<Input
				id="detail-site"
				bind:value={site}
				placeholder="https://airline.com/signup"
				inputmode="url"
				autocapitalize="none"
				spellcheck={false}
				aria-invalid={errors.site ? true : undefined}
				aria-describedby={errors.site ? 'detail-site-error' : undefined}
			/>
			<Field.Error
				id="detail-site-error"
				errors={errors.site ? [{ message: errors.site }] : undefined}
			/>
		</Field.Field>
		<Field.Field>
			<Field.Label for="detail-note">Note</Field.Label>
			<Textarea
				id="detail-note"
				bind:value={note}
				rows={3}
				placeholder="Loyalty programme signup"
				maxlength={500}
				aria-invalid={errors.note ? true : undefined}
				aria-describedby={errors.note ? 'detail-note-error' : undefined}
				onkeydown={(e) => {
					// ⌘/Ctrl+Enter saves, like the button
					if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
				}}
			/>
			<Field.Error
				id="detail-note-error"
				errors={errors.note ? [{ message: errors.note }] : undefined}
			/>
		</Field.Field>
		<div class="flex flex-col-reverse gap-2 pb-2 sm:flex-row sm:justify-end">
			<Button variant="ghost" onclick={() => (ui.noting = null)}>Cancel</Button>
			<Button type="submit">Save details</Button>
		</div>
	</form>
</Sheet>
