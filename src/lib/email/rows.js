import { t } from '$lib/i18n/i18n.svelte.js';

/** Key/value rows shared by the Email Analyzer page and its exported report. */

/**
 * @param {string} email normalized address
 * @param {ReturnType<typeof import('./address.js').analyzeAddress>} address
 */
export function addressRows(email, address) {
	return [
		{ label: t('email.address.normalized'), value: email },
		{ label: t('email.address.local'), value: address.local },
		{ label: t('email.address.tag'), value: address.tag },
		{ label: t('email.address.domain'), value: address.domain },
		{ label: t('email.address.syntax'), value: t('email.address.valid') },
		{
			label: t('email.address.freeProvider'),
			value: address.freeProvider
				? t('email.address.freeYes', { provider: address.freeProvider })
				: t('email.address.freeNo')
		},
		{
			label: t('email.address.role'),
			value: address.role ? t('email.address.roleYes') : t('email.address.roleNo')
		}
	];
}

/**
 * @param {string} hash SHA-256 of the address
 * @param {ReturnType<typeof import('./gravatar.js').summarizeGravatarProfile> | null} profile
 */
export function gravatarRows(hash, profile) {
	return [
		{ label: 'SHA-256', value: hash },
		{ label: t('email.gravatar.name'), value: profile?.displayName },
		{
			label: t('email.gravatar.profile'),
			value: profile?.profileUrl,
			href: profile?.profileUrl ?? undefined
		},
		{ label: t('email.gravatar.location'), value: profile?.location },
		{ label: t('email.gravatar.jobTitle'), value: profile?.jobTitle },
		{ label: t('email.gravatar.company'), value: profile?.company },
		{ label: t('email.gravatar.pronouns'), value: profile?.pronouns },
		{ label: t('email.gravatar.about'), value: profile?.description }
	];
}
