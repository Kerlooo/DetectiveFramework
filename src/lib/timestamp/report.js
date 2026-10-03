import { formatDate, getLocale, t } from '$lib/i18n/i18n.svelte.js';
import { absoluteUrl } from '$lib/site.js';
import { createReport, fields, list, section, text } from '$lib/export/report.js';
import { isoFromNs, nsToMs, relativeParts } from './time.js';

/** @typedef {import('./decode.js').Decoding} Decoding */
/** @typedef {import('./decode.js').Interpretation} Interpretation */

/**
 * Builds the exported report of the ID and Timestamp Decoder page. Every interpretation
 * is exported, the unlikely ones after the plausible ones and marked as such.
 * @param {{ input: string, decoding: Decoding, now: number }} state
 */
export function buildTimestampReport({ input, decoding, now }) {
	/** @type {import('$lib/export/report.js').ReportSection[]} */
	let sections = [];

	if (decoding.kind === 'date') {
		sections = [
			section(t('timestamp.dateHeading'), [dateFields(decoding.ns, now)]),
			section(t('timestamp.numericHeading'), [valueFields(decoding.numeric)]),
			section(t('timestamp.idsHeading'), [valueFields(decoding.ids)], {
				note: t('timestamp.idsHint')
			})
		];
	} else if (decoding.kind === 'ids') {
		const plausible = decoding.results.filter((result) => result.plausible);
		const unlikely = decoding.results.filter((result) => !result.plausible);
		const intro = section(t('timestamp.resultsHeading'), [
			decoding.hint &&
				text(t('timestamp.fromLink', { platform: t(`timestamp.platform.${decoding.hint}`) })),
			!plausible.length && text(t('timestamp.noPlausible'))
		]);
		sections = [
			...(intro.status === 'done' ? [intro] : []),
			...[...plausible, ...unlikely].map((result) => resultSection(result, now))
		];
	}

	return createReport({ tool: 'timestamp', input: input.trim(), sections });
}

/**
 * @param {Interpretation} result
 * @param {number} now
 */
function resultSection(result, now) {
	const title = [
		t(`timestamp.format.${result.id}`),
		!result.plausible && t('timestamp.unlikely'),
		result.approximate && t('timestamp.approximate')
	];
	const macPivot = result.fields.find((field) => field.pivot === 'mac')?.value ?? null;
	return section(
		title.filter(Boolean).join(' · '),
		[
			result.ns !== null ? dateFields(result.ns, now) : text(t('timestamp.noDate')),
			fields(
				result.fields.map((field) => ({
					label: t(`timestamp.field.${field.id}`),
					value: field.valueKey
						? t(`timestamp.value.${field.valueKey}`, { value: field.value })
						: field.value
				}))
			),
			list(
				[
					result.link && { text: t(`timestamp.link.${result.link.id}`), href: result.link.href },
					macPivot && {
						text: t('timestamp.pivotMac'),
						href: absoluteUrl(`/mac?q=${encodeURIComponent(macPivot)}`)
					}
				].filter((item) => !!item)
			)
		],
		result.note ? { note: t(`timestamp.note.${result.note}`) } : {}
	);
}

/**
 * UTC, local and relative time, as in the page's date block.
 * @param {bigint} ns
 * @param {number} now
 */
function dateFields(ns, now) {
	const ms = nsToMs(ns);
	const { value, unit } = relativeParts(ms, now);
	return fields([
		{ label: t('timestamp.row.utc'), value: isoFromNs(ns) },
		{
			label: t('timestamp.row.local'),
			value: formatDate(ms, { dateStyle: 'full', timeStyle: 'long' })
		},
		{
			label: t('timestamp.row.relative'),
			value: new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' }).format(value, unit)
		}
	]);
}

/** @param {{ id: string, value: string }[]} values */
const valueFields = (values) =>
	fields(values.map((item) => ({ label: t(`timestamp.format.${item.id}`), value: item.value })));
