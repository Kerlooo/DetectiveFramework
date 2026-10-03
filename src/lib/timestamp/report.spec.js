import { describe, expect, it } from 'vitest';
import { buildTimestampReport } from './report.js';
import { decodeInput } from './decode.js';
import { toMarkdown } from '$lib/export/markdown.js';

const now = Date.UTC(2026, 9, 3);

describe('buildTimestampReport', () => {
	it('exports every interpretation of an ID, unlikely ones marked', () => {
		const input = ' 1212092628029698048 ';
		const decoding = decodeInput(input, { now });
		const report = buildTimestampReport({ input, decoding, now });
		expect(report.tool).toBe('timestamp');
		expect(report.input).toBe('1212092628029698048');
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| UTC (ISO 8601) | 2019-12-31T');
		expect(markdown).toContain('· unlikely');
		expect(report.sections.length).toBe(decoding.kind === 'ids' ? decoding.results.length : -1);
	});

	it('exports a pasted date as every format', () => {
		const input = '2024-01-01T00:00:00Z';
		const report = buildTimestampReport({ input, decoding: decodeInput(input, { now }), now });
		expect(report.sections.map((section) => section.title)).toEqual([
			'Date',
			expect.any(String),
			expect.any(String)
		]);
		expect(toMarkdown(report)).toContain('| 1704067200 |');
	});
});
