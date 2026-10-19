// Passphrase sealing for backups: PBKDF2-SHA256 → AES-GCM-256, Web Crypto only.

import type { Sealed } from './schema.js';

const ITERATIONS = 600_000; // OWASP 2023 guidance for PBKDF2-SHA256

const text = new TextEncoder();

function toBase64(bytes: Uint8Array) {
	let s = '';
	// chunked: spreading a large array into fromCharCode overflows the stack
	for (let i = 0; i < bytes.length; i += 0x8000)
		s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(s);
}

const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
	const base = await crypto.subtle.importKey('raw', text.encode(passphrase), 'PBKDF2', false, [
		'deriveKey'
	]);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
		base,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export async function seal(
	value: unknown,
	passphrase: string,
	iterations = ITERATIONS
): Promise<Sealed> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(passphrase, salt, iterations);
	const data = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		text.encode(JSON.stringify(value))
	);
	return {
		alg: 'AES-GCM',
		kdf: 'PBKDF2-SHA256',
		iterations,
		salt: toBase64(salt),
		iv: toBase64(iv),
		data: toBase64(new Uint8Array(data))
	};
}

/** GCM authenticates, so a wrong passphrase and a tampered file fail the same way. */
export async function unseal(sealed: Sealed, passphrase: string): Promise<unknown> {
	try {
		const key = await deriveKey(passphrase, fromBase64(sealed.salt), sealed.iterations);
		const plain = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: fromBase64(sealed.iv) },
			key,
			fromBase64(sealed.data)
		);
		return JSON.parse(new TextDecoder().decode(plain));
	} catch {
		throw new Error('Wrong passphrase, or the file is damaged.');
	}
}
