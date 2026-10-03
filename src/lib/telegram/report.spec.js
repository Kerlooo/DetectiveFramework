import { describe, expect, it } from 'vitest';
import { buildTelegramReport } from './report.js';
import { toMarkdown } from '$lib/export/markdown.js';

describe('buildTelegramReport', () => {
	it('exports the profile and the latest channel posts', () => {
		const report = buildTelegramReport({
			profile: {
				exists: true,
				username: 'telegram',
				url: 'https://t.me/telegram',
				type: 'channel',
				title: 'Telegram News',
				verified: true,
				description: 'Official news.',
				image: null,
				extra: [],
				counters: { subscribers: '10M' },
				posts: [
					{
						id: '1',
						url: 'https://t.me/telegram/1',
						date: '2026-01-01T10:00:00+00:00',
						views: '1.2M',
						text: '',
						media: true
					}
				]
			}
		});
		expect(report.input).toBe('@telegram');
		expect(report.sections.map((section) => section.title)).toEqual([
			'Telegram News',
			'Latest posts (1)'
		]);
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| Subscribers | 10M |');
		expect(markdown).toContain('| Verified by Telegram | yes |');
		expect(markdown).toContain('| 1.2M | No text (media only). | [https://t.me/telegram/1]');
	});

	it('reports a missing username', () => {
		const report = buildTelegramReport({
			profile: { exists: false, username: 'nobody', url: 'https://t.me/nobody' }
		});
		expect(report.sections).toHaveLength(1);
		expect(toMarkdown(report)).toContain('@nobody was not found on Telegram');
	});
});
