<script lang="ts">
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import Search from '@lucide/svelte/icons/search';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import SearchX from '@lucide/svelte/icons/search-x';
	import MailPlus from '@lucide/svelte/icons/mail-plus';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Trash from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import SquareCheck from '@lucide/svelte/icons/square-check';
	import { toast } from 'svelte-sonner';
	import { SvelteSet } from 'svelte/reactivity';
	import { onMount, tick } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { enter, flipOptions, leave } from '#lib/motion.js';
	import AddressRow from './AddressRow.svelte';
	import { addressActions } from '#lib/actions.js';
	import { loadSuffixList, sameSite } from '#lib/domains.js';
	import Swap from './Swap.svelte';
	import Panel from './Panel.svelte';
	import EmptyState from './EmptyState.svelte';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import * as Pagination from '#lib/components/ui/pagination/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import { accountOptions, addressesOf, db, removeAddresses, status } from '#lib/db.svelte.js';
	import { ask, copy, plural, ui } from '#lib/ui.svelte.js';

	const PER_PAGE = 20;

	type Status = 'all' | 'active' | 'off';
	const statuses: { value: Status; label: string }[] = [
		{ value: 'all', label: 'Any status' },
		{ value: 'active', label: 'Active' },
		{ value: 'off', label: 'Deactivated' }
	];

	let query = $state('');
	let scope = $state('');
	let statusFilter = $state<Status>('all');

	// fetched the first time the search looks like a domain; flipping this re-filters
	let suffixes = $state(false);
	$effect(() => {
		if (!suffixes && query.includes('.')) loadSuffixList().then(() => (suffixes = true));
	});
	const selected = new SvelteSet<string>();

	const options = $derived(accountOptions());
	// a removed account's filter would otherwise show nothing forever
	const activeScope = $derived(options.some((o) => o.value === scope) ? scope : '');
	const rows = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return addressesOf(activeScope).filter(
			(a) =>
				(statusFilter === 'all' || (statusFilter === 'off') === (a.active === false)) &&
				(!q ||
					[a.address, a.note, a.site].some((f) => f?.toLowerCase().includes(q)) ||
					(suffixes && !!a.site && sameSite(a.site, q)))
		);
	});

	// back to page 1 whenever the filter changes
	let page = $derived.by(() => {
		void query;
		void activeScope;
		void statusFilter;
		return 1;
	});
	const pageCount = $derived(Math.max(1, Math.ceil(rows.length / PER_PAGE)));
	const current = $derived(Math.min(page, pageCount));
	const visible = $derived(rows.slice((current - 1) * PER_PAGE, current * PER_PAGE));

	// --- URL state: ?q=&account=&status=&page= survive reloads and the back button.
	// Prerendered HTML has no query string, so it is read once in the browser.
	let restored = $state(false);

	onMount(async () => {
		const params = new URL(location.href).searchParams;
		query = params.get('q') ?? '';
		scope = params.get('account') ?? '';
		statusFilter = statuses.find((s) => s.value === params.get('status'))?.value ?? 'all';
		await tick(); // let the filter change reset the page before restoring it
		page = Math.max(1, Number(params.get('page')) || 1);
		restored = true;
	});

	$effect(() => {
		const pairs: [string, string][] = [];
		if (query.trim()) pairs.push(['q', query.trim()]);
		if (activeScope) pairs.push(['account', activeScope]);
		if (statusFilter !== 'all') pairs.push(['status', statusFilter]);
		if (current > 1) pairs.push(['page', String(current)]);
		const search = pairs.length
			? `?${pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`
			: '';
		if (restored && search !== location.search)
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved path plus a query string
			replaceState(`${resolve('/')}${search}`, {});
	});

	const filtered = $derived(statusFilter !== 'all' || !!activeScope);

	const pageSelected = $derived(visible.filter((a) => selected.has(a.address)).length);
	const allOnPage = $derived(visible.length > 0 && pageSelected === visible.length);

	function togglePage(checked: boolean) {
		for (const a of visible) {
			if (checked) selected.add(a.address);
			else selected.delete(a.address);
		}
	}

	/** Every address the current search and filters match, across all pages. */
	function selectAll() {
		for (const a of rows) selected.add(a.address);
	}

	function toggle(address: string, checked: boolean) {
		if (checked) selected.add(address);
		else selected.delete(address);
	}

	/** A new page starts at its first row, just under the sticky header. */
	function toListTop() {
		document
			.getElementById('addresses')
			?.closest('[data-slot=card]')
			?.scrollIntoView({
				block: 'start',
				behavior: prefersReducedMotion.current ? 'auto' : 'smooth'
			});
	}

	/** Row under the pointer when the context menu opens. */
	let target: string | null = $state(null);
	const targetItem = $derived(db.addresses.find((a) => a.address === target));

	function pick(event: Event) {
		target =
			(event.target as Element).closest<HTMLElement>('[data-address]')?.dataset.address ?? null;
	}

	// drop selections whose address was deleted elsewhere
	$effect(() => {
		for (const address of selected)
			if (!db.addresses.some((a) => a.address === address)) selected.delete(address);
	});

	async function deleteSelected() {
		const n = selected.size;
		const go = await ask({
			title: `Delete ${plural(n, 'address')}?`,
			body: 'They are removed from this browser only and keep working at DuckDuckGo. This only forgets the record.',
			action: `Delete ${n}`,
			danger: true
		});
		if (!go) return;
		const gone = removeAddresses((a) => selected.has(a.address));
		selected.clear();
		toast.success(`Deleted ${plural(gone, 'address')}`);
	}
</script>

<Panel
	title="Addresses"
	id="addresses"
	class="scroll-mt-[calc(3.5rem+env(safe-area-inset-top)+1rem)]"
>
	{#snippet actions()}
		<span class="text-xs text-muted-foreground tabular-nums"
			>{status.ready ? plural(rows.length, 'address') : ''}</span
		>
	{/snippet}

	<div class="mb-2.5">
		{#if selected.size}
			<div
				in:fade={{ duration: 120 }}
				class="flex min-h-9 items-center gap-1 rounded-control pr-1 pl-2.5 sunken"
				role="toolbar"
				aria-label="Selected addresses"
			>
				<!-- same spot as the toolbar's page checkbox, so it doesn't jump on selection -->
				<Checkbox
					checked={allOnPage}
					indeterminate={pageSelected > 0 && !allOnPage}
					onCheckedChange={togglePage}
					aria-label="Select this page"
					class="mr-1.5"
				/>
				<span class="text-[13px] font-semibold whitespace-nowrap tabular-nums"
					>{selected.size} selected</span
				>
				<!-- beyond this page: everything the current search and filters match -->
				{#if selected.size < rows.length}
					<Button variant="link" size="sm" class="px-2" onclick={selectAll}>
						<span class="sm:hidden">All {rows.length}</span><span class="hidden sm:inline"
							>Select all {rows.length}</span
						>
					</Button>
				{/if}
				<span class="flex-1"></span>
				<Button
					variant="ghost"
					size="sm"
					class="max-sm:hidden"
					onclick={() => copy([...selected].join('\n'), 'selection')}
				>
					<Swap swapped={ui.copied === 'selection'}>
						<span class="flex items-center gap-1.5"
							><Copy /><span class="sr-only sm:not-sr-only">Copy</span></span
						>
						{#snippet alt()}<span class="flex items-center gap-1.5"
								><Check /><span class="sr-only sm:not-sr-only">Copied</span></span
							>{/snippet}
					</Swap>
				</Button>
				<Button
					variant="ghost"
					size="sm"
					class="text-destructive max-sm:hidden"
					onclick={deleteSelected}
				>
					<Trash /><span class="sr-only sm:not-sr-only">Delete</span>
				</Button>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class={buttonVariants({ variant: 'ghost', size: 'icon-sm', class: 'sm:hidden' })}
						aria-label="Actions for selected addresses"
					>
						<Ellipsis />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item onSelect={() => copy([...selected].join('\n'), 'selection')}>
							<Copy />Copy {plural(selected.size, 'address')}
						</DropdownMenu.Item>
						<DropdownMenu.Item variant="destructive" onSelect={deleteSelected}>
							<Trash />Delete {plural(selected.size, 'address')}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Clear selection"
					onclick={() => selected.clear()}
				>
					<X />
				</Button>
			</div>
		{:else}
			<div in:fade={{ duration: 120 }} class="flex items-center gap-2">
				{#if status.ready && rows.length}
					<label
						class="flex flex-none cursor-pointer items-center gap-2 pr-1 text-[13px] text-muted-foreground"
						title="Select this page"
					>
						<Checkbox
							checked={allOnPage}
							indeterminate={pageSelected > 0 && !allOnPage}
							onCheckedChange={togglePage}
						/>
						<span class="sr-only md:not-sr-only">Select page</span>
					</label>
				{/if}
				<InputGroup.Root class="min-w-0 flex-1">
					<InputGroup.Addon><Search /></InputGroup.Addon>
					<InputGroup.Input
						id="address-search"
						type="search"
						bind:value={query}
						placeholder="Search"
						aria-label="Search addresses, sites and notes"
						aria-keyshortcuts="/"
						onkeydown={(e) => {
							if (e.key === 'Escape' && query) {
								e.preventDefault();
								query = '';
							}
						}}
					/>
				</InputGroup.Root>

				<!-- wide: both filters inline -->
				<div class="hidden flex-none gap-2 sm:flex">
					<Select.Root type="single" bind:value={statusFilter}>
						<Select.Trigger aria-label="Filter by status">
							{statuses.find((s) => s.value === statusFilter)?.label}
						</Select.Trigger>
						<Select.Content align="end">
							{#each statuses as option (option.value)}
								<Select.Item value={option.value} label={option.label} />
							{/each}
						</Select.Content>
					</Select.Root>
					{#if options.length > 2}
						<Select.Root type="single" bind:value={scope}>
							<Select.Trigger class="max-w-48" aria-label="Filter by account">
								{options.find((o) => o.value === activeScope)?.label}
							</Select.Trigger>
							<Select.Content align="end">
								{#each options as option (option.value)}
									<Select.Item value={option.value} label={option.label} />
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</div>

				<!-- narrow: one Filter key holding both lists, dotted while any filter is on -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class={buttonVariants({
							variant: 'outline',
							size: 'icon',
							class: 'relative sm:hidden'
						})}
						aria-label={filtered ? 'Filters (on)' : 'Filters'}
					>
						<SlidersHorizontal />
						{#if filtered}
							<span class="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary"></span>
						{/if}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Group>
							<DropdownMenu.GroupHeading>Status</DropdownMenu.GroupHeading>
							<DropdownMenu.RadioGroup bind:value={statusFilter}>
								{#each statuses as option (option.value)}
									<DropdownMenu.RadioItem value={option.value}
										>{option.label}</DropdownMenu.RadioItem
									>
								{/each}
							</DropdownMenu.RadioGroup>
						</DropdownMenu.Group>
						{#if options.length > 2}
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.GroupHeading>Account</DropdownMenu.GroupHeading>
								<DropdownMenu.RadioGroup bind:value={scope}>
									{#each options as option (option.value)}
										<DropdownMenu.RadioItem value={option.value}
											>{option.label}</DropdownMenu.RadioItem
										>
									{/each}
								</DropdownMenu.RadioGroup>
							</DropdownMenu.Group>
						{/if}
						{#if filtered}
							<DropdownMenu.Separator />
							<DropdownMenu.Item onSelect={() => ((statusFilter = 'all'), (scope = ''))}>
								Clear filters
							</DropdownMenu.Item>
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		{/if}
	</div>

	{#if !status.ready}
		<div class="grid gap-3 py-3" aria-hidden="true">
			{#each [0, 1, 2] as i (i)}<Skeleton class="h-10 w-full" />{/each}
		</div>
	{:else if rows.length}
		<div>
			<!-- one menu for every row; the row is read from the event target -->
			<ContextMenu.Root>
				<ContextMenu.Trigger class="select-text">
					{#snippet child({ props })}
						<ul {...props} oncontextmenucapture={pick} onpointerdowncapture={pick}>
							{#each visible as item (item.address)}
								<li
									data-address={item.address}
									class="border-t"
									animate:flip={flipOptions()}
									in:enter
									out:leave
								>
									<AddressRow
										{item}
										showOwner={!activeScope && db.accounts.length > 1}
										selected={selected.has(item.address)}
										onselect={(checked) => toggle(item.address, checked)}
									/>
								</li>
							{/each}
						</ul>
					{/snippet}
				</ContextMenu.Trigger>
				<!-- the trigger is the whole list; focusing it on close would scroll to its top -->
				<ContextMenu.Content class="min-w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
					{#if targetItem}
						{@const address = targetItem.address}
						{#each addressActions(targetItem) as action (action.label)}
							{#if action.group}<ContextMenu.Separator />{/if}
							<ContextMenu.Item
								variant={action.destructive ? 'destructive' : 'default'}
								onSelect={action.run}
							>
								<action.icon />{action.label}
							</ContextMenu.Item>
						{/each}
						<ContextMenu.Separator />
						<ContextMenu.Item onSelect={() => toggle(address, !selected.has(address))}>
							<SquareCheck />{selected.has(address) ? 'Deselect' : 'Select'}
						</ContextMenu.Item>
					{/if}
				</ContextMenu.Content>
			</ContextMenu.Root>
		</div>
		{#if pageCount > 1}
			<Pagination.Root
				count={rows.length}
				perPage={PER_PAGE}
				bind:page
				onPageChange={toListTop}
				class="mt-4"
			>
				{#snippet children({ pages, currentPage })}
					<Pagination.Content>
						<Pagination.Item><Pagination.Previous /></Pagination.Item>
						{#each pages as p (p.key)}
							<Pagination.Item>
								{#if p.type === 'ellipsis'}
									<Pagination.Ellipsis />
								{:else}
									<Pagination.Link page={p} isActive={currentPage === p.value}>
										{p.value}
									</Pagination.Link>
								{/if}
							</Pagination.Item>
						{/each}
						<Pagination.Item><Pagination.Next /></Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		{/if}
	{:else}
		{@const term = query.trim()}
		{@const scopeLabel = options.find((o) => o.value === activeScope)?.label}
		{#if !db.addresses.length}
			<EmptyState icon={MailPlus} title="No addresses yet">
				Press New address and every one you make is listed here, newest first.
			</EmptyState>
		{:else}
			{@const kind =
				statusFilter === 'off' ? 'deactivated ' : statusFilter === 'active' ? 'active ' : ''}
			{@const where = activeScope ? ` for ${scopeLabel}` : ''}
			<EmptyState
				icon={SearchX}
				title={term ? `No ${kind}addresses match “${term}”` : `No ${kind}addresses${where}`}
			>
				{term
					? `Search checks addresses, sites and notes${where ? ` in ${scopeLabel}` : ''}.`
					: 'Try a different filter.'}
				{#snippet actions()}
					{#if term}
						<Button variant="outline" size="sm" onclick={() => (query = '')}>Clear search</Button>
					{/if}
					{#if activeScope}
						<Button variant="outline" size="sm" onclick={() => (scope = '')}>
							Show all accounts
						</Button>
					{/if}
					{#if statusFilter !== 'all'}
						<Button variant="outline" size="sm" onclick={() => (statusFilter = 'all')}>
							Any status
						</Button>
					{/if}
				{/snippet}
			</EmptyState>
		{/if}
	{/if}
</Panel>
