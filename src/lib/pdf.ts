import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfRow = { label: string; value: string; tone?: "warning" | "destructive" | undefined };
export type PdfPhqItem = { index: number; label: string; value: number };
/**
 * `endpoint` (expected PHQ-9 with CI) is optional; both PDFs currently leave
 * it out so they show no outcome numbers. `description` explains the care
 * component and is printed under its name. `helpful` marks a "likely to
 * help" row, whose note is then drawn as a green badge like on the page.
 */
export type PdfScenarioRow = {
  label: string;
  description?: string | undefined;
  rank: string;
  endpoint?: string;
  note: string;
  helpful?: boolean;
};
type ScenarioTableHeaders = {
  careComponent: string;
  rank: string;
  endpoint?: string;
  note: string;
};
export type PdfScenarioTable = { heading: string; rows: PdfScenarioRow[] };

/** Shown in every PDF's header: the app's name, and the language for the date. */
type Branding = { appName: string; lang: "de" | "en" };

export type PraxisPdfInput = Branding & {
  filenamePrefix: string;
  title: string;
  subtitle: string;
  riskLabel: string;
  riskValue: string;
  riskTone?: "warning" | "destructive" | undefined;
  summaryHeading: string;
  rows: PdfRow[];
  phq9Heading: string;
  phq9Items: PdfPhqItem[];
  modelHeading: string;
  tableHeaders: ScenarioTableHeaders;
  scenarioTables: PdfScenarioTable[];
  footer: string;
};

export type ResultsPdfInput = Branding & {
  filenamePrefix: string;
  title: string;
  subtitle: string;
  baselineLabel: string;
  baselineValue: string;
  severityValue: string;
  scenariosHeading: string;
  scenariosBody: string;
  tableHeaders: ScenarioTableHeaders;
  scenarioTables: PdfScenarioTable[];
  predictorsHeading: string;
  predictorsBody: string;
  predictorRows: PdfRow[];
  footer: string;
};

type RGB = [number, number, number];

/**
 * sRGB versions of the light-theme oklch tokens in styles.css, so the PDF
 * looks like the app. jsPDF only takes RGB; keep these in sync by hand.
 */
const COLOR = {
  foreground: [18, 30, 24],
  mutedForeground: [83, 94, 89],
  primary: [43, 108, 80],
  brandStrong: [19, 72, 52],
  brandSoft: [227, 246, 234],
  accent: [221, 109, 73],
  muted: [235, 242, 238],
  border: [213, 221, 216],
  success: [44, 99, 48],
  successSoft: [225, 245, 224],
} satisfies Record<string, RGB>;

const TONE_COLOR: Record<"warning" | "destructive", { fill: RGB; text: RGB }> = {
  warning: { fill: [253, 241, 216], text: [99, 63, 0] },
  destructive: { fill: [255, 234, 233], text: [183, 24, 36] },
};

const MARGIN = 16;
const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
/** Content stops here; the page footer sits below it. */
const CONTENT_BOTTOM = PAGE_HEIGHT - 22;

/**
 * jsPDF's built-in fonts (Helvetica etc.) only support WinAnsi/Latin-1 — no
 * Greek letters, no math comparison operators. Feeding them an unsupported
 * glyph doesn't just drop that character, it corrupts the whole string's
 * rendering (mis-spaced or wrong glyphs throughout the cell). The app's own
 * content JSON uses "Δ" and "≤" in a couple of places that are fine in the
 * on-screen HTML but need a plain-ASCII stand-in here.
 */
const pdfSafe = (text: string): string =>
  text.replaceAll("Δ", "Diff.").replaceAll("≤", "<=").replaceAll("≥", ">=");

/** Height in mm of one line of text at `fontSize` pt. */
const lineHeight = (doc: jsPDF, fontSize: number) =>
  (fontSize * doc.getLineHeightFactor()) / doc.internal.scaleFactor;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lastTableY = (doc: jsPDF): number => (doc as any).lastAutoTable.finalY;

/** Starts a new page when fewer than `needed` mm are left, and returns where to continue. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= CONTENT_BOTTOM) return y;
  doc.addPage();
  return MARGIN;
}

/**
 * The compass logo (see CompassMark.tsx) drawn with vector primitives, in a
 * `size`-mm square at (x, y). jsPDF has no arc command, so the open ring is
 * a polyline along the same 330° arc as the SVG.
 */
function drawCompassMark(doc: jsPDF, x: number, y: number, size: number) {
  const s = size / 32; // SVG viewBox units → mm
  const px = (vx: number) => x + vx * s;
  const py = (vy: number) => y + vy * s;

  const points: [number, number][] = [];
  for (let deg = -60; deg >= -390; deg -= 5) {
    const t = (deg * Math.PI) / 180;
    points.push([16 + 13 * Math.cos(t), 16 + 13 * Math.sin(t)]);
  }
  const segments = points.slice(1).map(([vx, vy], i) => {
    const [prevX, prevY] = points[i] as [number, number];
    return [(vx - prevX) * s, (vy - prevY) * s];
  });
  const [startX, startY] = points[0] as [number, number];
  doc.setDrawColor(...COLOR.primary);
  doc.setLineWidth(3.2 * s);
  doc.setLineCap("round");
  doc.setLineJoin("round");
  doc.lines(segments, px(startX), py(startY), [1, 1], "S", false);
  doc.setLineCap("butt");

  // Needle: the SVG's two triangles, rotated 45° about the centre.
  const rotate = (vx: number, vy: number): [number, number] => {
    const c = Math.SQRT1_2;
    return [px(16 + (vx - 16) * c - (vy - 16) * c), py(16 + (vx - 16) * c + (vy - 16) * c)];
  };
  const triangle = (a: [number, number], b: [number, number], c: [number, number], fill: RGB) => {
    doc.setFillColor(...fill);
    doc.triangle(...rotate(...a), ...rotate(...b), ...rotate(...c), "F");
  };
  triangle([16, 3.5], [19.4, 16], [12.6, 16], COLOR.accent);
  triangle([16, 22], [19.4, 16], [12.6, 16], COLOR.primary);
}

/** Brand bar at the top of the first page: logo, app name, today's date. */
function drawHeader(doc: jsPDF, branding: Branding): number {
  const y = MARGIN;
  drawCompassMark(doc, MARGIN, y - 1, 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLOR.brandStrong);
  doc.text(pdfSafe(branding.appName), MARGIN + 10.5, y + 4.4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR.mutedForeground);
  const date = new Date().toLocaleDateString(branding.lang === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(date, PAGE_WIDTH - MARGIN, y + 4.4, { align: "right" });

  doc.setDrawColor(...COLOR.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 10, PAGE_WIDTH - MARGIN, y + 10);
  return y + 20;
}

/** App name and "page / total" on every page, below a thin rule. */
function drawPageFooters(doc: jsPDF, appName: string) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const y = PAGE_HEIGHT - 12;
    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.mutedForeground);
    doc.text(pdfSafe(appName), MARGIN, y);
    doc.text(`${page} / ${pages}`, PAGE_WIDTH - MARGIN, y, { align: "right" });
  }
}

/** Wrapped text block; returns the y below it. */
function drawText(
  doc: jsPDF,
  text: string,
  y: number,
  opts: { size: number; color: RGB; bold?: boolean; gapAfter?: number },
): number {
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(opts.size);
  doc.setTextColor(...opts.color);
  const lines = doc.splitTextToSize(pdfSafe(text), CONTENT_WIDTH);
  const height = lines.length * lineHeight(doc, opts.size);
  y = ensureSpace(doc, y, height);
  doc.text(lines, MARGIN, y, { baseline: "top" });
  return y + height + (opts.gapAfter ?? 0);
}

/** Page title and subtitle, as in the page hero. */
function drawTitle(doc: jsPDF, title: string, subtitle: string, y: number): number {
  y = drawText(doc, title, y, { size: 20, color: COLOR.brandStrong, bold: true, gapAfter: 2 });
  return drawText(doc, subtitle, y, { size: 10, color: COLOR.mutedForeground, gapAfter: 7 });
}

/**
 * A section heading with a short coral accent underline. `keepWith` reserves
 * room for what follows so a heading never sits alone at the bottom of a page.
 */
function drawSectionHeading(doc: jsPDF, text: string, y: number, keepWith = 30): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const lines = doc.splitTextToSize(pdfSafe(text), CONTENT_WIDTH);
  const height = lines.length * lineHeight(doc, 13);
  y = ensureSpace(doc, y, height + keepWith);
  doc.setTextColor(...COLOR.brandStrong);
  doc.text(lines, MARGIN, y, { baseline: "top" });
  y += height + 1.2;
  doc.setDrawColor(...COLOR.accent);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN + 10, y);
  return y + 4;
}

/** A card with a coloured left edge, like the app's panels. */
function drawCallout(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  colors: { fill: RGB; edge: RGB; text: RGB },
): number {
  const padding = 5;
  const textWidth = CONTENT_WIDTH - padding * 2 - 1.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const labelLines = doc.splitTextToSize(pdfSafe(label), textWidth);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  const valueLines = doc.splitTextToSize(pdfSafe(value), textWidth);
  const height =
    padding * 2 +
    labelLines.length * lineHeight(doc, 9) +
    1.5 +
    valueLines.length * lineHeight(doc, 12.5);

  y = ensureSpace(doc, y, height);
  doc.setFillColor(...colors.fill);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, height, 2, 2, "F");
  doc.setFillColor(...colors.edge);
  doc.rect(MARGIN, y, 1.5, height, "F");

  const x = MARGIN + 1.5 + padding;
  let ty = y + padding;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR.mutedForeground);
  doc.text(labelLines, x, ty, { baseline: "top" });
  ty += labelLines.length * lineHeight(doc, 9) + 1.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...colors.text);
  doc.text(valueLines, x, ty, { baseline: "top" });
  return y + height + 8;
}

/** Shared table look: light brand-tinted header, thin row rules, no heavy stripes. */
const TABLE_BASE = {
  margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: PAGE_HEIGHT - CONTENT_BOTTOM },
  theme: "plain" as const,
  styles: {
    fontSize: 9,
    textColor: COLOR.foreground,
    cellPadding: { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 },
    lineColor: COLOR.border,
    lineWidth: { bottom: 0.2 },
  },
  headStyles: {
    fillColor: COLOR.brandSoft,
    textColor: COLOR.brandStrong,
    fontStyle: "bold" as const,
    fontSize: 8.5,
    lineWidth: 0,
  },
};

/** Two-column label/value list, e.g. the clinician summary and the predictors. */
function drawKeyValueTable(doc: jsPDF, y: number, rows: PdfRow[]): number {
  autoTable(doc, {
    ...TABLE_BASE,
    startY: y,
    body: rows.map((r) => [pdfSafe(r.label), pdfSafe(r.value)]),
    columnStyles: {
      0: { textColor: COLOR.mutedForeground },
      1: { fontStyle: "bold", halign: "right" },
    },
    didParseCell: (data) => {
      const row = rows[data.row.index];
      if (row?.tone && data.column.index === 1) {
        const t = TONE_COLOR[row.tone];
        data.cell.styles.fillColor = t.fill;
        data.cell.styles.textColor = t.text;
      }
    },
  });
  return lastTableY(doc) + 9;
}

/**
 * The ranked care-component table shared by both PDFs. It has an endpoint
 * column only when `headers.endpoint` is given.
 *
 * autoTable uses one font per cell, but each care component's name should
 * read as the main text with its description smaller and grey underneath.
 * So the cell's text is "name\ndescription" only so that autoTable sizes
 * the row. willDrawCell clears it, and didDrawCell draws the two parts in
 * their own styles. The description is drawn smaller than autoTable
 * measured it, so it always fits. "Likely to help" notes get the same
 * treatment to draw them as a green badge.
 */
function drawScenarioTable(
  doc: jsPDF,
  startY: number,
  headers: ScenarioTableHeaders,
  rows: PdfScenarioRow[],
): number {
  const withEndpoint = headers.endpoint !== undefined;
  const noteColumn = withEndpoint ? 3 : 2;
  const isUsualCare = (rowIndex: number) => rows[rowIndex]?.rank === "–";

  autoTable(doc, {
    ...TABLE_BASE,
    startY,
    // Rows are partly drawn by hand in didDrawCell, so they must never split across pages.
    rowPageBreak: "avoid",
    head: [
      [
        pdfSafe(headers.rank),
        pdfSafe(headers.careComponent),
        ...(withEndpoint ? [pdfSafe(headers.endpoint ?? "")] : []),
        pdfSafe(headers.note),
      ],
    ],
    body: rows.map((r) => [
      pdfSafe(r.rank),
      pdfSafe(r.description ? `${r.label}\n${r.description}` : r.label),
      ...(withEndpoint ? [pdfSafe(r.endpoint ?? "–")] : []),
      pdfSafe(r.note),
    ]),
    // Fixed widths for the short columns; the care-component column takes the rest.
    columnStyles: {
      0: { cellWidth: 13, halign: "center", fontStyle: "bold", textColor: COLOR.primary },
      ...(withEndpoint ? { 2: { cellWidth: 28 } } : {}),
      [noteColumn]: { cellWidth: 38 },
    },
    didParseCell: (data) => {
      // Usual care is the comparison row: tinted, like on the page.
      if (data.section === "body" && isUsualCare(data.row.index)) {
        data.cell.styles.fillColor = COLOR.muted;
      }
    },
    willDrawCell: (data) => {
      const row = rows[data.row.index];
      if (data.section !== "body" || !row) return;
      if (data.column.index === 1 && row.description) data.cell.text = [];
      if (data.column.index === noteColumn && row.helpful) data.cell.text = [];
    },
    didDrawCell: (data) => {
      const row = rows[data.row.index];
      if (data.section !== "body" || !row) return;
      const x = data.cell.x + data.cell.padding("left");
      const width = data.cell.width - data.cell.padding("horizontal");
      let y = data.cell.y + data.cell.padding("top");

      if (data.column.index === 1 && row.description) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...COLOR.foreground);
        const labelLines = doc.splitTextToSize(pdfSafe(row.label), width);
        doc.text(labelLines, x, y, { baseline: "top" });
        y += labelLines.length * lineHeight(doc, 9) + 0.8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.8);
        doc.setTextColor(...COLOR.mutedForeground);
        const descriptionLines = doc.splitTextToSize(pdfSafe(row.description), width);
        doc.text(descriptionLines, x, y, { baseline: "top" });
      }

      if (data.column.index === noteColumn && row.helpful) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(pdfSafe(row.note), width - 4);
        const textWidth = Math.max(...lines.map((l: string) => doc.getTextWidth(l)));
        const height = lines.length * lineHeight(doc, 8) + 2;
        doc.setFillColor(...COLOR.successSoft);
        doc.roundedRect(x, y - 0.6, textWidth + 4, height, 1.5, 1.5, "F");
        doc.setTextColor(...COLOR.success);
        doc.text(lines, x + 2, y + 0.4, { baseline: "top" });
      }
    },
  });
  return lastTableY(doc) + 9;
}

/** One ranked table per scenario tab, each under a small label. */
function drawScenarioTables(
  doc: jsPDF,
  y: number,
  headers: ScenarioTableHeaders,
  tables: PdfScenarioTable[],
): number {
  for (const table of tables) {
    y = ensureSpace(doc, y, 40);
    y = drawText(doc, table.heading, y, {
      size: 10,
      color: COLOR.primary,
      bold: true,
      gapAfter: 2,
    });
    y = drawScenarioTable(doc, y, headers, table.rows);
  }
  return y;
}

function drawDisclaimer(doc: jsPDF, text: string, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(pdfSafe(text), CONTENT_WIDTH - 10);
  const height = lines.length * lineHeight(doc, 8) + 8;
  y = ensureSpace(doc, y, height);
  doc.setFillColor(...COLOR.muted);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, height, 2, 2, "F");
  doc.setTextColor(...COLOR.mutedForeground);
  doc.text(lines, MARGIN + 5, y + 4, { baseline: "top" });
}

function save(doc: jsPDF, branding: Branding, filenamePrefix: string) {
  drawPageFooters(doc, branding.appName);
  doc.save(`${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** Generates and downloads a self-contained clinician summary PDF — no browser print dialog, no page chrome. */
export function generatePraxisPdf(input: PraxisPdfInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: pdfSafe(input.title) });

  let y = drawHeader(doc, input);
  y = drawTitle(doc, input.title, input.subtitle, y);

  const tone = input.riskTone ? TONE_COLOR[input.riskTone] : null;
  y = drawCallout(
    doc,
    input.riskLabel,
    input.riskValue,
    y,
    tone
      ? { fill: tone.fill, edge: tone.text, text: tone.text }
      : { fill: COLOR.brandSoft, edge: COLOR.primary, text: COLOR.brandStrong },
  );

  y = drawSectionHeading(doc, input.summaryHeading, y);
  y = drawKeyValueTable(doc, y, input.rows);

  y = drawSectionHeading(doc, input.phq9Heading, y);
  autoTable(doc, {
    ...TABLE_BASE,
    startY: y,
    head: [["#", "", "/3"]],
    body: input.phq9Items.map((it) => [String(it.index), pdfSafe(it.label), String(it.value)]),
    columnStyles: {
      0: { cellWidth: 10, textColor: COLOR.mutedForeground },
      2: { cellWidth: 14, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      const item = input.phq9Items[data.row.index];
      if (item && item.index === 9 && item.value >= 1 && data.section === "body") {
        data.cell.styles.fillColor = TONE_COLOR.destructive.fill;
        data.cell.styles.textColor = TONE_COLOR.destructive.text;
      }
    },
  });
  y = lastTableY(doc) + 9;

  y = drawSectionHeading(doc, input.modelHeading, y, 45);
  y = drawScenarioTables(doc, y, input.tableHeaders, input.scenarioTables);

  drawDisclaimer(doc, input.footer, y);
  save(doc, input, input.filenamePrefix);
}

/**
 * Generates and downloads a self-contained, patient-facing results PDF —
 * same "nothing leaves the device" property as generatePraxisPdf: the file
 * is built and saved entirely client-side, never uploaded anywhere.
 */
export function generateResultsPdf(input: ResultsPdfInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: pdfSafe(input.title) });

  let y = drawHeader(doc, input);
  y = drawTitle(doc, input.title, input.subtitle, y);

  // Plain brand card, no risk tone (this page never shows the patient a risk flag).
  y = drawCallout(doc, input.baselineLabel, `${input.baselineValue} · ${input.severityValue}`, y, {
    fill: COLOR.brandSoft,
    edge: COLOR.primary,
    text: COLOR.brandStrong,
  });

  y = drawSectionHeading(doc, input.scenariosHeading, y, 50);
  y = drawText(doc, input.scenariosBody, y, {
    size: 9,
    color: COLOR.mutedForeground,
    gapAfter: 5,
  });
  y = drawScenarioTables(doc, y, input.tableHeaders, input.scenarioTables);

  y = drawSectionHeading(doc, input.predictorsHeading, y, 45);
  y = drawText(doc, input.predictorsBody, y, {
    size: 9,
    color: COLOR.mutedForeground,
    gapAfter: 3,
  });
  y = drawKeyValueTable(doc, y, input.predictorRows);

  drawDisclaimer(doc, input.footer, y);
  save(doc, input, input.filenamePrefix);
}
