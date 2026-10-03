import { t } from '$lib/i18n/i18n.svelte.js';
import { SITE_NAME, SITE_URL } from '$lib/site.js';
import { isBlank } from './report.js';

/** @typedef {import('./report.js').Report} Report */
/** @typedef {import('./report.js').Block} Block */
/** @typedef {import('./report.js').Cell} Cell */

/**
 * Renders a report as a readable Markdown document.
 * @param {Report} report
 */
export function toMarkdown(report) {
	const lines = [
		`# ${escapeText(t('export.reportTitle', { tool: report.title }))}`,
		'',
		`- **${t('export.input')}:** ${inlineCode(report.input)}`,
		`- **${t('export.generated')}:** ${report.generatedAt}`,
		`- **${t('export.generatedBy')}:** [${SITE_NAME}](${SITE_URL})`
	];

	for (const section of report.sections) {
		lines.push('', `## ${escapeText(section.title)}`, '');
		if (section.source) lines.push(`_${t('export.source')}: ${escapeText(section.source)}_`, '');
		if (section.note) lines.push(`> ${escapeText(section.note)}`, '');

		if (section.status === 'loading') lines.push(`_${t('export.loading')}_`);
		else if (section.status === 'error')
			lines.push(`**${t('export.error')}:** ${escapeText(section.error ?? '')}`);
		else if (!section.blocks.length) lines.push(`_${t('common.noData')}_`);
		else lines.push(section.blocks.map(renderBlock).join('\n\n'));
	}

	return `${lines.join('\n').trimEnd()}\n`;
}

/** @param {Block} block */
function renderBlock(block) {
	const title = block.title ? `### ${escapeText(block.title)}\n\n` : '';
	switch (block.type) {
		case 'fields': {
			const rows = block.rows
				.filter((row) => !isBlank(row.value))
				.map((row) => [row.label, { text: String(row.value), href: row.href }]);
			return title + renderTable([t('export.field'), t('export.value')], rows);
		}
		case 'table':
			return title + renderTable(block.columns, block.rows);
		case 'list':
			return title + block.items.map((item) => `- ${renderCell(item)}`).join('\n');
		case 'text':
			return title + escapeText(block.text);
	}
}

/**
 * @param {string[]} columns
 * @param {Cell[][]} rows
 */
function renderTable(columns, rows) {
	const row = (/** @type {string[]} */ cells) => `| ${cells.join(' | ')} |`;
	return [
		row(columns.map(escapeText)),
		row(columns.map(() => '---')),
		...rows.map((cells) => row(cells.map(renderCell)))
	].join('\n');
}

/** @param {Cell} cell */
function renderCell(cell) {
	if (cell && typeof cell === 'object') {
		const label = escapeText(cell.text);
		return cell.href && /^(https?|mailto):/i.test(cell.href)
			? `[${label}](${cell.href.replace(/[()|\s]/g, encodeURIComponent)})`
			: label;
	}
	if (typeof cell === 'boolean') return cell ? t('common.yes') : t('common.no');
	return isBlank(cell) ? '' : escapeText(String(cell));
}

/**
 * Escapes characters that Markdown would read as formatting or HTML.
 * @param {string} value
 */
export function escapeText(value) {
	return value.replace(/[\\`*_[\]<>#|]/g, '\\$&').replace(/\s*\n\s*/g, ' ');
}

/**
 * Wraps a value in a code span long enough to hold any backticks it contains.
 * @param {string} value
 */
function inlineCode(value) {
	const runs = value.match(/`+/g) ?? [];
	const fence = '`'.repeat(Math.max(0, ...runs.map((run) => run.length)) + 1);
	const padded = /^`|`$/.test(value) ? ` ${value} ` : value;
	return `${fence}${padded.replace(/\s*\n\s*/g, ' ')}${fence}`;
}
