import { t } from '$lib/i18n/i18n.svelte.js';
import { createReport, fields, section, table, text } from '$lib/export/report.js';
import { profileRows } from './rows.js';

/** @typedef {{ id: string, url: string | null, date: string | null, views: string | null, text: string, media: boolean }} Post */

/**
 * Builds the exported report of the Telegram OSINT page.
 * @param {{ profile: any }} state response of /api/telegram/<username>
 */
export function buildTelegramReport({ profile }) {
	const input = `@${profile.username}`;

	if (!profile.exists) {
		return createReport({
			tool: 'telegram',
			input,
			sections: [
				section(
					input,
					[
						text(`${input} ${t('telegram.notFound')}`),
						fields([{ label: t('telegram.row.link'), value: profile.url, href: profile.url }])
					],
					{ source: 't.me' }
				)
			]
		});
	}

	/** @type {Post[]} */
	const posts = profile.posts;
	return createReport({
		tool: 'telegram',
		input,
		sections: [
			section(
				profile.title || input,
				[
					text(profile.description ?? ''),
					fields([
						...profileRows(profile),
						{ label: t('telegram.verified'), value: profile.verified ? t('common.yes') : '' }
					])
				],
				{ source: 't.me' }
			),
			...(posts.length || profile.type === 'channel' ? [postsSection(posts)] : [])
		]
	});
}

/** @param {Post[]} posts */
function postsSection(posts) {
	return section(
		t('telegram.postsHeading', { count: posts.length }),
		[
			posts.length
				? table(
						[
							t('telegram.report.date'),
							t('telegram.report.views'),
							t('telegram.report.text'),
							t('telegram.row.link')
						],
						posts.map((post) => [
							post.date,
							post.views,
							postText(post),
							post.url ? { text: post.url, href: post.url } : ''
						])
					)
				: text(t('telegram.noPosts'))
		],
		{ source: 't.me/s' }
	);
}

/** @param {Post} post */
function postText(post) {
	if (!post.text) return t('telegram.mediaOnly');
	return post.media ? `${t('telegram.media')} ${post.text}` : post.text;
}
