import { t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, list, section } from '$lib/export/report.js';
import { absoluteUrl } from '$lib/site.js';
import { phoneRows } from './rows.js';

/**
 * Builds the exported report of the Phone Analyzer page.
 * @param {{ input: string, result: NonNullable<ReturnType<typeof import('./analyze.js').analyzePhone>['result']> }} state
 */
export function buildPhoneReport({ input, result }) {
	const number = result.formats.find((format) => format.id === 'international')?.value ?? input;
	return createReport({
		tool: 'phone',
		input: input.trim(),
		sections: [
			section(t('phone.resultsHeading'), [fields(phoneRows(result))], {
				source: 'libphonenumber-js',
				note: t('phone.note')
			}),
			section(t('phone.formatsHeading'), [
				fields(result.formats.map((format) => ({ label: format.label, value: format.value })))
			]),
			section(
				t('phone.pivotHeading'),
				[
					list([
						...result.links.map((link) => ({ text: link.label, href: link.url })),
						{
							text: t('tools.dorks.name'),
							href: absoluteUrl(`/dorks?type=phone&q=${encodeURIComponent(number)}`)
						}
					])
				],
				{ note: t('phone.pivotHint') }
			)
		]
	});
}
