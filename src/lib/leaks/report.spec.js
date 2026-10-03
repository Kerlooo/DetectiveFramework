import { describe, expect, it } from 'vitest';
import { buildLeaksReport } from './report.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildLeaksReport', () => {
	it('exports one block per breach', () => {
		const report = buildLeaksReport({
			email: 'john@example.com',
			breaches: [
				{
					id: 'Adobe',
					date: '2013-10-04',
					domain: 'adobe.com',
					industry: 'Software',
					records: 152445165,
					exposedData: ['Email addresses', 'Passwords'],
					description: 'Adobe breach.',
					verified: true
				},
				{
					id: 'Unknown',
					date: null,
					domain: null,
					industry: null,
					records: null,
					exposedData: [],
					description: null,
					verified: null
				}
			]
		});
		expect(report.tool).toBe('leaks');
		expect(report.input).toBe('john@example.com');
		const markdown = toMarkdown(report);
		expect(markdown).toContain('john@example.com appears in 2 known breaches.');
		expect(markdown).toContain('### Adobe');
		expect(markdown).toContain('| Exposed data types | Email addresses, Passwords |');
		expect(markdown).toContain('| Verified | yes |');
		expect(markdown).toContain('| Description | No details available in the breach catalog. |');
	});

	it('says when the address was not found', () => {
		const markdown = toMarkdown(buildLeaksReport({ email: 'a@example.com', breaches: [] }));
		expect(markdown).toContain("a@example.com was not found in XposedOrNot's breach database.");
	});
});
