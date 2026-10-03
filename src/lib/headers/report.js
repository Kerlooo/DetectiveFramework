import { t } from '$lib/i18n/i18n.svelte.js';
import { absoluteUrl } from '$lib/site.js';
import { createReport, fields, list, section, text } from '$lib/export/report.js';
import { describeFinding, formatDuration, formatTimestamp } from './format.js';

/** @typedef {NonNullable<ReturnType<typeof import('./analyze.js').analyzeHeaders>>} Analysis */

/** Longest input identifier (Subject, Message-ID or first header line). */
const MAX_INPUT_LENGTH = 80;

/**
 * Builds the exported report of the Email Header Analyzer page. The raw header block
 * is not included: the input is identified by its Subject, Message-ID or first line.
 * @param {{ result: Analysis }} state
 */
export function buildHeadersReport({ result }) {
	return createReport({
		tool: 'headers',
		input: inputLabel(result),
		sections: [
			section(t('headers.findingsHeading'), findingBlocks(result.findings), {
				note: t('headers.findingsNote')
			}),
			section(t('headers.summaryHeading'), [
				fields(result.summary.map((field) => ({ label: field.name, value: field.value })))
			]),
			section(t('headers.originHeading'), originBlocks(result), {
				note: t('headers.originNote')
			}),
			section(t('headers.chainHeading'), chainBlocks(result)),
			section(t('headers.authHeading'), authBlocks(result.auth), {
				note: t('headers.authVerdictNote')
			}),
			section(t('headers.pivotHeading'), pivotBlocks(result.pivots)),
			section(t('headers.otherHeading', { count: result.otherHeaders.length }), [
				fields(result.otherHeaders.map((header) => ({ label: header.name, value: header.value })))
			])
		]
	});
}

/** @param {Analysis} result */
function inputLabel(result) {
	const pick = (/** @type {string} */ name) =>
		result.summary.find((field) => field.name === name)?.value;
	const first = result.headers[0];
	const label = pick('Subject') || pick('Message-ID') || `${first.name}: ${first.value}`;
	const line = label.replace(/\s+/g, ' ').trim();
	return line.length > MAX_INPUT_LENGTH ? `${line.slice(0, MAX_INPUT_LENGTH - 1)}…` : line;
}

/** @param {import('./analyze.js').Finding[]} findings */
function findingBlocks(findings) {
	if (!findings.length) return [text(t('headers.findingsNone'))];
	return [
		list(
			findings.map((finding) => {
				const { title, detail } = describeFinding(finding);
				return `${t(`headers.severity.${finding.severity}`)}: ${title}. ${detail}`;
			})
		)
	];
}

/** @param {Analysis} result */
function originBlocks({ origin, sourceIps }) {
	return [
		origin
			? fields([
					{
						label: t('headers.originLikely'),
						value: origin.ip,
						href: ipLink(origin.ip)
					},
					{
						label: t('headers.originHop'),
						value: t('headers.originHopValue', {
							number: origin.hopIndex + 1,
							host: origin.host ?? t('common.unknown')
						})
					}
				])
			: text(t('headers.originNone')),
		fields(
			sourceIps.map((item) => ({
				label: item.name,
				value: item.internal ? `${item.value} (${t('headers.internal')})` : item.value,
				href: item.ip && !item.internal ? ipLink(item.ip) : undefined
			})),
			t('headers.sourceIpHeading')
		)
	];
}

/** @param {Analysis} result */
function chainBlocks({ chain }) {
	if (!chain.hops.length) return [text(t('headers.chainEmpty'))];
	const meta = [
		`${t('headers.chainCount', { count: chain.hops.length })} · ${t('headers.chainOrder')}`,
		chain.total !== null && t('headers.chainTotal', { duration: formatDuration(chain.total) })
	];
	return [
		text(meta.filter(Boolean).join(' ')),
		...chain.hops.map((hop) =>
			fields(
				[
					{ label: t('headers.hop.from'), value: hop.from },
					{ label: t('headers.hop.rdns'), value: hop.fromRdns },
					{ label: t('headers.hop.helo'), value: hop.fromHelo },
					{ label: t('headers.hop.ips'), value: hop.fromIps.join(', ') },
					{ label: t('headers.hop.by'), value: hop.by },
					{ label: t('headers.hop.with'), value: hop.with },
					{ label: t('headers.hop.id'), value: hop.id },
					{ label: t('headers.hop.for'), value: hop.for }
				],
				hopTitle(hop)
			)
		)
	];
}

/**
 * "Hop 2 · <time> · +3 s · slow", as in the hop header of the page.
 * @param {import('./received.js').ChainHop} hop
 */
function hopTitle(hop) {
	const parts = [
		t('headers.hop', { number: hop.index + 1 }),
		hop.date !== null ? formatTimestamp(hop.date) : t('headers.noDate')
	];
	if (hop.delay !== null) {
		parts.push(
			hop.negative
				? formatDuration(hop.delay)
				: t('headers.delay', { duration: formatDuration(hop.delay) })
		);
		if (hop.slow) parts.push(t('headers.delaySlow'));
		if (hop.negative) parts.push(t('headers.delayNegative'));
	}
	return parts.join(' · ');
}

/** @param {Analysis['auth']} auth */
function authBlocks(auth) {
	const { verdict } = auth;
	// Protocol names, shown as they appear in the headers.
	const verdicts = fields(
		[
			['SPF', verdict.spf, verdict.spfDomain],
			['DKIM', verdict.dkim, verdict.dkimDomain],
			['DMARC', verdict.dmarc, verdict.dmarcDomain],
			['ARC', verdict.arc, null]
		].map(([label, result, domain]) => ({
			label: String(label),
			value: [result ?? t('headers.authNotReported'), domain].filter(Boolean).join(' · ')
		}))
	);

	const hasAny =
		auth.authResults.length +
			auth.arcAuthResults.length +
			auth.receivedSpf.length +
			auth.dkimSignatures.length +
			auth.arcSeals.length >
		0;

	return [
		verdicts,
		!hasAny && text(t('headers.authNone')),
		...auth.authResults.map((header, index) =>
			authResultsList(header, t('headers.authResultsHeading'), [
				index === 0 ? t('headers.authTopmost') : t('headers.authLower')
			])
		),
		...auth.arcAuthResults.map((header) =>
			authResultsList(header, t('headers.authArcResultsHeading'), [])
		),
		...auth.receivedSpf.map((spf) =>
			fields(
				[
					{ label: t('headers.comment'), value: spf.comment },
					...Object.entries(spf.props).map(([label, value]) => ({ label, value }))
				],
				`${t('headers.receivedSpfHeading')}: ${spf.result}`
			)
		),
		...auth.dkimSignatures.map((signature) =>
			fields(
				[
					{ label: t('headers.dkim.domain'), value: signature.domain },
					{ label: t('headers.dkim.selector'), value: signature.selector },
					{ label: t('headers.dkim.algorithm'), value: signature.algorithm },
					{ label: t('headers.dkim.canonicalization'), value: signature.canonicalization },
					{ label: t('headers.dkim.identity'), value: signature.identity },
					{ label: t('headers.dkim.headers'), value: signature.headers.join(', ') },
					{
						label: t('headers.dkim.timestamp'),
						value: signature.timestamp !== null ? formatTimestamp(signature.timestamp) : null
					},
					{
						label: t('headers.dkim.expiration'),
						value: signature.expiration !== null ? formatTimestamp(signature.expiration) : null
					}
				],
				t('headers.dkimHeading')
			)
		),
		...[
			{ name: 'ARC-Seal', list: auth.arcSeals },
			{ name: 'ARC-Message-Signature', list: auth.arcMessageSignatures }
		].flatMap((group) =>
			group.list.map((tags) =>
				fields(
					[
						{ label: t('headers.arc.instance'), value: tags.instance },
						{ label: t('headers.arc.domain'), value: tags.domain },
						{ label: t('headers.arc.selector'), value: tags.selector },
						{ label: t('headers.dkim.algorithm'), value: tags.algorithm },
						{ label: t('headers.arc.cv'), value: tags.chainValidation }
					],
					`${t('headers.arcHeading')}: ${group.name}`
				)
			)
		)
	];
}

/**
 * One Authentication-Results header as a list of `method=result props (comment)`.
 * @param {{ authservId: string | null, instance: number | null, results: import('./auth.js').AuthResult[] }} header
 * @param {string} heading
 * @param {string[]} extra
 */
function authResultsList(header, heading, extra) {
	const title = [
		heading,
		header.authservId
			? t('headers.authServer', { server: header.authservId })
			: t('headers.authServerUnknown'),
		header.instance !== null && t('headers.authInstance', { number: header.instance }),
		...extra
	];
	return list(
		header.results.map((result) =>
			[
				`${result.method}=${result.result}`,
				Object.entries(result.props)
					.map(([key, value]) => `${key}=${value}`)
					.join(' '),
				result.comment && `(${result.comment})`
			]
				.filter(Boolean)
				.join(' ')
		),
		title.filter(Boolean).join(' · ')
	);
}

/** @param {Analysis['pivots']} pivots */
function pivotBlocks(pivots) {
	const q = encodeURIComponent;
	return [
		list(
			pivots.ips.map((ip) =>
				ip.internal
					? `${ip.address} (${t('headers.internal')})`
					: { text: ip.address, href: ipLink(ip.address) }
			),
			t('headers.pivotIps')
		),
		list(
			pivots.domains.map((domain) => ({
				text: domain,
				href: absoluteUrl(`/domain?q=${q(domain)}`)
			})),
			t('headers.pivotDomains')
		),
		list(
			pivots.emails.map((email) => ({ text: email, href: absoluteUrl(`/email?q=${q(email)}`) })),
			t('headers.pivotEmails')
		)
	];
}

/** @param {string} ip */
const ipLink = (ip) => absoluteUrl(`/ip?q=${encodeURIComponent(ip)}`);
