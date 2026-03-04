/**
 * Parser for JLR (JLR.ca) Monthly Report on the Real Estate Market in Quebec.
 * Extracts province-level, CMA-level, and administrative region stats.
 *
 * PDF structure: Each data page has region (Province/CMA/Administrative region),
 * then MEDIAN PRICE and SALES VOLUME tables for:
 *   - Single-family homes
 *   - Condominiums
 *   - Properties with 2 to 5 dwellings
 */

import fs from 'fs';
import path from 'path';

export interface JlrStatRow {
  region: string;
  municipality: string;
  propertyType: string;
  periodYear: number;
  periodMonth: number;
  periodType: 'MONTHLY';
  medianSalePrice?: number;
  numberOfSales?: number;
  sales12Months?: number;
  sourceFile: string;
}

function parseNum(s: string): number | null {
  if (!s || typeof s !== 'string') return null;
  const n = parseInt(s.replace(/\s/g, '').replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}

function extractPeriod(filename: string): { year: number; month: number } | null {
  const m = filename.match(/(\d{4})-(\d{2})/);
  if (!m) return null;
  return { year: parseInt(m[1]), month: parseInt(m[2]) };
}

async function extractText(filePath: string): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const text = content.items.map((i: { str?: string }) => i.str || '').join(' ');
    pages.push(text);
  }
  return pages;
}

/**
 * Parse JLR Monthly Report PDF.
 */
export async function parseJlrMonthlyReport(filePath: string): Promise<JlrStatRow[]> {
  const filename = path.basename(filePath);
  const period = extractPeriod(filename);
  if (!period) {
    console.warn(`[jlr] Cannot determine period from filename: ${filename}`);
    return [];
  }

  const pages = await extractText(filePath);
  const results: JlrStatRow[] = [];

  for (let i = 0; i < pages.length; i++) {
    const text = pages[i];

    // Detect region: Province Québec, Census Metropolitan Area Montréal, Administrative region Bas-Saint-Laurent
    let region: string | null = null;
    const provinceMatch = text.match(/Province\s+([A-Za-zÀ-ÿ\s\-]+?)\s+Monthly/i);
    const cmaMatch = text.match(/Census Metropolitan Area\s+([A-Za-zÀ-ÿ\s\-]+?)\s+Monthly/i);
    const adminMatch = text.match(/Administrative region\s+([A-Za-zÀ-ÿ\s\-]+?)\s+Monthly/i);

    if (provinceMatch) {
      region = 'Province Québec';
    } else if (cmaMatch) {
      region = `CMA ${cmaMatch[1].trim()}`;
    } else if (adminMatch) {
      region = adminMatch[1].trim();
    }
    if (!region) continue;

    const municipality = region.startsWith('CMA ') ? region.replace('CMA ', '') : region;

    // MEDIAN PRICE block: "Single-family homes 452 000 $ 8 % 11 % 455 000 $"
    const medianBlock = text.match(/MEDIAN PRICE[\s\S]{0,800}?(?=SALES VOLUME|NUMBER OF BAD|$)/i);
    if (medianBlock) {
      const block = medianBlock[0];
      const sfMatch = block.match(/Single-family homes\s+([\d\s]+)\s*\$?\s*(\d+)\s*%\s*(\d+)\s*%\s*([\d\s]+)\s*\$?/);
      const condoMatch = block.match(/Condominiums\s+([\d\s]+)\s*\$?\s*(\d+)\s*%\s*(\d+)\s*%\s*([\d\s]+)\s*\$?/);
      const p25Match = block.match(/Properties with 2 to 5 dwellings\s+([\d\s]+)\s*\$?\s*(\d+)\s*%\s*(\d+)\s*%\s*([\d\s]+)\s*\$?/);

      for (const [label, match] of [
        ['Single Family', sfMatch],
        ['Condo/Apt.', condoMatch],
        ['Properties with 2 to 5 dwellings', p25Match],
      ] as const) {
        if (match) {
          const median = parseNum(match[1]);
          if (median && median > 10000 && median < 10000000) {
            results.push({
              region,
              municipality,
              propertyType: label,
              periodYear: period.year,
              periodMonth: period.month,
              periodType: 'MONTHLY',
              medianSalePrice: median,
              sourceFile: filename,
            });
          }
        }
      }
    }

    // SALES VOLUME block: "Single-family homes 7 019 17 % 77 640 17 %"
    const salesBlock = text.match(/SALES VOLUME[\s\S]{0,600}?(?=NUMBER OF BAD|$)/i);
    if (salesBlock) {
      const block = salesBlock[0];
      const sfMatch = block.match(/Single-family homes\s+([\d\s]+)\s+(-?\d+)\s*%\s+([\d\s]+)\s+(-?\d+)\s*%/);
      const condoMatch = block.match(/Condominiums\s+([\d\s]+)\s+(-?\d+)\s*%\s+([\d\s]+)\s+(-?\d+)\s*%/);
      const p25Match = block.match(/Properties with 2 to 5 dwellings\s+([\d\s]+)\s+(-?\d+)\s*%\s+([\d\s]+)\s+(-?\d+)\s*%/);

      for (const [label, match] of [
        ['Single Family', sfMatch],
        ['Condo/Apt.', condoMatch],
        ['Properties with 2 to 5 dwellings', p25Match],
      ] as const) {
        if (match) {
          const sales = parseNum(match[1]);
          const sales12 = parseNum(match[3]);
          if (sales !== null && sales >= 0) {
            const existing = results.find(
              r => r.region === region && r.propertyType === label && r.periodYear === period.year && r.periodMonth === period.month
            );
            if (existing) {
              existing.numberOfSales = sales;
              existing.sales12Months = sales12 ?? undefined;
            } else {
              results.push({
                region: region!,
                municipality,
                propertyType: label,
                periodYear: period.year,
                periodMonth: period.month,
                periodType: 'MONTHLY',
                numberOfSales: sales,
                sales12Months: sales12 ?? undefined,
                sourceFile: filename,
              });
            }
          }
        }
      }
    }
  }

  return results;
}
