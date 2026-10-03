import { formatNumber, t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, list, stateSection, text } from '$lib/export/report.js';
import { contactRows, dmarcRows, registrationRows, spfRows } from './rows.js';

/** @typedef {{ status: 'idle' | 'loading' | 'done' | 'error', data: any, error: string | null }} SectionState */

/**
 * Builds the exported report of the Domain Analyzer page.
 * @param {{ domain: string, sections: Record<'dns' | 'email' | 'rdap' | 'subdomains' | 'archive', SectionState> }} state
 */
export function buildDomainReport({ domain, sections }) {
	return createReport({
		tool: 'domain',
		input: domain,
		sections: [
			stateSection(t('domain.dns.title'), toState(sections.dns), dnsBlocks, {
				source: t('domain.dns.subtitle')
			}),
			stateSection(t('domain.email.title'), toState(sections.email), emailBlocks, {
				source: t('domain.email.subtitle')
			}),
			stateSection(
				t('domain.rdap.title'),
				toState(sections.rdap),
				(rdap) => {
					const contacts = contactRows(rdap);
					return [
						fields(registrationRows(rdap)),
						fields(contacts, t('domain.rdap.contacts')),
						contacts.length > 0 && text(t('domain.rdap.redacted'))
					];
				},
				{
					source: t('domain.rdap.subtitle'),
					emptyText: `${t('domain.rdap.notFoundBefore')} ${domain}${t('domain.rdap.notFoundAfter')}`
				}
			),
			stateSection(t('domain.subdomains.title'), toState(sections.subdomains), subdomainBlocks, {
				source: t('domain.subdomains.subtitle'),
				note: t('domain.subdomains.note')
			}),
			stateSection(t('domain.archive.title'), toState(sections.archive), archiveBlocks, {
				source: t('domain.archive.subtitle')
			})
		]
	});
}

/**
 * The page keeps `error: null` and an extra `idle` status; the report helpers take `error?: string`.
 * @param {SectionState | undefined} section
 */
function toState(section) {
	return section && { ...section, error: section.error ?? undefined };
}

/** @param {{ type: string, records: { name: string, ttl: number, data: string }[], error: string | null }[]} groups */
function dnsBlocks(groups) {
	const total = groups.reduce((sum, group) => sum + group.records.length, 0);
	return [
		total === 0 && groups.every((group) => !group.error) && text(t('domain.dns.noRecords')),
		...groups.map((group) => {
			const title = `${group.type} (${group.records.length})`;
			if (group.error) return text(group.error, title);
			if (!group.records.length)
				return text(t('domain.dns.noRecordsOfType', { type: group.type }), title);
			return list(
				group.records.map((record) => `${record.data} (TTL ${record.ttl}s)`),
				title
			);
		})
	];
}

/** @param {{ auth: { spf: any, dmarc: any }, findings: { level: string, text: string }[] }} data */
function emailBlocks({ auth, findings }) {
	return [
		list(findings.map((finding) => `${t(`dns.finding.${finding.level}`)}: ${finding.text}`)),
		auth.spf ? fields(spfRows(auth.spf), 'SPF') : text(t('dns.spf.noRecord'), 'SPF'),
		auth.dmarc ? fields(dmarcRows(auth.dmarc), 'DMARC') : text(t('dns.dmarc.noRecord'), 'DMARC')
	];
}

/** @param {{ names: string[], source: string, partial: boolean, fallbackReason: string | null }} result */
function subdomainBlocks(result) {
	const count = result.names.length;
	const summary = [
		formatNumber(count),
		t('domain.subdomains.countFrom', { count }),
		result.source,
		result.partial && t('domain.subdomains.partial')
	];
	return [
		text(summary.filter(Boolean).join(' ')),
		result.fallbackReason &&
			text(t('domain.subdomains.fallback', { reason: result.fallbackReason })),
		count ? list(result.names) : text(t('domain.subdomains.none'))
	];
}

/** @param {{ snapshot: { url: string, date: string | null, status: string | null } | null, historyUrl: string }} result */
function archiveBlocks({ snapshot, historyUrl }) {
	const links = [{ text: linkLabel('domain.archive.all'), href: historyUrl }];
	if (!snapshot) return [text(t('domain.archive.none')), list(links)];
	const date = snapshot.date ?? t('domain.archive.unknownDate');
	return [
		text(
			`${t('domain.archive.closest')} ${date}${snapshot.status ? ` (HTTP ${snapshot.status})` : ''}`
		),
		list([{ text: linkLabel('domain.archive.open'), href: snapshot.url }, ...links])
	];
}

/**
 * A link label without the trailing "↗" the page uses for external links.
 * @param {string} key
 */
const linkLabel = (key) => t(key).replace(/\s*↗$/, '');
