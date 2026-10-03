import { describe, expect, it } from 'vitest';
import { buildEmailReport } from './report.js';
import { analyzeAddress } from './address.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildEmailReport', () => {
	it('exports the address and every lookup with its state', () => {
		const report = buildEmailReport({
			target: { email: 'info+news@example.com', local: 'info+news', domain: 'example.com' },
			address: analyzeAddress('info+news', 'example.com'),
			disposable: { loading: true, error: '', data: null },
			mail: {
				loading: false,
				error: '',
				data: /** @type {any} */ ({
					mx: [{ priority: 10, host: 'mx.example.com' }],
					hasAddress: false,
					spf: { record: 'v=spf1 -all' },
					dmarc: null,
					verdicts: {
						mx: { level: 'good', text: 'The domain can receive mail.' },
						spf: { level: 'good', text: 'Strict.' },
						dmarc: { level: 'bad', text: 'No DMARC record.' }
					}
				})
			},
			gravatar: { loading: false, error: 'gravatar.com answered with HTTP 500.', data: null }
		});
		expect(report.tool).toBe('email');
		expect(report.input).toBe('info+news@example.com');
		expect(report.sections.map((section) => section.status)).toEqual([
			'done',
			'loading',
			'done',
			'error'
		]);
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| Plus tag | news |');
		expect(markdown).toContain('| DMARC | RISK: No DMARC record. |');
		expect(markdown).toContain('| 10 | mx.example.com |');
		expect(markdown).toContain('| SPF | v=spf1 -all |');
	});

	it('shows Gravatar accounts and a missing profile', () => {
		const report = buildEmailReport({
			target: { email: 'a@example.com', local: 'a', domain: 'example.com' },
			address: analyzeAddress('a', 'example.com'),
			disposable: {
				loading: false,
				error: '',
				data: { disposable: false, match: null, listSize: 1000 }
			},
			mail: { loading: true, error: '', data: null },
			gravatar: { loading: false, error: '', data: { hash: 'abc', profile: null } }
		});
		const markdown = toMarkdown(report);
		expect(markdown).toContain('Not listed as disposable.');
		expect(markdown).toContain('Checked against 1,000 domains');
		expect(markdown).toContain('| SHA-256 | abc |');
		expect(markdown).toContain('No public Gravatar profile for this address.');
	});
});
