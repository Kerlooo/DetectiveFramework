import { t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, list, section, text } from '$lib/export/report.js';
import { formatBytes } from './format.js';
import { REVERSE_ENGINES } from './reverse.js';

/**
 * Builds the exported report of the Metadata Extractor page. The image itself is never
 * embedded, and the search-by-URL links are left out since they depend on a URL typed later.
 * @param {{
 *   file: { name: string, size: number },
 *   result: import('./extract.js').MetadataResult
 * }} state
 */
export function buildMetadataReport({ file, result }) {
	return createReport({
		tool: 'metadata',
		input: `${file.name} (${formatBytes(file.size)})`,
		sections: [
			section(t('metadata.fileHeading'), [
				fields([{ label: t('metadata.detectedFormat'), value: result.formatLabel }, ...result.file])
			]),
			section(t('metadata.summaryHeading'), [
				fields(result.highlights),
				...result.notes.map((note) => text(note))
			]),
			result.groups.length &&
				section(
					t('metadata.allHeading'),
					result.groups.map((group) => fields(group.rows, `${group.label} (${group.rows.length})`))
				),
			result.isImage &&
				section(
					t('metadata.reverseHeading'),
					[
						list(
							REVERSE_ENGINES.map((engine) => ({ text: engine.name, href: engine.uploadUrl })),
							t('metadata.reverse.upload')
						)
					],
					{ note: t('metadata.reverse.hint') }
				)
		].filter((entry) => !!entry)
	});
}
