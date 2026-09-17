import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfRow = { label: string; value: string; tone?: "warning" | "destructive" | undefined };
export type PdfPhqItem = { index: number; label: string; value: number };
export type PdfScenarioRow = { label: string; endpoint: string; range: string; delta: string };
export type PdfScenarioTable = { heading: string; rows: PdfScenarioRow[] };

export type PraxisPdfInput = {
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
  tableHeaders: { careOption: string; endpoint: string; delta: string };
  scenarioTables: PdfScenarioTable[];
  footer: string;
};

export type ResultsPdfInput = {
  filenamePrefix: string;
  title: string;
  subtitle: string;
  baselineLabel: string;
  baselineValue: string;
  severityValue: string;
  scenariosHeading: string;
  scenariosBody: string;
  modelHeading: string;
  tableHeaders: { careOption: string; endpoint: string; delta: string };
  scenarioTables: PdfScenarioTable[];
  predictorsHeading: string;
  predictorsBody: string;
  predictorRows: PdfRow[];
  footer: string;
};

const TONE_COLOR: Record<
  "warning" | "destructive",
  { fill: [number, number, number]; text: [number, number, number] }
> = {
  warning: { fill: [254, 243, 199], text: [146, 64, 14] },
  destructive: { fill: [254, 226, 226], text: [153, 27, 27] },
};

const MARGIN = 15;
const PAGE_WIDTH = 210; // A4 mm

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

/** Generates and downloads a self-contained clinician summary PDF — no browser print dialog, no page chrome. */
export function generatePraxisPdf(input: PraxisPdfInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: pdfSafe(input.title) });
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(pdfSafe(input.title), MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const subtitleLines = doc.splitTextToSize(pdfSafe(input.subtitle), contentWidth);
  doc.text(subtitleLines, MARGIN, y);
  y += subtitleLines.length * 4 + 4;

  // Risk banner — always prominent, colored when tone is warning/destructive.
  const tone = input.riskTone ? TONE_COLOR[input.riskTone] : null;
  const bannerText = pdfSafe(`${input.riskLabel}: ${input.riskValue}`);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const bannerLines = doc.splitTextToSize(bannerText, contentWidth - 8);
  const bannerHeight = bannerLines.length * 5 + 6;
  if (tone) {
    doc.setFillColor(...tone.fill);
    doc.roundedRect(MARGIN, y, contentWidth, bannerHeight, 2, 2, "F");
    doc.setTextColor(...tone.text);
  } else {
    doc.setDrawColor(210, 210, 210);
    doc.roundedRect(MARGIN, y, contentWidth, bannerHeight, 2, 2, "S");
    doc.setTextColor(20, 20, 20);
  }
  doc.text(bannerLines, MARGIN + 4, y + 5.5);
  y += bannerHeight + 8;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(pdfSafe(input.summaryHeading), MARGIN, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    body: input.rows.map((r) => [pdfSafe(r.label), pdfSafe(r.value)]),
    theme: "plain",
    styles: { fontSize: 9, cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 } },
    columnStyles: { 0: { textColor: [100, 100, 100] }, 1: { fontStyle: "bold", halign: "right" } },
    didParseCell: (data) => {
      const row = input.rows[data.row.index];
      if (row?.tone && data.column.index === 1) {
        const t = TONE_COLOR[row.tone];
        data.cell.styles.fillColor = t.fill;
        data.cell.styles.textColor = t.text;
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  if (y > 250) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(pdfSafe(input.phq9Heading), MARGIN, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["#", "", "/3"]],
    body: input.phq9Items.map((it) => [String(it.index), pdfSafe(it.label), String(it.value)]),
    theme: "striped",
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [245, 245, 245], textColor: [90, 90, 90], fontStyle: "normal" },
    columnStyles: { 0: { cellWidth: 8 }, 2: { cellWidth: 12, halign: "right" } },
    didParseCell: (data) => {
      const item = input.phq9Items[data.row.index];
      if (item && item.index === 9 && item.value >= 1 && data.section === "body") {
        data.cell.styles.fillColor = [254, 226, 226];
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  for (const table of input.scenarioTables) {
    if (y > 240) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(pdfSafe(`${input.modelHeading} — ${table.heading}`), MARGIN, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [
        [
          pdfSafe(input.tableHeaders.careOption),
          pdfSafe(input.tableHeaders.endpoint),
          pdfSafe(input.tableHeaders.delta),
        ],
      ],
      body: table.rows.map((r) => [
        pdfSafe(r.label),
        `${r.endpoint}  (${r.range})`,
        pdfSafe(r.delta),
      ]),
      theme: "striped",
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [245, 245, 245], textColor: [90, 90, 90], fontStyle: "normal" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (y > 260) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  const footerLines = doc.splitTextToSize(pdfSafe(input.footer), contentWidth);
  doc.text(footerLines, MARGIN, y);

  doc.save(`${input.filenamePrefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates and downloads a self-contained, patient-facing results PDF —
 * same "nothing leaves the device" property as generatePraxisPdf: the file
 * is built and saved entirely client-side, never uploaded anywhere.
 */
export function generateResultsPdf(input: ResultsPdfInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: pdfSafe(input.title) });
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(pdfSafe(input.title), MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const subtitleLines = doc.splitTextToSize(pdfSafe(input.subtitle), contentWidth);
  doc.text(subtitleLines, MARGIN, y);
  y += subtitleLines.length * 4 + 4;

  // Baseline banner — plain, no risk tone (this page never shows the patient a risk flag).
  const bannerText = pdfSafe(
    `${input.baselineLabel}: ${input.baselineValue} — ${input.severityValue}`,
  );
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const bannerLines = doc.splitTextToSize(bannerText, contentWidth - 8);
  const bannerHeight = bannerLines.length * 5 + 6;
  doc.setDrawColor(210, 210, 210);
  doc.roundedRect(MARGIN, y, contentWidth, bannerHeight, 2, 2, "S");
  doc.setTextColor(20, 20, 20);
  doc.text(bannerLines, MARGIN + 4, y + 5.5);
  y += bannerHeight + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(pdfSafe(input.scenariosHeading), MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  const scenariosBodyLines = doc.splitTextToSize(pdfSafe(input.scenariosBody), contentWidth);
  doc.text(scenariosBodyLines, MARGIN, y);
  y += scenariosBodyLines.length * 3.6 + 3;

  for (const table of input.scenarioTables) {
    if (y > 240) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    doc.text(pdfSafe(`${input.modelHeading} — ${table.heading}`), MARGIN, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [
        [
          pdfSafe(input.tableHeaders.careOption),
          pdfSafe(input.tableHeaders.endpoint),
          pdfSafe(input.tableHeaders.delta),
        ],
      ],
      body: table.rows.map((r) => [
        pdfSafe(r.label),
        `${r.endpoint}  (${r.range})`,
        pdfSafe(r.delta),
      ]),
      theme: "striped",
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [245, 245, 245], textColor: [90, 90, 90], fontStyle: "normal" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (y > 250) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(pdfSafe(input.predictorsHeading), MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  const predictorsBodyLines = doc.splitTextToSize(pdfSafe(input.predictorsBody), contentWidth);
  doc.text(predictorsBodyLines, MARGIN, y);
  y += predictorsBodyLines.length * 3.6 + 3;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    body: input.predictorRows.map((r) => [pdfSafe(r.label), pdfSafe(r.value)]),
    theme: "plain",
    styles: { fontSize: 9, cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 } },
    columnStyles: { 0: { textColor: [100, 100, 100] }, 1: { fontStyle: "bold", halign: "right" } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  if (y > 260) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  const footerLines = doc.splitTextToSize(pdfSafe(input.footer), contentWidth);
  doc.text(footerLines, MARGIN, y);

  doc.save(`${input.filenamePrefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
