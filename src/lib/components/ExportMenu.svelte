<script>
	import { onMount, tick } from 'svelte';
	import { asset } from '$app/paths';
	import { t } from '$lib/i18n/i18n.svelte.js';
	import { FORMATS, downloadFile, findFormat, reportFilename } from '$lib/export/files.js';
	import { toMarkdown } from '$lib/export/markdown.js';

	/**
	 * Split button: the main part downloads the results in the chosen format (PDF by
	 * default), the arrow opens a menu to pick another format or copy the Markdown.
	 * The report is built only on click, so large result sets cost nothing while the page updates.
	 * @type {{ build: () => import('$lib/export/report.js').Report }}
	 */
	let { build } = $props();

	const STORAGE_KEY = 'exportFormat';

	let format = $state(FORMATS[0]);
	let open = $state(false);
	/** @type {'idle' | 'busy' | 'copied' | 'failed'} */
	let status = $state('idle');
	let errorMessage = $state('');

	/** @type {HTMLDivElement | undefined} */
	let root = $state();
	/** @type {HTMLButtonElement | undefined} */
	let toggle = $state();
	/** @type {HTMLDivElement | undefined} */
	let menu = $state();
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;

	let mainLabel = $derived(
		{
			idle: t('export.download', { format: t(`export.${format.id}`) }),
			busy: t('export.preparing'),
			copied: t('export.copied'),
			failed: t('export.failed')
		}[status]
	);

	onMount(() => {
		try {
			format = findFormat(localStorage.getItem(STORAGE_KEY));
		} catch {
			// Blocked storage: keep the default format.
		}
	});

	/** @param {'idle' | 'copied' | 'failed'} next */
	function show(next) {
		status = next;
		clearTimeout(timer);
		if (next !== 'idle') timer = setTimeout(() => (status = 'idle'), 2500);
	}

	async function download() {
		if (status === 'busy') return;
		status = 'busy';
		errorMessage = '';
		try {
			const report = build();
			const fontBaseUrl = new URL(asset('/fonts/'), window.location.href).href;
			const content = await format.render(report, { fontBaseUrl });
			downloadFile(reportFilename(report, format.extension), content, format.mime);
			show('idle');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
			show('failed');
		}
	}

	async function copyMarkdown() {
		close(true);
		try {
			await navigator.clipboard.writeText(toMarkdown(build()));
			show('copied');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
			show('failed');
		}
	}

	/** @param {(typeof FORMATS)[number]} choice */
	function choose(choice) {
		format = choice;
		try {
			localStorage.setItem(STORAGE_KEY, choice.id);
		} catch {
			// The choice lasts until the page is closed.
		}
		close(true);
	}

	async function openMenu() {
		open = true;
		await tick();
		menu?.querySelector(`[aria-checked="true"]`)?.focus();
	}

	/** @param {boolean} [refocus] */
	function close(refocus) {
		if (!open) return;
		open = false;
		if (refocus) toggle?.focus();
	}

	/** @param {KeyboardEvent} event */
	function onMenuKeydown(event) {
		const items = /** @type {HTMLElement[]} */ ([
			...(menu?.querySelectorAll('[role^="menuitem"]') ?? [])
		]);
		const index = items.indexOf(/** @type {HTMLElement} */ (document.activeElement));
		const moves = {
			ArrowDown: index + 1,
			ArrowUp: index - 1,
			Home: 0,
			End: items.length - 1
		};
		if (event.key in moves) {
			event.preventDefault();
			const next = moves[/** @type {keyof typeof moves} */ (event.key)];
			items[(next + items.length) % items.length]?.focus();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			close(true);
		} else if (event.key === 'Tab') {
			close();
		}
	}

	/** @param {PointerEvent} event */
	function onWindowPointerdown(event) {
		if (open && !root?.contains(/** @type {Node} */ (event.target))) close();
	}
</script>

<svelte:window onpointerdown={onWindowPointerdown} />

<div class="export" role="group" aria-label={t('export.heading')} bind:this={root}>
	<button
		type="button"
		class="main"
		class:failed={status === 'failed'}
		onclick={download}
		disabled={status === 'busy'}
		aria-label={status === 'idle'
			? t('export.downloadLabel', { format: t(`export.${format.id}`) })
			: undefined}
		title={status === 'failed' ? errorMessage : undefined}
		aria-live="polite"
	>
		{mainLabel}
	</button>
	<button
		type="button"
		class="toggle"
		bind:this={toggle}
		onclick={() => (open ? close() : openMenu())}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={t('export.chooseFormat')}
		title={t('export.chooseFormat')}
	>
		<span aria-hidden="true">▾</span>
	</button>

	{#if open}
		<div
			class="menu"
			role="menu"
			tabindex="-1"
			aria-label={t('export.chooseFormat')}
			bind:this={menu}
			onkeydown={onMenuKeydown}
		>
			{#each FORMATS as choice (choice.id)}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={choice.id === format.id}
					tabindex="-1"
					onclick={() => choose(choice)}
				>
					<span class="check" aria-hidden="true">{choice.id === format.id ? '✓' : ''}</span>
					{t(`export.${choice.id}`)}
					<span class="ext">.{choice.extension}</span>
				</button>
			{/each}
			<div class="separator" role="separator"></div>
			<button type="button" role="menuitem" tabindex="-1" onclick={copyMarkdown}>
				<span class="check" aria-hidden="true"></span>
				{t('export.copyMarkdown')}
			</button>
		</div>
	{/if}
</div>

<style>
	.export {
		position: relative;
		display: inline-flex;
		align-self: flex-start;
	}

	button {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-dim);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.main {
		padding: 0.3rem 0.75rem;
		border-radius: var(--radius) 0 0 var(--radius);
	}

	.toggle {
		padding: 0.3rem 0.5rem;
		border-left: none;
		border-radius: 0 var(--radius) var(--radius) 0;
	}

	.main:hover:not(:disabled),
	.toggle:hover,
	.toggle[aria-expanded='true'] {
		border-color: var(--color-text);
		color: var(--color-text);
	}

	.toggle:hover,
	.toggle[aria-expanded='true'] {
		border-left: 1px solid var(--color-text);
		margin-left: -1px;
	}

	.main:disabled {
		cursor: progress;
	}

	.main.failed {
		border-color: var(--color-danger);
		color: var(--color-danger);
	}

	button:focus-visible {
		outline: 2px solid var(--color-text);
		outline-offset: 2px;
	}

	.menu {
		position: absolute;
		top: calc(100% + 0.25rem);
		left: 0;
		z-index: 5;
		display: flex;
		flex-direction: column;
		min-width: 100%;
		padding: 0.25rem 0;
		background: var(--color-bg);
		border: 1px solid var(--color-text-muted);
		border-radius: var(--radius);
	}

	.menu button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		border: none;
		text-align: left;
		white-space: nowrap;
	}

	.menu button:hover,
	.menu button:focus-visible {
		background: var(--color-surface);
		color: var(--color-text);
		outline: none;
	}

	.menu button[aria-checked='true'] {
		color: var(--color-text);
	}

	.check {
		width: 1ch;
	}

	.ext {
		margin-left: auto;
		padding-left: 1rem;
		color: var(--color-text-muted);
	}

	.separator {
		margin: 0.25rem 0;
		border-top: 1px solid var(--color-border);
	}
</style>
