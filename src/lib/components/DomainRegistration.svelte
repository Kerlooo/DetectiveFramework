<script>
	import KeyValueTable from '$lib/components/KeyValueTable.svelte';
	import { contactRows, registrationRows } from '$lib/domain/rows.js';
	import { t } from '$lib/i18n/i18n.svelte.js';

	/** @type {{ rdap: ReturnType<typeof import('$lib/rdap.js').summarizeRdap> | null, domain: string }} */
	let { rdap, domain } = $props();

	let rows = $derived(registrationRows(rdap));
	let contacts = $derived(contactRows(rdap));
</script>

{#if rdap}
	<KeyValueTable {rows} />
	{#if contacts.length}
		<h3>{t('domain.rdap.contacts')}</h3>
		<KeyValueTable rows={contacts} />
		<p class="note">{t('domain.rdap.redacted')}</p>
	{/if}
{:else}
	<p class="note">
		{t('domain.rdap.notFoundBefore')} <strong>{domain}</strong>{t('domain.rdap.notFoundAfter')}
	</p>
{/if}

<style>
	h3 {
		margin: 0.5rem 0 0;
		font-size: 0.95rem;
		text-shadow: none;
	}

	.note {
		margin: 0;
		color: var(--color-text-dim);
		font-size: 0.85rem;
		overflow-wrap: anywhere;
	}

	strong {
		color: var(--color-text);
	}
</style>
