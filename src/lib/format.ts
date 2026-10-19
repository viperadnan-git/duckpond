export function ago(ts: number) {
	const s = Math.max(0, (Date.now() - ts) / 1000);
	if (s < 60) return 'just now';
	if (s < 3600) return `${Math.floor(s / 60)}m ago`;
	if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
	if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
	return new Date(ts).toLocaleDateString();
}

export const plural = (n: number, word: string, many = `${word}es`) =>
	`${n} ${n === 1 ? word : many}`;

/** Local time with seconds, so two backups a minute apart never collide. */
export function stamp(at = new Date()) {
	const pad = (n: number) => String(n).padStart(2, '0');
	return (
		`${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` +
		`-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`
	);
}
