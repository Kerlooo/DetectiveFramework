// PDF rendering of a report with jsPDF. Loaded with a dynamic import, so jsPDF is only
// downloaded when someone exports a PDF.
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { t } from '$lib/i18n/i18n.svelte.js';
import { SITE_NAME, SITE_URL } from '$lib/site.js';
import { isBlank } from './report.js';

/** @typedef {import('./report.js').Report} Report */
/** @typedef {import('./report.js').Block} Block */
/** @typedef {import('./report.js').Cell} Cell */
/** @typedef {(file: string) => Promise<string>} FontLoader resolves a font file to base64 */

/**
 * Fonts in static/fonts (SIL Open Font License). The standard PDF fonts only cover
 * Latin-1, so Noto Sans is embedded; reports with Japanese text use Noto Sans JP
 * (JIS X 0208 subset, regular weight only). jsPDF embeds only the glyphs used.
 */
export const PDF_FONTS = {
	latin: { family: 'NotoSans', regular: 'NotoSans-Regular.ttf', bold: 'NotoSans-Bold.ttf' },
	cjk: { family: 'NotoSansJP', regular: 'NotoSansJP-Regular.ttf', bold: 'NotoSansJP-Regular.ttf' }
};

// Print colours (RGB): the site's neon green on black does not suit paper.
const COLOR = {
	text: [25, 25, 25],
	muted: [105, 105, 105],
	accent: [10, 110, 38],
	link: [0, 85, 170],
	border: [200, 205, 200],
	headFill: [232, 243, 235],
	error: [190, 30, 30]
};

const PAGE = { width: 210, height: 297, margin: 15, footer: 10 };
const WIDTH = PAGE.width - 2 * PAGE.margin;
const PT = 0.3528; // mm per point
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/;
// Emoji (flags included) and arrows such as the "↗" of external links are in neither
// font and would print as blanks.
const UNSUPPORTED =
	/\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u2190-\u21ff]|\u{FE0F}|\u{200D}/gu;
const WEB_LINK = /^(https?|mailto):/i;

/**
 * Removes characters the fonts cannot draw and collapses whitespace.
 * @param {string} value
 */
export function cleanText(value) {
	return value
		.replace(UNSUPPORTED, '')
		.replace(/\s+/g, ' ')
		.replace(/\(\s+/g, '(')
		.replace(/\s+\)/g, ')')
		.trim();
}

/**
 * Fetches fonts from a base URL once per session and returns them as base64.
 * @param {string} baseUrl absolute URL of the fonts folder, ending with "/"
 * @param {typeof fetch} [fetchImpl]
 * @returns {FontLoader}
 */
export function fontLoader(baseUrl, fetchImpl = fetch) {
	return (file) => {
		const url = new URL(file, baseUrl).href;
		let pending = fontCache.get(url);
		if (!pending) {
			pending = fetchImpl(url)
				.then((response) => {
					if (!response.ok) throw new Error(t('export.fontError'));
					return response.arrayBuffer();
				})
				.then(toBase64);
			// A failed download can be retried with the next export.
			pending.catch(() => fontCache.delete(url));
			fontCache.set(url, pending);
		}
		return pending;
	};
}

/** @type {Map<string, Promise<string>>} */
const fontCache = new Map();

/** @param {ArrayBuffer} buffer */
function toBase64(buffer) {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

/**
 * Renders a report as an A4 PDF document.
 * @param {Report} report
 * @param {{ loadFont: FontLoader }} options
 * @returns {Promise<Uint8Array>}
 */
export async function toPdf(report, { loadFont }) {
	const font = CJK.test(JSON.stringify(report)) ? PDF_FONTS.cjk : PDF_FONTS.latin;
	const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
	const [regular, bold] = await Promise.all([loadFont(font.regular), loadFont(font.bold)]);
	doc.addFileToVFS(`${font.family}-normal.ttf`, regular);
	doc.addFont(`${font.family}-normal.ttf`, font.family, 'normal');
	doc.addFileToVFS(`${font.family}-bold.ttf`, bold);
	doc.addFont(`${font.family}-bold.ttf`, font.family, 'bold');

	const title = cleanText(t('export.reportTitle', { tool: report.title }));
	doc.setProperties({ title, subject: report.input, creator: SITE_NAME });

	const writer = new Writer(doc, font.family);
	writer.paragraph(title, { size: 18, style: 'bold', color: COLOR.accent });
	writer.gap(1);
	writer.paragraph(`${t('export.input')}: ${report.input}`, { size: 9.5 });
	writer.paragraph(`${t('export.generated')}: ${report.generatedAt}`, {
		size: 9.5,
		color: COLOR.muted
	});
	writer.paragraph(`${t('export.generatedBy')}: ${SITE_NAME} (${SITE_URL})`, {
		size: 9.5,
		color: COLOR.link,
		href: SITE_URL
	});

	for (const section of report.sections) {
		writer.heading(section.title);
		if (section.source)
			writer.paragraph(`${t('export.source')}: ${section.source}`, {
				size: 8.5,
				color: COLOR.muted
			});
		if (section.note) writer.note(section.note);

		if (section.status === 'loading') writer.paragraph(t('export.loading'), { color: COLOR.muted });
		else if (section.status === 'error')
			writer.paragraph(`${t('export.error')}: ${section.error ?? ''}`, { color: COLOR.error });
		else if (!section.blocks.length) writer.paragraph(t('common.noData'), { color: COLOR.muted });
		else for (const block of section.blocks) writer.block(block);
	}

	writer.footers(`${SITE_NAME} — ${title}`);
	return new Uint8Array(doc.output('arraybuffer'));
}

/** Lays out text top to bottom, adding pages as needed. */
class Writer {
	/**
	 * @param {jsPDF} doc
	 * @param {string} family
	 */
	constructor(doc, family) {
		this.doc = doc;
		this.family = family;
		this.y = PAGE.margin;
	}

	get bottom() {
		return PAGE.height - PAGE.margin - PAGE.footer;
	}

	/** @param {number} height */
	ensure(height) {
		if (this.y + height > this.bottom) {
			this.doc.addPage();
			this.y = PAGE.margin;
		}
	}

	/** @param {number} mm */
	gap(mm) {
		this.y += mm;
	}

	/**
	 * @param {string} text
	 * @param {{ size?: number, style?: 'normal' | 'bold', color?: number[], indent?: number, href?: string, bullet?: boolean }} [options]
	 */
	paragraph(
		text,
		{ size = 10, style = 'normal', color = COLOR.text, indent = 0, href, bullet } = {}
	) {
		const { doc } = this;
		const value = cleanText(text);
		if (!value) return;
		doc.setFont(this.family, style);
		doc.setFontSize(size);
		doc.setTextColor(color[0], color[1], color[2]);
		const lineHeight = size * PT * 1.4;
		const textIndent = indent + (bullet ? 4 : 0);
		const lines = /** @type {string[]} */ (doc.splitTextToSize(value, WIDTH - textIndent));
		lines.forEach((line, i) => {
			this.ensure(lineHeight);
			const x = PAGE.margin + textIndent;
			if (bullet && i === 0) doc.text('•', PAGE.margin + indent + 1, this.y, { baseline: 'top' });
			doc.text(line, x, this.y, { baseline: 'top' });
			if (href) doc.link(x, this.y, doc.getTextWidth(line), lineHeight, { url: href });
			this.y += lineHeight;
		});
	}

	/** @param {string} text */
	heading(text) {
		this.ensure(18);
		this.gap(5);
		this.paragraph(text, { size: 13, style: 'bold', color: COLOR.accent });
		const { doc } = this;
		doc.setDrawColor(COLOR.accent[0], COLOR.accent[1], COLOR.accent[2]);
		doc.setLineWidth(0.3);
		doc.line(PAGE.margin, this.y + 0.5, PAGE.margin + WIDTH, this.y + 0.5);
		this.gap(2.5);
	}

	/** @param {string} text */
	note(text) {
		const top = this.y;
		const page = this.doc.getCurrentPageInfo().pageNumber;
		this.paragraph(text, { size: 9, color: COLOR.muted, indent: 3 });
		// Left bar, like a Markdown quote; skipped if the note crossed a page break.
		if (this.doc.getCurrentPageInfo().pageNumber === page) {
			this.doc.setDrawColor(COLOR.border[0], COLOR.border[1], COLOR.border[2]);
			this.doc.setLineWidth(0.8);
			this.doc.line(PAGE.margin + 0.5, top, PAGE.margin + 0.5, this.y);
		}
		this.gap(1.5);
	}

	/** @param {Block} block */
	block(block) {
		if (block.title) {
			this.ensure(12);
			this.gap(1.5);
			this.paragraph(block.title, { size: 10.5, style: 'bold' });
			this.gap(0.5);
		}
		switch (block.type) {
			case 'fields':
				this.table(
					null,
					block.rows
						.filter((row) => !isBlank(row.value))
						.map((row) => [row.label, { text: String(row.value), href: row.href }])
				);
				break;
			case 'table':
				this.table(block.columns, block.rows);
				break;
			case 'list':
				for (const item of block.items) {
					const { text, href } = cellParts(item);
					if (text)
						this.paragraph(text, { bullet: true, ...(href && { href, color: COLOR.link }) });
				}
				break;
			case 'text':
				this.paragraph(block.text);
				break;
		}
		this.gap(2);
	}

	/**
	 * @param {string[] | null} columns header row, or null for a label/value table
	 * @param {Cell[][]} rows
	 */
	table(columns, rows) {
		const body = rows.map((cells) =>
			cells.map((cell) => {
				const { text, href } = cellParts(cell);
				return href
					? { content: text, href, styles: { textColor: COLOR.link } }
					: { content: text };
			})
		);
		autoTable(this.doc, {
			startY: this.y,
			head: columns ? [columns.map(cleanText)] : undefined,
			body,
			theme: 'grid',
			margin: {
				left: PAGE.margin,
				right: PAGE.margin,
				top: PAGE.margin,
				bottom: PAGE.margin + PAGE.footer
			},
			styles: {
				font: this.family,
				fontSize: 8.5,
				cellPadding: 1.6,
				overflow: 'linebreak',
				textColor: COLOR.text,
				lineColor: COLOR.border,
				lineWidth: 0.1
			},
			headStyles: { fontStyle: 'bold', fillColor: COLOR.headFill, textColor: COLOR.accent },
			columnStyles: columns ? {} : { 0: { fontStyle: 'bold', cellWidth: 50 } },
			didDrawCell: (data) => {
				const href = /** @type {any} */ (data.cell.raw)?.href;
				if (data.section === 'body' && href)
					this.doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: href });
			}
		});
		this.y = /** @type {any} */ (this.doc).lastAutoTable.finalY;
	}

	/** @param {string} text */
	footers(text) {
		const { doc } = this;
		const pages = doc.getNumberOfPages();
		for (let page = 1; page <= pages; page++) {
			doc.setPage(page);
			doc.setFont(this.family, 'normal');
			doc.setFontSize(8);
			doc.setTextColor(COLOR.muted[0], COLOR.muted[1], COLOR.muted[2]);
			const y = PAGE.height - PAGE.margin + 2;
			const label = doc.splitTextToSize(cleanText(text), WIDTH - 20)[0];
			doc.text(label, PAGE.margin, y);
			doc.text(`${page} / ${pages}`, PAGE.margin + WIDTH, y, { align: 'right' });
		}
	}
}

/**
 * Text and safe link of a cell, as the Markdown renderer reads them.
 * @param {Cell} cell
 * @returns {{ text: string, href?: string }}
 */
function cellParts(cell) {
	if (cell && typeof cell === 'object') {
		const text = cleanText(cell.text);
		return cell.href && WEB_LINK.test(cell.href) ? { text, href: cell.href } : { text };
	}
	if (typeof cell === 'boolean') return { text: cell ? t('common.yes') : t('common.no') };
	return { text: isBlank(cell) ? '' : cleanText(String(cell)) };
}
