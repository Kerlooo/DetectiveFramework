import { t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, section, table, text } from '$lib/export/report.js';
import { formatBytes } from '$lib/metadata/format.js';
import { ALGORITHMS } from './algorithms.js';
import { findMatches, identifyHash } from './identify.js';

/** Longest pasted text written as the report input. */
const MAX_INPUT_CHARS = 80;

/**
 * Builds the exported report of the Hash Checker page.
 * @param {{
 *   mode: 'text' | 'file',
 *   text: string,
 *   file: { name: string, size: number } | null,
 *   digests: Record<string, string>,
 *   expected: string
 * }} state
 */
export function buildHashReport({ mode, text: input, file, digests, expected }) {
	return createReport({
		tool: 'hash',
		input: mode === 'file' && file ? `${file.name} (${formatBytes(file.size)})` : truncate(input),
		sections: [
			section(t('hash.resultsHeading'), [
				table(
					[t('hash.results.algorithm'), t('hash.results.digest')],
					ALGORITHMS.map((algorithm) => [algorithm.label, digests[algorithm.id]])
				)
			]),
			expected.trim() && verifierSection(expected, digests)
		].filter((entry) => !!entry)
	});
}

/**
 * Same verdict as the verifier under the input.
 * @param {string} expected
 * @param {Record<string, string>} digests
 */
function verifierSection(expected, digests) {
	const candidates = identifyHash(expected);
	const matches = findMatches(expected, digests);
	const computable = candidates.some((name) =>
		ALGORITHMS.some((algorithm) => algorithm.label === name)
	);
	const verdict = matches.length
		? t('hash.verifier.match', {
				names: ALGORITHMS.filter((algorithm) => matches.includes(algorithm.id))
					.map((algorithm) => algorithm.label)
					.join(', ')
			})
		: candidates.length && !computable
			? t('hash.verifier.notComputed')
			: t('hash.verifier.noMatch');

	return section(t('hash.verifier.label'), [
		fields([
			{ label: t('hash.verifier.label'), value: expected.trim() },
			{
				// The label ends with a colon on the page.
				label: t('hash.verifier.possibleType').replace(/\s*[:：]\s*$/, ''),
				value: candidates.length ? candidates.join(', ') : t('hash.verifier.unknownFormat')
			}
		]),
		text(verdict)
	]);
}

/** @param {string} value */
function truncate(value) {
	const flat = value.replace(/\s+/g, ' ').trim();
	return flat.length > MAX_INPUT_CHARS ? `${flat.slice(0, MAX_INPUT_CHARS)}…` : flat;
}
