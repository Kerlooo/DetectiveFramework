import { t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, list, section, stateSection, text } from '$lib/export/report.js';
import { geoRows, rdapRows } from './rows.js';

/** @typedef {{ status: 'loading' | 'done' | 'error', data?: any, error?: string }} SectionState */

/**
 * Builds the exported report of the IP Analyzer page.
 * @param {{
 *   target: { address: string, version: number },
 *   special: { label: string, cidr: string, description: string } | null,
 *   resolved: { hostname: string } | null,
 *   sections: Record<'geo' | 'ptr' | 'rdap' | 'scan', SectionState>
 * }} state
 */
export function buildIpReport({ target, special, resolved, sections }) {
	const input = resolved ? `${resolved.hostname} (${target.address})` : target.address;

	if (special) {
		return createReport({
			tool: 'ip',
			input,
			sections: [
				section(t('ip.special.title', { label: special.label }), [
					fields([
						{ label: t('ip.row.range'), value: special.cidr },
						{ label: t('ip.row.type'), value: special.description }
					]),
					text(t('ip.special.skipped'))
				])
			]
		});
	}

	return createReport({
		tool: 'ip',
		input,
		sections: [
			stateSection(t('ip.geo.title'), sections.geo, (geo) => [fields(geoRows(geo))], {
				source: 'ipwho.is'
			}),
			stateSection(t('ip.ptr.title'), sections.ptr, (names) => [list(names)], {
				source: t('ip.ptr.source'),
				emptyText: t('ip.ptr.empty')
			}),
			stateSection(t('ip.rdap.title'), sections.rdap, (rdap) => [fields(rdapRows(rdap))], {
				source: 'rdap.org',
				emptyText: t('ip.rdap.empty')
			}),
			stateSection(t('ip.scan.title'), sections.scan, scanBlocks, {
				source: 'Shodan InternetDB',
				emptyText: t('ip.scan.empty')
			})
		]
	});
}

/**
 * @param {{ ports: { port: number, service: string | null }[], hostnames: string[], cpes: string[], tags: string[], vulns: string[] }} scan
 */
function scanBlocks(scan) {
	return [
		list(
			scan.ports.map(({ port, service }) => (service ? `${port} (${service})` : String(port))),
			t('ip.scan.ports', { count: scan.ports.length })
		),
		list(
			scan.vulns.map((cve) => ({
				text: cve,
				href: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve)}`
			})),
			t('ip.scan.vulns', { count: scan.vulns.length })
		),
		list(scan.hostnames, t('ip.scan.hostnames', { count: scan.hostnames.length })),
		list(scan.cpes, t('ip.scan.software')),
		list(scan.tags, t('ip.scan.tags'))
	];
}
