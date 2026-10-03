import { describe, expect, it } from 'vitest';
import { buildDomainReport } from './report.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildDomainReport', () => {
	it('exports every section with its state', () => {
		const report = buildDomainReport({
			domain: 'example.com',
			sections: {
				dns: {
					status: 'done',
					data: [
						{
							type: 'A',
							records: [{ name: 'example.com', ttl: 300, data: '93.184.215.14' }],
							error: null
						},
						{ type: 'CAA', records: [], error: null }
					],
					error: null
				},
				email: {
					status: 'done',
					data: {
						auth: { spf: null, dmarc: null },
						findings: [{ level: 'bad', key: 'spf', text: 'No SPF record.' }]
					},
					error: null
				},
				rdap: { status: 'done', data: null, error: null },
				subdomains: { status: 'loading', data: null, error: null },
				archive: { status: 'error', data: null, error: 'archive.org did not answer in time.' }
			}
		});
		expect(report.tool).toBe('domain');
		expect(report.input).toBe('example.com');
		expect(report.sections.map((section) => section.status)).toEqual([
			'done',
			'done',
			'empty',
			'loading',
			'error'
		]);
		const markdown = toMarkdown(report);
		expect(markdown).toContain('### A (1)\n\n- 93.184.215.14 (TTL 300s)');
		expect(markdown).toContain('No CAA records.');
		expect(markdown).toContain('- RISK: No SPF record.');
		expect(markdown).toContain('No RDAP record found for example.com.');
	});

	it('lists subdomains and archive links', () => {
		const report = buildDomainReport({
			domain: 'example.com',
			sections: /** @type {any} */ ({
				subdomains: {
					status: 'done',
					data: {
						names: ['a.example.com'],
						source: 'crt.sh',
						partial: false,
						fallbackReason: null
					},
					error: null
				},
				archive: {
					status: 'done',
					data: {
						snapshot: {
							url: 'https://web.archive.org/web/2024/example.com',
							date: '2024-01-01',
							status: '200'
						},
						historyUrl: 'https://web.archive.org/web/*/example.com*'
					},
					error: null
				}
			})
		});
		const markdown = toMarkdown(report);
		expect(markdown).toContain('1 unique subdomain from crt.sh\n\n- a.example.com');
		expect(markdown).toContain('Closest snapshot: 2024-01-01 (HTTP 200)');
		expect(markdown).toContain('[open snapshot](https://web.archive.org/web/2024/example.com)');
	});
});
