<script>
	import KeyValueTable from '$lib/components/KeyValueTable.svelte';
	import { dmarcRows, spfRows } from '$lib/domain/rows.js';
	import { t } from '$lib/i18n/i18n.svelte.js';

	/**
	 * @type {{ auth: { spf: any, dmarc: any }, findings: { level: 'good' | 'warn' | 'bad' | 'info', key: string, text: string }[] }}
	 */
	let { auth, findings } = $props();

	let spf = $derived(spfRows(auth.spf));
	let dmarc = $derived(dmarcRows(auth.dmarc));
</script>

<ul class="findings">
	{#each findings as finding (finding.key)}
		<li class={finding.level}>
			<span class="badge">{t(`dns.finding.${finding.level}`)}</span>
			<span>{finding.text}</span>
		</li>
	{/each}
</ul>

<div class="records">
	<div>
		<h3>SPF</h3>
		{#if auth.spf}
			<KeyValueTable rows={spf} />
		{:else}
			<p>{t('dns.spf.noRecord')}</p>
		{/if}
	</div>
	<div>
		<h3>DMARC</h3>
		{#if auth.dmarc}
			<KeyValueTable rows={dmarc} />
		{:else}
			<p>{t('dns.dmarc.noRecord')}</p>
		{/if}
	</div>
</div>

<style>
	.findings {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.875rem;
	}

	li {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		overflow-wrap: anywhere;
	}

	.badge {
		flex-shrink: 0;
		min-width: 3.5rem;
		padding: 0 0.4rem;
		border: 1px solid currentColor;
		border-radius: var(--radius);
		font-size: 0.75rem;
		font-weight: 700;
		text-align: center;
	}

	.good .badge {
		color: var(--color-text);
	}

	.warn .badge,
	.info .badge {
		color: var(--color-text-dim);
	}

	.bad .badge {
		color: var(--color-danger);
	}

	.records {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
		gap: 1rem;
	}

	.records > div {
		min-width: 0;
	}

	h3 {
		margin: 0 0 0.35rem;
		font-size: 0.95rem;
		text-shadow: none;
	}

	p {
		margin: 0;
		color: var(--color-text-dim);
		font-size: 0.85rem;
	}
</style>
