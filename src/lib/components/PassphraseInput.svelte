<!-- DuckDuckGo's emailed passphrase is four words: one slot per word. Space moves
     on, Backspace on an empty slot moves back, and pasting a phrase fills the
     slots from wherever it lands. `value` stays a plain space-joined string. -->
<script lang="ts">
	import { cn } from '#lib/utils.js';

	const COUNT = 4;

	let {
		value = $bindable(''),
		id,
		invalid = false,
		describedby,
		autofocus = false
	}: {
		value?: string;
		id: string;
		invalid?: boolean;
		describedby?: string;
		autofocus?: boolean;
	} = $props();

	let words = $state<string[]>(Array(COUNT).fill(''));
	const inputs: HTMLInputElement[] = [];

	// outside resets (value = '') clear the slots too
	$effect(() => {
		if (value === '' && words.some(Boolean)) words = Array(COUNT).fill('');
	});

	function commit() {
		value = words
			.map((w) => w.trim())
			.filter(Boolean)
			.join(' ');
	}

	function focus(i: number, at: 'start' | 'end' = 'end') {
		const el = inputs[Math.max(0, Math.min(COUNT - 1, i))];
		el?.focus();
		const pos = at === 'start' ? 0 : (el?.value.length ?? 0);
		el?.setSelectionRange(pos, pos);
	}

	/** Spreads text over slots from `start`, returning the last slot it filled. */
	function spread(start: number, text: string) {
		const parts = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
		parts.slice(0, COUNT - start).forEach((part, k) => (words[start + k] = part));
		commit();
		return Math.min(COUNT - 1, start + parts.length - 1);
	}

	function onInput(i: number, e: Event) {
		const raw = (e.currentTarget as HTMLInputElement).value;
		// a space (typed, or from autofill) means "next word"
		if (/\s/.test(raw)) {
			const last = spread(i, raw);
			// the word may be unchanged, so nothing re-renders: drop the space by hand
			(e.currentTarget as HTMLInputElement).value = words[i];
			focus(raw.endsWith(' ') && last < COUNT - 1 ? last + 1 : last);
			return;
		}
		words[i] = raw.toLowerCase();
		commit();
	}

	function onPaste(i: number, e: ClipboardEvent) {
		const text = e.clipboardData?.getData('text') ?? '';
		if (!/\s/.test(text.trim())) return; // one word: let the browser paste it
		e.preventDefault();
		focus(spread(i, text));
	}

	function onKeydown(i: number, e: KeyboardEvent) {
		const el = e.currentTarget as HTMLInputElement;
		const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
		const atEnd = el.selectionStart === el.value.length;
		if (e.key === 'Backspace' && el.value === '' && i > 0) {
			e.preventDefault();
			focus(i - 1);
		} else if (e.key === 'ArrowLeft' && atStart && i > 0) {
			e.preventDefault();
			focus(i - 1);
		} else if (e.key === 'ArrowRight' && atEnd && i < COUNT - 1) {
			e.preventDefault();
			focus(i + 1, 'start');
		}
	}
</script>

<div
	role="group"
	aria-label="Passphrase, four words"
	aria-describedby={describedby}
	class="grid grid-cols-2 gap-2 sm:grid-cols-4"
>
	{#each words as word, i (i)}
		<label
			class={cn(
				'relative flex h-11 items-center gap-2 rounded-control field pr-2 pl-2.5 has-[input:focus]:border-ring has-[input:focus]:bg-raise has-[input:focus]:shadow-[0_0_0_1px_var(--ring)]',
				invalid && !word && 'border-destructive'
			)}
		>
			<span
				aria-hidden="true"
				class="font-mono text-[10px] font-semibold text-muted-foreground tabular-nums">{i + 1}</span
			>
			<input
				bind:this={inputs[i]}
				id={i === 0 ? id : undefined}
				data-autofocus={autofocus && i === 0 ? true : undefined}
				value={word}
				aria-label="Word {i + 1} of {COUNT}"
				aria-invalid={invalid && !word ? true : undefined}
				autocomplete={i === 0 ? 'one-time-code' : 'off'}
				autocapitalize="none"
				spellcheck={false}
				enterkeyhint={i === COUNT - 1 ? 'go' : 'next'}
				class="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground/60 md:text-sm"
				placeholder="word"
				oninput={(e) => onInput(i, e)}
				onpaste={(e) => onPaste(i, e)}
				onkeydown={(e) => onKeydown(i, e)}
			/>
		</label>
	{/each}
</div>
