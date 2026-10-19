// Shared transitions. Short, ease-out, and reduced to plain fades when the
// user asks for less motion.

import { fade, fly, slide } from 'svelte/transition';
import { prefersReducedMotion } from 'svelte/motion';
import { quintOut } from 'svelte/easing';

const reduced = () => prefersReducedMotion.current;

export const enter = (node: Element, { y = 8, duration = 220 } = {}) =>
	reduced() ? fade(node, { duration: 120 }) : fly(node, { y, duration, easing: quintOut });

/** Collapses height so the rows below close the gap instead of jumping. */
export const leave = (node: Element) =>
	reduced() ? fade(node, { duration: 100 }) : slide(node, { duration: 180, easing: quintOut });

export const flipOptions = () => ({ duration: reduced() ? 0 : 200, easing: quintOut });
