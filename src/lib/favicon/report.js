import { t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, list, section, text } from '$lib/export/report.js';
import { searchLinks } from './hash.js';

/**
 * Builds the exported report of the Favicon Hash page. The image itself is never embedded.
 * @param {{
 *   file: { name: string, size: number, type: string },
 *   format: { label: string, mime: string } | null,
 *   hashes: { mmh3: number, md5: string, sha256: string },
 *   siteUrl: string | null
 * }} state
 */
export function buildFaviconReport({ file, format, hashes, siteUrl }) {
	const size = t('favicon.row.bytes', { count: file.size });
	return createReport({
		tool: 'favicon',
		input: `${file.name} (${size})`,
		sections: [
			section(t('favicon.fileHeading'), [
				fields([
					{ label: t('favicon.row.format'), value: format?.label ?? t('common.unknown') },
					{ label: t('favicon.row.mime'), value: file.type },
					{ label: t('favicon.row.size'), value: size }
				]),
				siteUrl && list([{ text: t('favicon.openFavicon', { url: siteUrl }), href: siteUrl }])
			]),
			section(t('favicon.hashesHeading'), [
				!format && text(t('favicon.notImage')),
				fields([
					{ label: t('favicon.hash.mmh3'), value: String(hashes.mmh3) },
					{ label: t('favicon.hash.md5'), value: hashes.md5 },
					{ label: t('favicon.hash.sha256'), value: hashes.sha256 }
				]),
				text(t('favicon.mmh3Note'))
			]),
			section(
				t('favicon.searchHeading'),
				[
					list(
						searchLinks(hashes).map((link) => {
							const by = t('favicon.searchBy', { hash: t(`favicon.hash.${link.hash}`) });
							const note = link.id === 'urlscan' ? ` (${t('favicon.urlscanNote')})` : '';
							return { text: `${link.name}, ${by}: ${link.query}${note}`, href: link.url };
						})
					)
				],
				{ note: t('favicon.searchNote') }
			)
		]
	});
}
