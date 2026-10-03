import { describe, expect, it } from 'vitest';
import { buildMetadataReport } from './report.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildMetadataReport', () => {
	it('exports file info, findings, every group and the reverse search links', () => {
		const report = buildMetadataReport({
			file: { name: 'photo.jpg', size: 2048 },
			result: {
				format: 'jpeg',
				formatLabel: 'JPEG',
				isImage: true,
				file: [{ label: 'Name', value: 'photo.jpg' }],
				highlights: [
					{ label: 'Camera', value: 'Canon EOS 5D' },
					{ label: 'OpenStreetMap', value: 'open map', href: 'https://osm.org/?mlat=1&mlon=2' }
				],
				groups: [{ id: 'exif', label: 'EXIF', rows: [{ label: 'Make', value: 'Canon' }] }],
				notes: ['Metadata can be forged.']
			}
		});
		expect(report.input).toBe('photo.jpg (2.0 KB)');
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| Detected format | JPEG |');
		expect(markdown).toContain('| OpenStreetMap | [open map](https://osm.org/?mlat=1&mlon=2) |');
		expect(markdown).toContain('### EXIF (1)');
		expect(markdown).toContain('Metadata can be forged.');
		expect(markdown).toContain('[TinEye](https://tineye.com/)');
	});

	it('leaves out empty groups and the reverse search for documents', () => {
		const report = buildMetadataReport({
			file: { name: 'doc.pdf', size: 10 },
			result: {
				format: 'pdf',
				formatLabel: 'PDF',
				isImage: false,
				file: [],
				highlights: [],
				groups: [],
				notes: ['No metadata found.']
			}
		});
		expect(report.sections.map((section) => section.title)).toEqual(['File', 'Key findings']);
	});
});
