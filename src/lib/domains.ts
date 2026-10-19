// "Used on" values: whatever was pasted (URL, host, or plain text), compared
// by registrable domain the way password managers do, so oauth.example.com
// and dashboard.example.com are the same site but bar.co.uk and foo.co.uk are not.

// The Public Suffix List is ~100 KB gzipped, so it loads on first domain-like search.
let getDomain: ((host: string) => string | null) | null = null;

export async function loadSuffixList() {
	if (getDomain) return;
	const tldts = await import('tldts');
	// private suffixes too: a.github.io and b.github.io belong to different people
	getDomain = (host) => tldts.getDomain(host, { allowPrivateDomains: true });
}

/** Hostname from a URL or bare host; null for text that isn't one. */
export function hostOf(input: string): string | null {
	const s = input.trim();
	if (!s || /\s/.test(s)) return null;
	try {
		const host = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(s) ? s : `https://${s}`).hostname;
		return host.includes('.') || host === 'localhost' ? host.toLowerCase() : null;
	} catch {
		return null;
	}
}

/** Registrable domain (eTLD+1); the bare host until the list loads, and for IPs. */
export function siteOf(input: string): string | null {
	const host = hostOf(input);
	return host ? (getDomain?.(host) ?? host) : null;
}

/** Short label for a stored value: the host, without a leading www. */
export const siteLabel = (input: string) => hostOf(input)?.replace(/^www\./, '') ?? input.trim();

/** True when the query names the same site as the stored value. */
export function sameSite(stored: string, query: string) {
	const q = siteOf(query);
	return !!q && siteOf(stored) === q;
}
