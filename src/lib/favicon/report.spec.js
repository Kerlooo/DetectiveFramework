import { describe, expect, it } from 'vitest';
import { buildFaviconReport } from './report.js';
import { toMarkdown } from '$lib/export/markdown.js';

const HASHES = { mmh3: -123456, md5: 'a'.repeat(32), sha256: 'b'.repeat(64) };

describe('buildFaviconReport', () => {
	it('exports file details, hashes and search queries', () => {
		const report = buildFaviconReport({
			file: { name: 'favicon.ico', size: 1150, type: 'image/x-icon' },
			format: { label: 'ICO', mime: 'image/x-icon' },
			hashes: HASHES,
			siteUrl: 'https://example.com/favicon.ico'
		});
		expect(report.input).toBe('favicon.ico (1150 bytes)');
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| Shodan favicon hash (mmh3) | -123456 |');
		expect(markdown).toContain('[Open https://example.com/favicon.ico]');
		expect(markdown).toContain('http.favicon.hash:-123456');
		expect(markdown).not.toContain('does not look like an image');
	});

	it('warns when the file is not an image', () => {
		const report = buildFaviconReport({
			file: { name: 'favicon.ico', size: 10, type: '' },
			format: null,
			hashes: HASHES,
			siteUrl: null
		});
		const markdown = toMarkdown(report);
		expect(markdown).toContain('does not look like an image');
		expect(markdown).toContain('| Detected format | Unknown |');
	});
});
