import { t } from '$lib/i18n/i18n.svelte.js';
import { counterLabel, typeLabel } from './validate.js';

/** @typedef {{ username: string, url: string, type: string, extra: string[], counters: Record<string, string> }} Profile */

/**
 * KeyValueTable rows of a public Telegram profile, shared by the page and the exported report.
 * @param {Profile} profile response of /api/telegram/<username>
 */
export function profileRows(profile) {
	return [
		{ label: t('telegram.row.type'), value: typeLabel(profile.type) },
		{ label: t('telegram.row.username'), value: `@${profile.username}` },
		{ label: t('telegram.row.link'), value: profile.url, href: profile.url },
		...profile.extra.map((value, i) => ({
			label: i ? t('telegram.row.infoN', { n: i + 1 }) : t('telegram.row.info'),
			value
		})),
		...Object.entries(profile.counters).map(([label, value]) => ({
			label: counterLabel(label),
			value
		}))
	];
}
