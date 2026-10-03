<script>
	import KeyValueTable from '$lib/components/KeyValueTable.svelte';
	import MacFormats from '$lib/components/MacFormats.svelte';
	import { macDetailRows, macSearchUrls } from '$lib/mac/rows.js';
	import { t } from '$lib/i18n/i18n.svelte.js';

	/**
	 * @type {{
	 *   mac: import('$lib/mac/parse.js').ParsedMac,
	 *   vendor: import('$lib/mac/vendor.js').Vendor | null,
	 *   vendorText: string
	 * }}
	 */
	let { mac, vendor, vendorText } = $props();

	let rows = $derived(macDetailRows(mac, vendor, vendorText));

	let searches = $derived(macSearchUrls(mac, vendor));
</script>

<KeyValueTable {rows} />

{#if mac.local && !mac.broadcast}
	<p class="note">{t('mac.localNote')}</p>
{/if}
{#if mac.multicast && !mac.broadcast}
	<p class="note">{t('mac.multicastNote')}</p>
{/if}
{#if mac.prefixOnly}
	<p class="note">{t('mac.prefixNote')}</p>
{/if}

<h3>{t('mac.formatsHeading')}</h3>
<MacFormats formats={mac.formats} />
{#if !mac.prefixOnly}
	<p class="hint">{t('mac.eui64Note')}</p>
{/if}

<h3>{t('mac.pivotHeading')}</h3>
<!-- External links only, so resolve() does not apply. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<ul class="links">
	<li>
		<a href={searches.address} target="_blank" rel="noopener noreferrer">{t('mac.googleSearch')}</a>
	</li>
	{#if searches.vendor}
		<li>
			<a href={searches.vendor} target="_blank" rel="noopener noreferrer">{t('mac.googleVendor')}</a
			>
		</li>
	{/if}
</ul>

<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style>
	h3 {
		margin: 0.5rem 0 0;
		font-size: 1rem;
	}

	.hint,
	.note {
		margin: 0;
		color: var(--color-text-dim);
		font-size: 0.85rem;
	}

	.note {
		padding-left: 0.75rem;
		border-left: 2px solid var(--color-border);
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.875rem;
	}
</style>
