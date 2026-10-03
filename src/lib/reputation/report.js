import { t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, list, section, stateSection, text } from '$lib/export/report.js';
import { detailRows, displayDate } from './rows.js';

/**
 * @typedef {import('./indicator.js').Indicator} Indicator
 * @typedef {import('./sources.js').SourceResult} SourceResult
 * @typedef {{ status: 'loading' | 'done' | 'error', data?: SourceResult, error?: string, unreachable?: boolean }} SectionState
 */

/**
 * Builds the exported report of the Reputation Checker page.
 * @param {{
 *   indicator: Indicator,
 *   sources: { id: string, name: string }[],
 *   sections: Record<string, SectionState>,
 *   counts: { listed: number, notListed: number, unavailable: number, pending: number }
 * }} state
 */
export function buildReputationReport({ indicator, sources, sections, counts }) {
	const input = `${indicator.value} (${t(`reputation.kind.${indicator.kind}`)})`;
	const special = indicator.kind === 'ip' ? indicator.special : null;

	if (special) {
		return createReport({
			tool: 'reputation',
			input,
			sections: [
				section(t('reputation.special.title', { label: special.label }), [
					text(`${indicator.value}: ${special.description}`),
					text(t('reputation.special.skipped'))
				])
			]
		});
	}

	const answered = counts.listed + counts.notListed;
	return createReport({
		tool: 'reputation',
		input,
		sections: [
			section(
				t('reputation.summary.title'),
				[
					list(
						[
							answered &&
								(counts.listed
									? t('reputation.summary.listed', { count: counts.listed, total: answered })
									: t('reputation.summary.none', { total: answered })),
							counts.pending && t('reputation.summary.pending', { count: counts.pending }),
							counts.unavailable &&
								t('reputation.summary.unavailable', { count: counts.unavailable })
						].filter((line) => typeof line === 'string')
					)
				],
				{ note: t('reputation.summary.caution') }
			),
			...sources.map((source) => sourceSection(source, sections[source.id]))
		]
	});
}

/**
 * One source, as its panel shows it: badge, details, recent entries and source link.
 * @param {{ id: string, name: string }} source
 * @param {SectionState | undefined} state
 */
function sourceSection(source, state) {
	const note = t(`reputation.${source.id}.note`);
	const shown =
		state?.status === 'error' && state.unreachable
			? { status: /** @type {const} */ ('error'), error: t('reputation.backendUnavailable') }
			: state;
	return stateSection(
		source.name,
		shown,
		(/** @type {SourceResult} */ data) => {
			if (data.reason === 'notConfigured') return [text(t('reputation.notConfigured'))];
			const badge =
				data.status === 'listed'
					? 'listed'
					: data.status === 'not_listed'
						? 'notListed'
						: 'unavailable';
			return [
				fields([
					{ label: t('reputation.result'), value: t(`reputation.status.${badge}`) },
					{ label: t('reputation.checked'), value: data.checked },
					{ label: t(`reputation.date.${source.id}`), value: displayDate(data.date) },
					...detailRows(source.id, data)
				]),
				source.id === 'otx' &&
					list(pulseItems(data.details?.pulses ?? []), t('reputation.otx.recent')),
				source.id === 'threatfox' &&
					list(iocItems(data.details?.iocs ?? []), t('reputation.threatfox.recent')),
				data.link &&
					list([{ text: t('reputation.open', { source: source.name }), href: data.link }])
			];
		},
		{ note }
	);
}

/** @param {any[]} pulses */
function pulseItems(pulses) {
	return pulses.map((pulse) =>
		[pulse.name, displayDate(pulse.date), pulse.malware.join(', '), pulse.tags.join(', ')]
			.filter(Boolean)
			.join(' · ')
	);
}

/** @param {any[]} iocs */
function iocItems(iocs) {
	return iocs.map((ioc) =>
		[
			ioc.ioc,
			ioc.malware,
			ioc.threat_type,
			ioc.confidence === null || ioc.confidence === undefined
				? null
				: t('reputation.threatfox.confidence', { value: ioc.confidence }),
			displayDate(ioc.last_seen ?? ioc.first_seen),
			ioc.tags?.length ? ioc.tags.join(', ') : null
		]
			.filter(Boolean)
			.join(' · ')
	);
}
