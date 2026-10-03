import { toMarkdown } from './markdown.js';

/** @typedef {import('./report.js').Report} Report */

/** @param {Report} report */
export function toJson(report) {
	return `${JSON.stringify(report, null, 2)}\n`;
}

/**
 * Export formats offered by ExportMenu.
 * @type {Record<'markdown' | 'json', { extension: string, mime: string, render: (report: Report) => string }>}
 */
export const FORMATS = {
	markdown: { extension: 'md', mime: 'text/markdown;charset=utf-8', render: toMarkdown },
	json: { extension: 'json', mime: 'application/json;charset=utf-8', render: toJson }
};

/**
 * Safe file name such as `freeosintui-ip-8.8.8.8-20261003-1952.md`.
 * @param {Report} report
 * @param {string} extension
 */
export function reportFilename(report, extension) {
	const slug = report.input
		.normalize('NFKD')
		.replace(/[^\w.@-]+/g, '-')
		.replace(/^[-.]+|[-.]+$/g, '')
		.slice(0, 60);
	const stamp = report.generatedAt.slice(0, 16).replace(/-|:/g, '').replace('T', '-');
	return ['freeosintui', report.tool, slug, stamp].filter(Boolean).join('-') + `.${extension}`;
}

/**
 * Saves text as a file through a temporary link (browser only).
 * @param {string} filename
 * @param {string} content
 * @param {string} mime
 */
export function downloadText(filename, content, mime) {
	const url = URL.createObjectURL(new Blob([content], { type: mime }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
