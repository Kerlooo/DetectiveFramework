import { describe, expect, it } from 'vitest';
import { buildMacReport } from './report.js';
import { parseMac, parseMacList } from './parse.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildMacReport', () => {
	it('exports the details, notations and searches of one address', () => {
		const single = /** @type {import('./parse.js').ParsedMac} */ (parseMac('f0:18:98:12:34:56'));
		const report = buildMacReport({
			list: parseMacList('f0:18:98:12:34:56'),
			single,
			vendor: {
				registry: 'MA-L',
				prefix: 'F01898',
				bits: 24,
				organization: 'Apple, Inc.',
				country: 'US'
			},
			vendorText: 'Apple, Inc.',
			tableRows: [],
			updated: 'October 1, 2026'
		});
		expect(report.tool).toBe('mac');
		expect(report.sections.map((section) => section.title)).toEqual([
			'Results',
			'Notations',
			'Pivot'
		]);
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| Vendor | Apple, Inc. |');
		expect(markdown).toContain('| Colon (IEEE) | F0:18:98:12:34:56 |');
		expect(markdown).toContain('Vendor list dated October 1, 2026.');
		expect(markdown).toContain('[Search the vendor on Google](https://www.google.com/search?q=');
	});

	it('exports a list as a table', () => {
		const report = buildMacReport({
			list: parseMacList('f0:18:98:12:34:56\nnope'),
			single: null,
			vendor: null,
			vendorText: '',
			tableRows: [
				{ input: 'f0:18:98:12:34:56', mac: 'F0:18:98:12:34:56', vendor: 'Apple, Inc.', flags: [] },
				{ input: 'nope', mac: null, vendor: 'Not a valid MAC address or OUI prefix.', flags: [] }
			],
			updated: null
		});
		expect(report.input).toBe('f0:18:98:12:34:56, nope');
		expect(toMarkdown(report)).toContain('| nope | Not a valid MAC address or OUI prefix. |  |');
	});
});
