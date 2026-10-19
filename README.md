<div align="center">

<img src="static/favicon.svg" width="72" height="72" alt="Duckpond logo">

# Duckpond

Generate and manage [DuckDuckGo Email Protection](https://duckduckgo.com/email) addresses across accounts, all in your browser.

[![Deploy](https://github.com/viperadnan-git/duckpond/actions/workflows/deploy.yml/badge.svg)](https://github.com/viperadnan-git/duckpond/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/github/license/viperadnan-git/duckpond)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/docs/kit)

[**duck.viperadnan.com**](https://duck.viperadnan.com)

</div>

## Features

- **Multiple accounts.** Sign in with the emailed passphrase or an access token.
- **One searchable list.** Filter, paginate, multi-select, and act from a context menu.
- **Where it's used.** Tag each address with a site; any subdomain finds it.
- **Alias control.** Deactivate, reactivate and check status at DuckDuckGo.
- **Encrypted backups.** AES-256-GCM, per account or all, plus CSV export.
- **Installable.** Works as a PWA, with light and dark themes and keyboard shortcuts.

## Privacy

There is no Duckpond server. Tokens and addresses stay in your browser's
`localStorage`. DuckDuckGo's API blocks browser requests, so calls go through a
CORS proxy (`cors.viperadnan.com` by default, configurable in Settings). Use
your own if you prefer; it must forward the `User-Agent` header.

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev      # start the dev server
bun run test     # unit tests
bun run check    # type check
bun run lint     # prettier + eslint
bun run build    # static site in build/
```

Built with SvelteKit, Svelte 5, Tailwind CSS 4, shadcn-svelte and Zod.

## Self-hosting

`bun run build` produces a static site you can serve from anywhere. The
included [workflow](.github/workflows/deploy.yml) deploys to GitHub Pages on
push to `main`; set **Settings → Pages → Source** to **GitHub Actions**.
Update the site URL in [`src/lib/site.ts`](src/lib/site.ts) for your domain.

## Contributing

Issues and pull requests are welcome. Run `bun run lint` and `bun run test`
before opening a PR.

## License

[MIT](LICENSE). Duck icon by Arto Moro from [Noun Project](https://thenounproject.com/) (CC BY 3.0).

Not affiliated with DuckDuckGo.
