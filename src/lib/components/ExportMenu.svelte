<script>
	import { t } from '$lib/i18n/i18n.svelte.js';
	import { FORMATS, downloadText, reportFilename } from '$lib/export/files.js';

	/**
	 * Download / copy buttons for a tool's results. The report is built only on click,
	 * so large result sets cost nothing while the page updates.
	 * @type {{ build: () => import('$lib/export/report.js').Report }}
	 */
	let { build } = $props();

	let copied = $state(false);
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;

	/** @param {keyof typeof FORMATS} key */
	function download(key) {
		const format = FORMATS[key];
		const report = build();
		downloadText(reportFilename(report, format.extension), format.render(report), format.mime);
	}

	async function copy() {
		await navigator.clipboard.writeText(FORMATS.markdown.render(build()));
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="export" role="group" aria-label={t('export.heading')}>
	<span class="label" title={t('export.hint')}>{t('export.heading')}</span>
	{#each ['markdown', 'json'] as key (key)}
		<button
			type="button"
			onclick={() => download(key)}
			aria-label={t('export.downloadLabel', { format: t(`export.${key}`) })}
		>
			.{FORMATS[key].extension}
		</button>
	{/each}
	<button type="button" onclick={copy} aria-live="polite">
		{copied ? t('export.copied') : t('export.copyMarkdown')}
	</button>
</div>

<style>
	.export {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.label {
		color: var(--color-text-dim);
		font-size: 0.8rem;
	}

	button {
		padding: 0.25rem 0.6rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text-dim);
		font-size: 0.8rem;
		cursor: pointer;
	}

	button:hover,
	button:focus-visible {
		border-color: var(--color-text);
		color: var(--color-text);
	}
</style>
