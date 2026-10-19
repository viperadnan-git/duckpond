import { beforeAll, describe, expect, it } from 'vitest';
import { hostOf, loadSuffixList, sameSite, siteLabel, siteOf } from './domains.js';

beforeAll(loadSuffixList);

describe('domains', () => {
	it('reads hosts from full URLs and bare hosts', () => {
		expect(hostOf('https://oauth.example.com/login?next=/x')).toBe('oauth.example.com');
		expect(hostOf('Shop.Example.com')).toBe('shop.example.com');
		expect(hostOf('Airline app')).toBeNull();
		expect(hostOf('example')).toBeNull();
	});

	it('matches subdomains of one site, like a password manager', () => {
		expect(sameSite('https://oauth.example.com/login', 'dashboard.example.com')).toBe(true);
		expect(sameSite('example.com', 'https://www.example.com/')).toBe(true);
		expect(sameSite('oauth.example.com', 'example.org')).toBe(false);
	});

	it('respects public suffixes', () => {
		expect(siteOf('shop.bbc.co.uk')).toBe('bbc.co.uk');
		expect(sameSite('foo.co.uk', 'bar.co.uk')).toBe(false);
		expect(sameSite('a.github.io', 'b.github.io')).toBe(false);
	});

	it('labels with the host, minus www', () => {
		expect(siteLabel('https://www.airline.com/signup')).toBe('airline.com');
		expect(siteLabel('Airline app')).toBe('Airline app');
	});
});
