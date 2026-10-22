// State shared by the guided flows: one inline error, a busy flag, and the
// resend cooldown after DuckDuckGo emails a passphrase.

import type { ZodError } from 'zod';
import { firstError } from './schema.js';

export class Flow {
	error = $state('');
	busy = $state(false);
	cooldown = $state(0);
	#timer: ReturnType<typeof setInterval> | undefined;

	/** The inline error in the shape Field.Error takes. */
	get errors() {
		return this.error ? [{ message: this.error }] : undefined;
	}

	/** Runs one step; a thrown message becomes the step's inline error. */
	async run(action: () => Promise<void>) {
		this.error = '';
		this.busy = true;
		try {
			await action();
		} catch (err) {
			this.error = (err as Error).message;
		} finally {
			this.busy = false;
		}
	}

	/** DuckDuckGo throttles passphrase emails; 30s keeps a resend from tripping it. */
	sent() {
		this.cooldown = 30;
		clearInterval(this.#timer);
		this.#timer = setInterval(() => --this.cooldown <= 0 && clearInterval(this.#timer), 1000);
	}
}

/** Throws the schema's message so the step shows one inline error. */
export function valid<T>(result: { success: true; data: T } | { success: false; error: ZodError }) {
	if (!result.success) throw new Error(firstError(result.error));
	return result.data;
}
