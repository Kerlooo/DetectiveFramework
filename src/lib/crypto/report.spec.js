import { describe, expect, it } from 'vitest';
import { buildCryptoReport } from './report.js';
import { CHAINS } from './chains.js';
import { toMarkdown } from '$lib/export/markdown.js';

const ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const TARGET = /** @type {const} */ ({
	chain: 'btc',
	address: ADDRESS,
	type: 'p2wpkh',
	checksumKind: 'bech32'
});

describe('buildCryptoReport', () => {
	it('exports the summary and the transactions with explorer links', () => {
		const report = buildCryptoReport({
			target: TARGET,
			chain: CHAINS.btc,
			error: '',
			data: /** @type {any} */ ({
				balance: 150000000n,
				received: 200000000n,
				sent: 50000000n,
				txCount: 2,
				pendingTxCount: 0,
				firstSeen: new Date('2024-01-01T10:00:00Z'),
				lastSeen: new Date('2024-02-01T10:00:00Z'),
				extra: [],
				txs: [
					{
						id: 'abc123',
						time: null,
						confirmed: false,
						failed: false,
						coinbase: false,
						direction: 'out',
						amount: 50000000n,
						counterparties: ['a1', 'a2', 'a3', 'a4', 'a5']
					}
				]
			})
		});
		expect(report.input).toBe(ADDRESS);
		const markdown = toMarkdown(report);
		expect(markdown).toContain('| Balance | 1.5 BTC |');
		expect(markdown).toContain('| Type | P2WPKH (native SegWit) |');
		expect(markdown).toContain(`[mempool.space](https://mempool.space/address/${ADDRESS})`);
		expect(markdown).toContain(
			'| [abc123](https://mempool.space/tx/abc123) | pending | ↑ out · unconfirmed | -0.5 BTC | a1, a2, a3 +2 more |'
		);
	});

	it('marks both sections as failed when the trace fails', () => {
		const report = buildCryptoReport({
			target: TARGET,
			chain: CHAINS.btc,
			data: null,
			error: 'mempool.space answered with HTTP 500.'
		});
		expect(report.sections.map((section) => section.status)).toEqual(['error', 'error']);
	});
});
