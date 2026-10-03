import { t } from '$lib/i18n/i18n.svelte.js';

/**
 * KeyValueTable rows of an analyzed number, shared by the page and the exported report.
 * @param {NonNullable<ReturnType<typeof import('./analyze.js').analyzePhone>['result']>} result
 */
export function phoneRows(result) {
	return [
		{
			label: t('phone.row.valid'),
			value: result.valid
				? t('common.yes')
				: result.possible
					? t('phone.notAssigned')
					: result.lengthProblem
						? t('phone.noWithReason', { reason: result.lengthProblem })
						: t('common.no')
		},
		{
			label: t('phone.row.possible'),
			value: result.possible ? t('common.yes') : t('common.no')
		},
		{
			label: t('phone.row.country'),
			value: result.country ? `${result.flag} ${result.countryName} (${result.country})` : null
		},
		{ label: t('phone.row.callingCode'), value: result.callingCode },
		{ label: t('phone.row.nationalNumber'), value: result.nationalNumber },
		{ label: t('phone.row.extension'), value: result.extension },
		{
			label: t('phone.row.type'),
			value: result.typeLabel ?? (result.valid ? t('common.unknown') : null)
		}
	];
}
