<!-- Hand-drawn marks, one source for every page. Strokes use currentColor;
     `draw` sketches the first stroke in once (still under reduced motion). -->
<script lang="ts" module>
	const shapes = {
		underline: {
			box: '0 0 200 16',
			stretch: true,
			paths: ['M4 10C30 4 52 14 80 8S130 3 158 9 192 11 197 6']
		},
		'arrow-right': { box: '0 0 64 24', paths: ['M4 15C18 5 38 22 58 11', 'M49 6 59 11 51 19'] },
		'arrow-down': { box: '0 0 24 48', paths: ['M12 4C4 16 20 28 12 42', 'M6 34 12 43 18 35'] },
		circle: {
			box: '0 0 100 100',
			stretch: true,
			paths: ['M54 5C80 6 96 28 94 54S70 96 44 94 4 72 6 46 30 4 62 8']
		},
		swoosh: { box: '0 0 40 20', paths: ['M38 15C29 4 15 4 7 12', 'M4 5 6 13 14 13'] }
	} as const;

	export type Shape = keyof typeof shapes;
</script>

<script lang="ts">
	let {
		shape,
		draw = false,
		width = 2.2,
		class: className
	}: { shape: Shape; draw?: boolean; width?: number; class?: string } = $props();

	const s = $derived(shapes[shape]);
</script>

<svg
	aria-hidden="true"
	viewBox={s.box}
	preserveAspectRatio={'stretch' in s ? 'none' : undefined}
	class={className}
	fill="none"
	stroke="currentColor"
	stroke-width={width}
	stroke-linecap="round"
	stroke-linejoin="round"
>
	{#each s.paths as d, i (d)}
		<path
			{d}
			class={draw && i === 0 ? 'doodle-draw' : undefined}
			pathLength={draw && i === 0 ? 1 : undefined}
			vector-effect={'stretch' in s ? 'non-scaling-stroke' : undefined}
		/>
	{/each}
</svg>
