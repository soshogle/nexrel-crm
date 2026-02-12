/**
 * Report export utilities - Excel, PDF, Word
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
} from 'docx';

export interface ReportForExport {
  id: string;
  title: string;
  reportType: string;
  period?: string | null;
  createdAt: string;
  content: {
    summary?: string;
    metrics?: Record<string, number | string>;
    charts?: Array<{ title: string; data?: Array<{ name: string; value: number }> }>;
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_+/g, '_').slice(0, 80);
}

export function exportReportToExcel(report: ReportForExport): void {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  if (report.content.summary) {
    const summaryData = [['Report', report.title], ['Type', report.reportType], ['Period', report.period || 'All time'], ['Created', report.createdAt], ['Summary', report.content.summary]];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  }

  // Metrics sheet
  if (report.content.metrics && Object.keys(report.content.metrics).length > 0) {
    const metricsData = [
      ['Metric', 'Value'],
      ...Object.entries(report.content.metrics).map(([k, v]) => [k.replace(/_/g, ' '), typeof v === 'number' ? v : String(v)]),
    ];
    const wsMetrics = XLSX.utils.aoa_to_sheet(metricsData);
    XLSX.utils.book_append_sheet(wb, wsMetrics, 'Metrics');
  }

  // Charts as sheets
  report.content.charts?.forEach((chart, i) => {
    if (chart.data && chart.data.length > 0) {
      const chartData = [[chart.title || `Chart ${i + 1}`], ['Name', 'Value'], ...chart.data.map((d) => [d.name, d.value])];
      const ws = XLSX.utils.aoa_to_sheet(chartData);
      const sheetName = `Chart_${i + 1}`.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  });

  const filename = `${sanitizeFilename(report.title)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportReportToPDF(report: ReportForExport): void {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text(report.title, 20, y);
  y += 12;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${report.reportType} • ${report.period || 'All time'} • ${new Date(report.createdAt).toLocaleDateString()}`, 20, y);
  y += 12;

  doc.setTextColor(0, 0, 0);

  if (report.content.summary) {
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(report.content.summary, 170);
    doc.text(lines, 20, y);
    y += lines.length * 6 + 10;
  }

  if (report.content.metrics && Object.keys(report.content.metrics).length > 0) {
    doc.setFontSize(12);
    doc.text('Metrics', 20, y);
    y += 8;

    doc.setFontSize(10);
    Object.entries(report.content.metrics).forEach(([key, value]) => {
      doc.text(`${key.replace(/_/g, ' ')}: ${typeof value === 'number' ? value.toLocaleString() : value}`, 25, y);
      y += 6;
    });
    y += 10;
  }

  report.content.charts?.forEach((chart) => {
    if (chart.data && chart.data.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(chart.title || 'Chart', 20, y);
      y += 8;

      doc.setFontSize(9);
      chart.data.forEach((row) => {
        doc.text(`${row.name}: ${row.value.toLocaleString()}`, 25, y);
        y += 5;
      });
      y += 8;
    }
  });

  const filename = `${sanitizeFilename(report.title)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export async function exportReportToWord(report: ReportForExport): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: report.title, bold: true, size: 32 })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `${report.reportType} • ${report.period || 'All time'} • ${new Date(report.createdAt).toLocaleDateString()}`, italics: true, size: 22 })],
      spacing: { after: 400 },
    })
  );

  if (report.content.summary) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: report.content.summary, size: 24 })],
        spacing: { after: 400 },
      })
    );
  }

  if (report.content.metrics && Object.keys(report.content.metrics).length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Metrics', bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );

    const metricRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true })] })] }),
        ],
      }),
      ...Object.entries(report.content.metrics).map(
        ([key, value]) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: key.replace(/_/g, ' ') })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: typeof value === 'number' ? value.toLocaleString() : String(value) })] })] }),
            ],
          })
      ),
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: metricRows,
        borders: {
          top: { style: BorderStyle.SINGLE },
          bottom: { style: BorderStyle.SINGLE },
          left: { style: BorderStyle.SINGLE },
          right: { style: BorderStyle.SINGLE },
        },
      })
    );
  }

  report.content.charts?.forEach((chart) => {
    if (chart.data && chart.data.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: chart.title || 'Chart', bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      const chartRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Name', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true })] })] }),
          ],
        }),
        ...chart.data.map(
          (row) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.name })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.value.toLocaleString() })] })] }),
              ],
            })
        ),
      ];

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: chartRows,
          borders: {
            top: { style: BorderStyle.SINGLE },
            bottom: { style: BorderStyle.SINGLE },
            left: { style: BorderStyle.SINGLE },
            right: { style: BorderStyle.SINGLE },
          },
        })
      );
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(report.title)}_${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
