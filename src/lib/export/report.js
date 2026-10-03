import { t } from '$lib/i18n/i18n.svelte.js';

/**
 * Tool-independent shape of exported results. Every tool has a `report.js` that turns
 * its page state into a Report; `markdown.js` and `json.js` render it.
 *
 * @typedef {string | number | boolean | null | undefined} Value
 * @typedef {{ label: string, value: Value, href?: string }} Field
 * @typedef {{ text: string, href?: string }} Link
 * @typedef {Value | Link} Cell
 * @typedef {(
 *   | { type: 'fields', rows: Field[] }
 *   | { type: 'table', columns: string[], rows: Cell[][] }
 *   | { type: 'list', items: Cell[] }
 *   | { type: 'text', text: string }
 * ) & { title?: string }} Block
 * @typedef {'done' | 'empty' | 'error' | 'loading'} SectionStatus
 * @typedef {{ title: string, source?: string, note?: string, status: SectionStatus, error?: string, blocks: Block[] }} ReportSection
 * @typedef {{ tool: string, title: string, input: string, generatedAt: string, sections: ReportSection[] }} Report
 */

/**
 * @param {{ tool: string, input: string, sections: ReportSection[], now?: Date }} options
 * @returns {Report}
 */
export function createReport({ tool, input, sections, now = new Date() }) {
	return {
		tool,
		title: t(`tools.${tool}.name`),
		input,
		generatedAt: now.toISOString(),
		sections
	};
}

/**
 * A section whose content is already known (offline tools, or data that is never loading).
 * Without any non-empty block it is marked empty.
 * @param {string} title
 * @param {(Block | null | undefined | false)[]} blocks
 * @param {{ source?: string, note?: string }} [meta]
 * @returns {ReportSection}
 */
export function section(title, blocks, meta = {}) {
	const kept = /** @type {Block[]} */ (blocks.filter((block) => block && !isEmptyBlock(block)));
	return { title, ...meta, status: kept.length ? 'done' : 'empty', blocks: kept };
}

/**
 * A section built from a page's `{ status, data, error }` state of an independent lookup.
 * @param {string} title
 * @param {{ status: 'loading' | 'done' | 'error', data?: any, error?: string } | null | undefined} state
 * @param {(data: any) => (Block | null | undefined | false)[]} toBlocks
 * @param {{ source?: string, note?: string, emptyText?: string, isEmpty?: (data: any) => boolean }} [meta]
 * @returns {ReportSection}
 */
export function stateSection(title, state, toBlocks, meta = {}) {
	const { emptyText, isEmpty = (data) => data === null || data === undefined, ...rest } = meta;
	if (!state || state.status === 'loading')
		return { title, ...rest, status: 'loading', blocks: [] };
	if (state.status === 'error')
		return { title, ...rest, status: 'error', error: state.error, blocks: [] };
	if (isEmpty(state.data)) return emptySection(title, rest, emptyText);
	const result = section(title, toBlocks(state.data), rest);
	return result.status === 'empty' ? emptySection(title, rest, emptyText) : result;
}

/**
 * @param {string} title
 * @param {{ source?: string, note?: string }} meta
 * @param {string} [emptyText]
 * @returns {ReportSection}
 */
function emptySection(title, meta, emptyText) {
	return {
		title,
		...meta,
		status: 'empty',
		blocks: emptyText ? [{ type: 'text', text: emptyText }] : []
	};
}

/** @param {Field[]} rows @param {string} [title] @returns {Block} */
export const fields = (rows, title) => ({ type: 'fields', rows, ...(title && { title }) });

/** @param {string[]} columns @param {Cell[][]} rows @param {string} [title] @returns {Block} */
export const table = (columns, rows, title) => ({
	type: 'table',
	columns,
	rows,
	...(title && { title })
});

/** @param {Cell[]} items @param {string} [title] @returns {Block} */
export const list = (items, title) => ({ type: 'list', items, ...(title && { title }) });

/** @param {string} text @param {string} [title] @returns {Block} */
export const text = (text, title) => ({ type: 'text', text, ...(title && { title }) });

/** @param {Value} value */
export const isBlank = (value) => value === null || value === undefined || value === '';

/** @param {Block} block */
function isEmptyBlock(block) {
	switch (block.type) {
		case 'fields':
			return !block.rows.some((row) => !isBlank(row.value));
		case 'table':
			return !block.rows.length;
		case 'list':
			return !block.items.length;
		case 'text':
			return !block.text;
	}
}
