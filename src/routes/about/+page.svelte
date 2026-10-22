<script lang="ts">
	import Head from '#lib/components/Head.svelte';
	import JsonLd from '#lib/components/JsonLd.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import Doodle from '#lib/components/Doodle.svelte';
	import * as Accordion from '#lib/components/ui/accordion/index.js';
	import { resolve } from '$app/paths';
	import { site } from '#lib/site.js';
	import { DEFAULT_PROXY } from '#lib/schema.js';

	const faq = [
		{
			q: 'What is a Duck Address?',
			a: 'A private @duck.com email address from DuckDuckGo Email Protection. Mail sent to it is stripped of trackers and forwarded to your real inbox, so sites never learn your actual address.'
		},
		{
			q: 'How does signing in work?',
			a: 'Enter your Duck username and DuckDuckGo emails a one-time, four-word passphrase to your forwarding address. Duckpond trades it for your account’s access token, the same one the DuckDuckGo extension uses.'
		},
		{
			q: 'Where are my tokens and addresses stored?',
			a: 'Only in this browser’s local storage. There is no Duckpond server or account. Requests reach DuckDuckGo through a CORS proxy, because DuckDuckGo’s API blocks direct browser calls.'
		},
		{
			q: 'Can I use more than one DuckDuckGo account?',
			a: 'Yes. Add as many accounts as you like and switch between them. Every address is recorded with the account that made it, and the list can be filtered by account.'
		},
		{
			q: 'What happens when I log out?',
			a: 'The account and the addresses it made are removed from this browser. The addresses keep working at DuckDuckGo. Download a backup first if you want to keep the list.'
		},
		{
			q: 'Can I turn an address off?',
			a: 'Yes. Deactivate it from the address’s menu and DuckDuckGo stops forwarding mail sent to it. Reactivate it the same way. If you deactivated one from an email banner, use Check status to update the list.'
		},
		{
			q: 'How do I move my addresses to another device?',
			a: 'Download a backup in Settings, of every account or just one, and restore it on the other device. Backups are locked with a passphrase by default, because they include your access tokens.'
		},
		{
			q: 'Is Duckpond made by DuckDuckGo?',
			a: 'No. It is an independent, open-source tool that talks to the same API as DuckDuckGo’s own extension. It is not affiliated with or endorsed by DuckDuckGo.'
		}
	];

	const faqPage = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faq.map(({ q, a }) => ({
			'@type': 'Question',
			name: q,
			acceptedAnswer: { '@type': 'Answer', text: a }
		}))
	};
</script>

<Head
	title="About"
	description="What Duckpond is, how signing in works, and where your Duck Address tokens are stored."
	index
/>
<JsonLd data={faqPage} />

<h1 class="mb-6 px-1 text-[28px] leading-tight font-bold tracking-[-0.025em] md:mb-8 md:text-4xl">
	About
	<span class="relative whitespace-nowrap"
		>Duckpond<Doodle
			shape="underline"
			draw
			width={3.5}
			class="absolute -bottom-2 left-0 h-3 w-full text-link"
		/></span
	>
</h1>

<div class="grid gap-4">
	<Panel title="About" id="about">
		<div class="space-y-3 text-[15px] leading-relaxed">
			<p>Duckpond is a Duck Address generator and alias manager for DuckDuckGo Email Protection.</p>
			<p class="text-muted-foreground">
				DuckDuckGo shows you one new address at a time and keeps no list of the ones you’ve made.
				Duckpond keeps that list for you, across every account you add, with notes, search, and
				backups.
			</p>
			<p class="text-muted-foreground">
				Everything runs in your browser. There is no Duckpond server and nothing to sign up for.
			</p>
		</div>
		<p class="mt-5 text-xs text-muted-foreground">
			Open source on <a href={site.repo} rel="external" class="underline">GitHub</a>. Not affiliated
			with DuckDuckGo. Duck icon by Arto Moro from
			<a href="https://thenounproject.com/" rel="external" class="underline">Noun Project</a>
			(CC BY 3.0).
		</p>
	</Panel>

	<Panel title="CORS proxy" id="proxy">
		<div class="space-y-3 text-[15px] leading-relaxed">
			<p>
				DuckDuckGo’s API doesn’t allow requests from other websites, so your browser blocks Duckpond
				from calling it directly. A CORS proxy passes each request on to DuckDuckGo and returns the
				reply with the headers your browser needs.
			</p>
			<p class="text-muted-foreground">
				Every request goes through the proxy, including your access token and the passphrases you
				enter to sign in. Use a proxy you trust, the same as you would any server that handles your
				token.
			</p>
			<p class="text-muted-foreground">
				The default, <span class="font-mono text-[13px] text-foreground"
					>{new URL(DEFAULT_PROXY).host}</span
				>, is run by {site.proxy.operator}. To use your own, enter its prefix in
				<a
					href="{resolve('/settings')}#cors-proxy"
					class="text-foreground underline underline-offset-4">Settings</a
				>. Duckpond adds the encoded DuckDuckGo URL to the end. It must pass on the
				<span class="font-mono text-[13px]">Authorization</span>,
				<span class="font-mono text-[13px]">Content-Type</span> and
				<span class="font-mono text-[13px]">User-Agent</span> headers and the request body, because DuckDuckGo
				refuses requests without a browser User-Agent.
			</p>
		</div>
	</Panel>

	<Panel title="Keyboard shortcuts" id="shortcuts">
		<dl class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-sm">
			{#each [['N', 'New address'], ['C', 'Copy the latest address'], ['/', 'Search addresses'], ['Esc', 'Clear the search']] as [key, does] (key)}
				<dt>
					<Kbd>{key}</Kbd>
				</dt>
				<dd class="text-muted-foreground">{does}</dd>
			{/each}
		</dl>
	</Panel>

	<Panel title="Questions" id="questions" flush>
		<Accordion.Root type="single">
			{#each faq as { q, a } (q)}
				<Accordion.Item value={q}>
					<Accordion.Trigger level={3}>{q}</Accordion.Trigger>
					<Accordion.Content>{a}</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</Panel>
</div>
