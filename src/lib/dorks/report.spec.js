import { describe, expect, it } from 'vitest';
import { buildDorksReport } from './report.js';
import { generateDorks } from './generate.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildDorksReport', () => {
	it('exports one section per category with linked queries', () => {
		const result = generateDorks('username', 'johndoe');
		const report = buildDorksReport({ typeLabel: 'Username', result });
		expect(report.tool).toBe('dorks');
		expect(report.input).toBe('Username: johndoe');
		expect(report.sections).toHaveLength(result.groups.length);
		expect(report.sections[0].title).toBe(`General (${result.groups[0].dorks.length})`);
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| Dork | Query |');
		expect(markdown).toContain('](https://www.google.com/search?q=');
	});
});
