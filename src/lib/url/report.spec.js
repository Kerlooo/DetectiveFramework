import { describe, expect, it } from 'vitest';
import { buildUrlReport } from './report.js';
import { analyzeUrl } from './analyze.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildUrlReport', () => {
	it('exports the offline analysis defanged and each remote section state', () => {
		const result = analyzeUrl('https://example.com/login?utm_source=mail&next=https://evil.test/x');
		const report = buildUrlReport({
			result,
			showUrlscan: true,
			sections: {
				expand: { status: 'loading' },
				urlscan: {
					status: 'done',
					data: { total: 0, search_url: 'https://urlscan.io/', results: [] }
				},
				urlhaus: { status: 'backend' },
				wayback: {
					status: 'done',
					data: { snapshot: null, historyUrl: 'https://web.archive.org/web/*/example.com' }
				}
			}
		});
		expect(report.input).toBe(result.defanged);
		expect(report.input).toMatch(/^hxxps/);
		const titles = report.sections.map((section) => section.title);
		expect(titles).toContain('Embedded URLs');
		expect(titles).not.toContain('Short link expansion');
		const byTitle = Object.fromEntries(report.sections.map((section) => [section.title, section]));
		expect(byTitle['Existing urlscan.io scans'].blocks[0]).toEqual({
			type: 'text',
			text: 'No public scans for this host.'
		});
		expect(byTitle.URLhaus.error).toContain('Backend not running');
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| utm\\_source (tracking) | mail |');
		expect(markdown).toContain('(plain, redirect): hxxps\\[://\\]evil');
		expect(markdown).toContain('- [All captures](https://web.archive.org/web/*/example.com)');
	});
});
