import { describe, expect, it } from 'vitest';
import { buildIpReport } from './report.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildIpReport', () => {
	it('exports every lookup section with its state', () => {
		const report = buildIpReport({
			target: { address: '8.8.8.8', version: 4 },
			special: null,
			resolved: { hostname: 'dns.google' },
			sections: {
				geo: { status: 'loading' },
				ptr: { status: 'done', data: ['dns.google'] },
				rdap: { status: 'error', error: 'rdap.org answered with HTTP 500.' },
				scan: {
					status: 'done',
					data: {
						ports: [{ port: 53, service: 'dns' }],
						hostnames: [],
						cpes: [],
						tags: [],
						vulns: ['CVE-2024-1']
					}
				}
			}
		});
		expect(report.tool).toBe('ip');
		expect(report.input).toBe('dns.google (8.8.8.8)');
		expect(report.sections.map((section) => section.status)).toEqual([
			'loading',
			'done',
			'error',
			'done'
		]);
		const markdown = toMarkdown(report);
		expect(markdown).toContain('### Open ports (1)\n\n- 53 (dns)');
		expect(markdown).toContain('- [CVE-2024-1](https://nvd.nist.gov/vuln/detail/CVE-2024-1)');
		expect(markdown).not.toContain('Hostnames');
	});

	it('explains why special addresses were not looked up', () => {
		const report = buildIpReport({
			target: { address: '10.0.0.1', version: 4 },
			special: { label: 'Private network', cidr: '10.0.0.0/8', description: 'RFC 1918.' },
			resolved: null,
			sections: /** @type {any} */ ({})
		});
		expect(report.sections).toHaveLength(1);
		expect(toMarkdown(report)).toContain('10.0.0.0/8');
	});
});
