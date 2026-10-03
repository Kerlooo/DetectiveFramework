import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createReport, fields, list, section, stateSection, table, text } from './report.js';
import { cleanText, fontLoader, toPdf } from './pdf.js';
import { FORMATS, findFormat } from './files.js';

const now = new Date('2026-10-03T19:52:30Z');
/** @param {string} file */
const loadFont = async (file) =>
	(await readFile(new URL(`../../../static/fonts/${file}`, import.meta.url))).toString('base64');

/** @param {Uint8Array} bytes */
const latin1 = (bytes) => Buffer.from(bytes).toString('latin1');

describe('toPdf', () => {
	const report = createReport({
		tool: 'ip',
		input: '8.8.8.8',
		now,
		sections: [
			section(
				'Geolocation',
				[
					fields([
						{ label: 'Country', value: '🇺🇸 United States (US)' },
						{ label: 'ASN', value: 'AS15169', href: 'https://bgp.he.net/AS15169' }
					])
				],
				{ source: 'ipwho.is', note: 'Approximate.' }
			),
			stateSection('Reverse DNS', { status: 'loading' }, () => []),
			stateSection('RDAP', { status: 'error', error: 'HTTP 500' }, () => []),
			section('Ports', [
				table(
					['Port', 'Service'],
					Array.from({ length: 120 }, (_, i) => [i + 1, `service-${i}`]),
					'Open ports'
				),
				list([{ text: 'CVE-2024-1', href: 'https://nvd.nist.gov/vuln/detail/CVE-2024-1' }]),
				text('Città, àèìòù – “quotes” …')
			])
		]
	});

	it('renders a multi-page PDF with embedded Noto Sans and clickable links', async () => {
		const bytes = await toPdf(report, { loadFont });
		const raw = latin1(bytes);
		expect(raw.startsWith('%PDF-')).toBe(true);
		expect(raw).toContain('/FontName /NotoSans');
		expect(raw).toContain('/URI (https://bgp.he.net/AS15169)');
		expect(raw).toContain('/URI (https://nvd.nist.gov/vuln/detail/CVE-2024-1)');
		expect((raw.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
	});

	it('switches to Noto Sans JP when the report contains Japanese', async () => {
		const japanese = createReport({
			tool: 'ip',
			input: '8.8.8.8',
			now,
			sections: [section('地理位置', [text('アメリカ合衆国')])]
		});
		const fonts = vi.fn(loadFont);
		const raw = latin1(await toPdf(japanese, { loadFont: fonts }));
		expect(fonts).toHaveBeenCalledWith('NotoSansJP-Regular.ttf');
		expect(raw).toContain('/FontName /NotoSansJP');
	});
});

describe('cleanText', () => {
	it('drops emoji and flags the fonts cannot draw', () => {
		expect(cleanText('🇮🇹 Italia  (IT)\n✅ ok')).toBe('Italia (IT) ok');
		expect(cleanText('37.3394, -121.8950 (map ↗)')).toBe('37.3394, -121.8950 (map)');
	});
});

describe('fontLoader', () => {
	it('fetches each font once and encodes it as base64', async () => {
		const fetchImpl = vi.fn(async () => new Response(new Uint8Array([104, 105])));
		const load = fontLoader('https://example.test/fonts/', /** @type {any} */ (fetchImpl));
		expect(await load('A.ttf')).toBe('aGk=');
		expect(await load('A.ttf')).toBe('aGk=');
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(fetchImpl).toHaveBeenCalledWith('https://example.test/fonts/A.ttf');
	});

	it('reports a missing font and retries on the next export', async () => {
		const fetchImpl = vi.fn(async () => new Response('', { status: 404 }));
		const load = fontLoader('https://example.test/missing/', /** @type {any} */ (fetchImpl));
		await expect(load('B.ttf')).rejects.toThrow('Could not load the PDF fonts.');
		await expect(load('B.ttf')).rejects.toThrow();
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});
});

describe('FORMATS', () => {
	it('offers PDF first, then Markdown and JSON', () => {
		expect(FORMATS.map((format) => format.id)).toEqual(['pdf', 'markdown', 'json']);
		expect(findFormat('json').extension).toBe('json');
		expect(findFormat('nope').id).toBe('pdf');
		expect(findFormat(null).id).toBe('pdf');
	});
});
