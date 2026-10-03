import { describe, expect, it } from 'vitest';
import { buildHashReport } from './report.js';
import { hashText } from './compute.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildHashReport', () => {
	it('exports every digest and the verifier verdict', async () => {
		const digests = await hashText('hello');
		const report = buildHashReport({
			mode: 'text',
			text: 'hello',
			file: null,
			digests,
			expected: '5d41402abc4b2a76b9719d911017c592'
		});
		expect(report.input).toBe('hello');
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| MD5 | 5d41402abc4b2a76b9719d911017c592 |');
		expect(markdown).toContain('| Possible type | MD5, NTLM, MD4, LM |');
		expect(markdown).toContain('✔ Match: MD5');
	});

	it('uses the file name as input and truncates long texts', async () => {
		const digests = await hashText('x');
		const file = buildHashReport({
			mode: 'file',
			text: '',
			file: { name: 'a.bin', size: 2048 },
			digests,
			expected: ''
		});
		expect(file.input).toBe('a.bin (2.0 KB)');
		expect(file.sections).toHaveLength(1);
		const long = buildHashReport({
			mode: 'text',
			text: 'a'.repeat(500),
			file: null,
			digests,
			expected: ''
		});
		expect(long.input).toBe(`${'a'.repeat(80)}…`);
	});
});
