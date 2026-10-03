import { formatDate } from './normalize.js';
import { t } from '$lib/i18n/i18n.svelte.js';

/** Key/value rows shared by the Domain Analyzer components and its exported report. */

const SPF_ALL = {
	fail: '-all (fail)',
	softfail: '~all (softfail)',
	neutral: '?all (neutral)',
	pass: '+all (pass)'
};

/** @param {any} spf parsed SPF record, or null */
export function spfRows(spf) {
	if (!spf) return [];
	return [
		{ label: t('dns.label.record'), value: spf.record },
		{
			label: t('dns.label.allPolicy'),
			value: SPF_ALL[/** @type {keyof typeof SPF_ALL} */ (spf.allPolicy)] ?? t('dns.value.none')
		},
		{ label: t('dns.label.includes'), value: spf.includes.join(', ') }
	];
}

/** @param {any} dmarc parsed DMARC record, or null */
export function dmarcRows(dmarc) {
	if (!dmarc) return [];
	return [
		{ label: t('dns.label.record'), value: dmarc.record },
		{ label: t('dns.label.policy'), value: dmarc.policy ?? t('dns.value.missing') },
		{ label: t('dns.label.subdomainPolicy'), value: dmarc.subdomainPolicy },
		{ label: t('dns.label.percent'), value: `${dmarc.percent}%` },
		{ label: t('dns.label.reports'), value: dmarc.reports.join(', ') }
	];
}

/** @param {ReturnType<typeof import('$lib/rdap.js').summarizeRdap> | null} rdap */
export function registrationRows(rdap) {
	if (!rdap) return [];
	return [
		{ label: t('domain.rdap.domain'), value: rdap.name },
		{ label: t('domain.rdap.registrar'), value: rdap.registrar },
		{ label: t('domain.rdap.registered'), value: formatDate(rdap.registered) },
		{ label: t('domain.rdap.expires'), value: formatDate(rdap.expires) },
		{ label: t('domain.rdap.updated'), value: formatDate(rdap.updated) },
		{ label: t('domain.rdap.status'), value: rdap.status.join(', ') },
		{ label: t('domain.rdap.nameservers'), value: rdap.nameservers.join(', ') },
		{
			label: t('domain.rdap.dnssec'),
			value:
				rdap.dnssec === null
					? null
					: rdap.dnssec
						? t('domain.rdap.signed')
						: t('domain.rdap.notSigned')
		}
	];
}

/** @param {ReturnType<typeof import('$lib/rdap.js').summarizeRdap> | null} rdap */
export function contactRows(rdap) {
	return (rdap?.contacts ?? []).map((contact, index) => ({
		label: contact.roles.join(', ') || t('domain.rdap.contact', { n: index + 1 }),
		value: [contact.name, contact.email && `<${contact.email}>`].filter(Boolean).join(' ')
	}));
}
