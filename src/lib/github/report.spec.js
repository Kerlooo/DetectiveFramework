import { describe, expect, it } from 'vitest';
import { buildGithubReport } from './report.js';
import { toMarkdown } from '$lib/export/markdown.js';

const user = { login: 'octo', html_url: 'https://github.com/octo', public_repos: 1 };

describe('buildGithubReport', () => {
	it('exports every section with its state once the account is found', () => {
		const report = buildGithubReport({
			username: 'octo',
			commitsPerRepo: 30,
			sections: {
				profile: { status: 'done', data: user },
				repos: {
					status: 'done',
					data: [
						{
							id: 1,
							name: 'hello',
							html_url: 'https://github.com/octo/hello',
							fork: false,
							archived: false,
							language: 'Go',
							stargazers_count: 3,
							pushed_at: '2026-05-01T00:00:00Z',
							description: 'Hi'
						}
					]
				},
				emails: {
					status: 'done',
					data: {
						scanned: ['octo/hello'],
						emails: [
							{
								email: 'octo@example.com',
								names: ['Octo'],
								repos: ['octo/hello'],
								commits: 2,
								linked: true,
								noreply: false,
								lastSeen: '2026-05-01T10:00:00Z',
								url: 'https://github.com/octo/hello/commit/abc'
							}
						]
					}
				},
				orgs: { status: 'done', data: [] },
				keys: { status: 'loading' }
			}
		});
		expect(report.sections.map((section) => section.status)).toEqual([
			'done',
			'done',
			'done',
			'empty',
			'loading'
		]);
		const markdown = toMarkdown(report);
		expect(markdown).toContain(
			'| [hello](https://github.com/octo/hello) | Hi | Go | 3 | 2026-05-01 |'
		);
		expect(markdown).toContain(
			'| octo@example.com | linked to this account | Octo | 2 occurrences in octo/hello | [2026-05-01 10:00 UTC](https://github.com/octo/hello/commit/abc) |'
		);
		expect(markdown).toContain('No public organization memberships.');
	});

	it('exports only the profile error when the account does not exist', () => {
		const report = buildGithubReport({
			username: 'ghost',
			commitsPerRepo: 30,
			sections: /** @type {any} */ ({
				profile: { status: 'error', error: 'No GitHub account named "ghost".' }
			})
		});
		expect(report.sections).toHaveLength(1);
		expect(report.sections[0].status).toBe('error');
	});
});
