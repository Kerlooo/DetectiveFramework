import { getLocale, t } from '$lib/i18n/i18n.svelte.js';
import { googleSearchUrl } from '$lib/search.js';

/**
 * Detail rows of a single address, shared by the page and the exported report.
 * @param {import('./parse.js').ParsedMac} mac
 * @param {import('./vendor.js').Vendor | null} vendor
 * @param {string} vendorText vendor name or the reason there is none
 */
export function macDetailRows(mac, vendor, vendorText) {
	return [
		{ label: t('mac.row.vendor'), value: vendorText },
		{
			label: t('mac.row.assignment'),
			value: vendor
				? t('mac.assignment', {
						registry: vendor.registry,
						prefix: vendor.prefix,
						bits: vendor.bits
					})
				: null
		},
		{ label: t('mac.row.country'), value: countryName(vendor) },
		{
			label: t('mac.row.cast'),
			value: mac.broadcast
				? t('mac.broadcast')
				: mac.multicast
					? t('mac.multicast')
					: t('mac.unicast')
		},
		{
			label: t('mac.row.administration'),
			value: mac.local ? t('mac.local') : t('mac.universal')
		}
	];
}

/** @param {import('./vendor.js').Vendor | null} vendor */
function countryName(vendor) {
	if (!vendor?.country) return null;
	const name = new Intl.DisplayNames(getLocale(), { type: 'region' }).of(vendor.country);
	return `${name} (${vendor.country})`;
}

/**
 * Google searches for the address (colon and hyphen notations) and, when public, its vendor.
 * @param {import('./parse.js').ParsedMac} mac
 * @param {import('./vendor.js').Vendor | null} vendor
 */
export function macSearchUrls(mac, vendor) {
	const colon = mac.formats[0].value;
	const hyphen = mac.formats.find((format) => format.id === 'hyphen')?.value;
	return {
		address: googleSearchUrl(`"${colon}" OR "${hyphen}"`),
		vendor:
			vendor && vendor.organization !== 'Private'
				? googleSearchUrl(`"${vendor.organization}"`)
				: null
	};
}
