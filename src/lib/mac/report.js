import { t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, list, section, table, text } from '$lib/export/report.js';
import { macDetailRows, macSearchUrls } from './rows.js';

/**
 * Builds the exported report of the MAC Address Vendor Lookup page: the details of a
 * single address, or the table of a list.
 * @param {{
 *   list: { input: string }[],
 *   single: import('./parse.js').ParsedMac | null,
 *   vendor: import('./vendor.js').Vendor | null,
 *   vendorText: string,
 *   tableRows: { input: string, mac: string | null, vendor: string, flags: string[] }[],
 *   updated: string | null
 * }} state vendor and vendorText refer to `single`; `updated` is the formatted list date
 */
export function buildMacReport({ list: entries, single, vendor, vendorText, tableRows, updated }) {
	const source = [t('mac.source'), updated && t('mac.updated', { date: updated })]
		.filter(Boolean)
		.join(' ');
	const input = entries.map((entry) => entry.input).join(', ');

	if (!single) {
		return createReport({
			tool: 'mac',
			input,
			sections: [
				section(
					t('mac.resultsHeading'),
					[
						table(
							[t('mac.table.mac'), t('mac.table.vendor'), t('mac.table.flags')],
							tableRows.map((row) => [row.mac ?? row.input, row.vendor, row.flags.join(', ')])
						)
					],
					{ note: source }
				)
			]
		});
	}

	const searches = macSearchUrls(single, vendor);
	return createReport({
		tool: 'mac',
		input,
		sections: [
			section(
				t('mac.resultsHeading'),
				[
					fields(macDetailRows(single, vendor, vendorText)),
					single.local && !single.broadcast && text(t('mac.localNote')),
					single.multicast && !single.broadcast && text(t('mac.multicastNote')),
					single.prefixOnly && text(t('mac.prefixNote'))
				],
				{ note: source }
			),
			section(t('mac.formatsHeading'), [
				fields(
					single.formats.map((format) => ({
						label: t(`mac.format.${format.id}`),
						value: format.value
					}))
				),
				!single.prefixOnly && text(t('mac.eui64Note'))
			]),
			section(t('mac.pivotHeading'), [
				list([
					{ text: t('mac.googleSearch'), href: searches.address },
					...(searches.vendor ? [{ text: t('mac.googleVendor'), href: searches.vendor }] : [])
				])
			])
		]
	});
}
