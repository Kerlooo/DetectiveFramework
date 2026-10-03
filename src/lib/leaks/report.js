import { formatNumber, t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, section, text } from '$lib/export/report.js';

/** @typedef {import('./xposedornot.js').Breach} Breach */

/**
 * Builds the exported report of a Leak Check email lookup. Password checks are never
 * exported: a report would only tie a password to its breach count.
 * @param {{ email: string, breaches: Breach[] }} result
 */
export function buildLeaksReport({ email, breaches }) {
	const blocks = breaches.length
		? [
				text(
					`${email} ${t('leaks.email.found', { count: breaches.length, total: formatNumber(breaches.length) })}`
				),
				...breaches.map(breachBlock),
				text(t('leaks.email.advice'))
			]
		: [text(`${email} ${t('leaks.email.notFound')}`), text(t('leaks.email.notFoundNote'))];

	return createReport({
		tool: 'leaks',
		input: email,
		sections: [
			section(t('leaks.email.heading'), blocks, {
				source: 'XposedOrNot',
				note: t('leaks.email.note')
			})
		]
	});
}

/** @param {Breach} breach */
function breachBlock(breach) {
	const details =
		breach.description || breach.date ? breach.description : t('leaks.breach.noDetails');
	return fields(
		[
			{ label: t('leaks.report.date'), value: breach.date },
			{ label: t('leaks.report.domain'), value: breach.domain },
			{ label: t('leaks.report.industry'), value: breach.industry },
			{ label: t('leaks.report.records'), value: breach.records },
			{
				label: t('leaks.report.verified'),
				value: breach.verified === null ? null : breach.verified ? t('common.yes') : t('common.no')
			},
			{ label: t('leaks.breach.exposedData'), value: breach.exposedData.join(', ') },
			{ label: t('leaks.report.description'), value: details }
		],
		breach.id
	);
}
