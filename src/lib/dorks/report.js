import { t } from '$lib/i18n/i18n.svelte.js';
import { createReport, section, table } from '$lib/export/report.js';

/**
 * Builds the exported report of the Google Dork Generator: one section per category,
 * each query linked to its Google search.
 * @param {{ typeLabel: string, result: ReturnType<typeof import('./generate.js').generateDorks> }} state
 */
export function buildDorksReport({ typeLabel, result }) {
	return createReport({
		tool: 'dorks',
		input: `${typeLabel}: ${result.target?.value ?? ''}`,
		sections: result.groups.map((group) =>
			section(
				`${group.label} (${group.dorks.length})`,
				[
					table(
						[t('dorks.report.dork'), t('dorks.report.query')],
						group.dorks.map((dork) => [dork.label, { text: dork.query, href: dork.url }])
					)
				],
				{ note: group.description }
			)
		)
	});
}
