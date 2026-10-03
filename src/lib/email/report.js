import { formatNumber, t } from '$lib/i18n/i18n.svelte.js';
import {
	createReport,
	fields,
	list,
	section,
	stateSection,
	table,
	text
} from '$lib/export/report.js';
import { addressRows, gravatarRows } from './rows.js';

/**
 * @template T
 * @typedef {{ loading: boolean, error: string, data: T | null }} Task
 */

/**
 * Builds the exported report of the Email Analyzer page.
 * @param {{
 *   target: { email: string, local: string, domain: string },
 *   address: ReturnType<typeof import('./address.js').analyzeAddress>,
 *   disposable: Task<Awaited<ReturnType<typeof import('./disposable.js').checkDisposable>>>,
 *   mail: Task<Awaited<ReturnType<typeof import('./mail-server.js').lookupMailServer>>>,
 *   gravatar: Task<{ hash: string, profile: ReturnType<typeof import('./gravatar.js').summarizeGravatarProfile> | null }>
 * }} state
 */
export function buildEmailReport({ target, address, disposable, mail, gravatar }) {
	return createReport({
		tool: 'email',
		input: target.email,
		sections: [
			section(t('email.address.title'), [fields(addressRows(target.email, address))]),
			stateSection(t('email.disposable.title'), toState(disposable), (data) => [
				text(
					data.disposable
						? `${t('email.disposable.yes')} ${data.match} ${t('email.disposable.yesDetail')}`
						: t('email.disposable.no')
				),
				text(
					`${t('email.disposable.checkedBefore', { count: formatNumber(data.listSize) })} disposable-email-domains${t('email.disposable.checkedAfter')}`
				)
			]),
			stateSection(t('email.mail.title'), toState(mail), mailBlocks, {
				note: t('email.mail.note')
			}),
			stateSection('Gravatar', toState(gravatar), gravatarBlocks, {
				note: t('email.gravatar.note')
			})
		]
	});
}

/**
 * Turns the page's `{ loading, error, data }` task into the report's section state.
 * @param {Task<any>} task
 */
function toState(task) {
	if (task.loading) return /** @type {const} */ ({ status: 'loading' });
	if (task.error) return /** @type {const} */ ({ status: 'error', error: task.error });
	return /** @type {const} */ ({ status: 'done', data: task.data });
}

/** @param {{ level: string, text: string }} verdict */
const verdictText = (verdict) => `${t(`email.badge.${verdict.level}`)}: ${verdict.text}`;

/** @param {Awaited<ReturnType<typeof import('./mail-server.js').lookupMailServer>>} data */
function mailBlocks(data) {
	return [
		fields([
			{ label: t('email.mail.receiving'), value: verdictText(data.verdicts.mx) },
			{ label: 'SPF', value: verdictText(data.verdicts.spf) },
			{ label: 'DMARC', value: verdictText(data.verdicts.dmarc) }
		]),
		table(
			[t('email.mail.priority'), t('email.mail.server')],
			data.mx.map((record) => [record.priority, record.host || t('email.mail.nullMx')])
		),
		fields(
			[
				{ label: 'SPF', value: data.spf?.record },
				{ label: 'DMARC', value: data.dmarc?.record }
			],
			t('dns.label.record')
		)
	];
}

/** @param {{ hash: string, profile: ReturnType<typeof import('./gravatar.js').summarizeGravatarProfile> | null }} data */
function gravatarBlocks({ hash, profile }) {
	return [
		fields(gravatarRows(hash, profile)),
		list(
			(profile?.accounts ?? []).map((account) => ({
				text: `${account.label}: ${account.url}`,
				href: account.url
			})),
			t('email.gravatar.accounts')
		),
		!profile && text(t('email.gravatar.noProfile'))
	];
}
