/**
 * Parser for Centris QPAREB monthly statistical PDFs.
 * Extracts municipality-level market stats by property type.
 *
 * PDF structure (per page):
 *   [Region Name]
 *   [Column Headers — two year sections side by side]
 *   [Municipality Name]  [total: New Active Sales Volume DOM × 2 years]
 *   [Property Type]      [detail: 9 cols prev-year + 9 cols curr-year]
 *     [Sub-type]          [same 18-col format]
 *   ...footer...
 *
 * Column order (validated empirically):
 *   Previous year (first 9): New, Active, Sales, Volume, Avg, Median, DOM, vsList%, vsAssess%
 *   Current year  (last  9): New, Volume, Sales, Avg, Median, DOM, vsList%, vsAssess%, Active
 */

import fs from 'fs';
import path from 'path';

export interface CentrisStatRow {
  region: string;
  municipality: string;
  neighborhood?: string;
  propertyType?: string;
  periodYear: number;
  periodMonth: number;
  periodType: 'MONTHLY' | 'CUMULATIVE';
  newListings?: number;
  activeListings?: number;
  numberOfSales?: number;
  volumeOfSales?: number;
  avgSalePrice?: number;
  medianSalePrice?: number;
  dom?: number;
  saleVsListPct?: number;
  saleVsAssessPct?: number;
  sourceFile: string;
}

const REGIONS = [
  'Abitibi-Témiscamingue', 'Bas-Saint-Laurent', 'Capitale-Nationale',
  'Centre-du-Québec', 'Chaudière-Appalaches', 'Côte-Nord', 'Estrie',
  'Gaspésie–Îles-de-la-Madeleine', 'Lanaudière', 'Laurentides', 'Laval',
  'Mauricie', 'Montérégie', 'Montréal', 'Nord-du-Québec', 'Outaouais',
  'Saguenay–Lac-Saint-Jean',
];

const MAIN_PROPERTY_TYPES = new Set([
  'Single Family', 'Condo/Apt.', 'Revenue Prop.', 'Farm/Hobby Farm',
  'Land/Lot', 'Com./Ind./Block',
]);

const ALL_PROPERTY_TYPES = new Set([
  ...MAIN_PROPERTY_TYPES,
  'Bungalow', 'Two or more storey', 'Split-level', 'One-and-a-half-storey',
  'Mobile home', 'House', 'Duplex', 'Triplex', 'Quadruplex', 'Quintuplex',
  'Hobby farm', 'Farm', 'Land', 'Lot', 'Commercial', 'Industrial',
  'Bulk (block sale)', 'Other',
  'Apartment', 'Loft/Studio', 'Penthouse', 'Townhouse', 'Studio',
]);

const SKIP_LINES = new Set([
  'Centris ® Statistics by Municipality/Borough and Type of Property',
  'Source: Centris® – For the exclusive use of real estate broker members',
  'Distribution of sales by price range',
  'Units less than',
  'Units between',
]);

function parseNumber(s: string): number {
  return Number(s.replace(/,/g, '').replace(/\s/g, ''));
}

function extractPeriod(filename: string): { year: number; month: number; type: 'MONTHLY' | 'CUMULATIVE' } | null {
  const match = filename.match(/(\d{4})(\d{2})([NO])/);
  if (!match) return null;
  return {
    year: parseInt(match[1]),
    month: parseInt(match[2]),
    type: match[3] === 'N' ? 'MONTHLY' : 'CUMULATIVE',
  };
}

function isRegionLine(line: string): string | null {
  const trimmed = line.trim();
  return REGIONS.find(r => trimmed === r) ?? null;
}

function isPropertyType(label: string): boolean {
  return ALL_PROPERTY_TYPES.has(label);
}

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('Page:')) return true;
  if (trimmed.startsWith('Revised:')) return true;
  if (trimmed.startsWith('--') && trimmed.endsWith('--')) return true;
  if (trimmed.startsWith('*')) return true;
  for (const skip of SKIP_LINES) {
    if (trimmed.startsWith(skip)) return true;
  }
  if (/^(Active|Listings|Janurary|January|February|March|April|May|June|July|August|September|October|November|December|Number|Volume|Sales|Average|Median|No\.|Days|vs|List\.|Asses\.|Sale Price|New|DOM)\s*$/i.test(trimmed)) {
    return true;
  }
  if (/^(Sale Price\*|Listings|DOM)\s/.test(trimmed) && trimmed.split('\t').length <= 2) return true;
  if (/^(Janurary|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i.test(trimmed)) return true;
  if (/^Units\s+(less|between|higher|more)/i.test(trimmed)) return true;
  if (/^\$[\d,]+/i.test(trimmed)) return true;
  if (/^\d+$/.test(trimmed) && parseInt(trimmed) < 100) return true;
  return false;
}

function isInvalidMunicipality(label: string): boolean {
  if (/^[\d,.\s-]+$/.test(label)) return true;
  if (/^(Sale Price|Listings|DOM|Active|New|Number|Volume|Average|Median|No\.|Days|vs|List\.|Asses\.|Sale)/i.test(label)) return true;
  if (/^(Units\s|Distribution)/i.test(label)) return true;
  if (/^\$/.test(label)) return true;
  if (/^(Janurary|January|February|March|April|May|June|July|August|September|October|November|December)\s/i.test(label)) return true;
  if (/calculation|assessment|ratio|municipality|borough|property|exclusive use|broker members|Centris/i.test(label)) return true;
  if (/^Statistics by/i.test(label)) return true;
  if (/^-\d/.test(label)) return true;
  if (/^[(<>=]/.test(label)) return true;
  if (/^Difference\b/i.test(label)) return true;
  if (/^\d+\s*%/.test(label)) return true;
  if (/^Unknown$/i.test(label)) return true;
  return false;
}

function parseDetailRow(
  values: number[],
  periodInfo: { year: number; month: number; type: 'MONTHLY' | 'CUMULATIVE' },
  region: string,
  municipality: string,
  neighborhood: string | undefined,
  propertyType: string,
  sourceFile: string,
): CentrisStatRow[] {
  const rows: CentrisStatRow[] = [];

  if (values.length >= 18) {
    // Previous year (first 9): New, Active, Sales, Volume, Avg, Median, DOM, vsList%, vsAssess%
    const prevYear = periodInfo.year - 1;
    const [pNew, pActive, pSales, pVol, pAvg, pMed, pDom, pVsList, pVsAssess] = values;

    if (pSales > 0 || pNew > 0 || pActive > 0) {
      rows.push({
        region, municipality, neighborhood, propertyType,
        periodYear: prevYear,
        periodMonth: periodInfo.month,
        periodType: periodInfo.type,
        newListings: pNew, activeListings: pActive,
        numberOfSales: pSales, volumeOfSales: pVol,
        avgSalePrice: pAvg, medianSalePrice: pMed,
        dom: pDom, saleVsListPct: pVsList, saleVsAssessPct: pVsAssess,
        sourceFile,
      });
    }

    // Current year (last 9): New, Volume, Sales, Avg, Median, DOM, vsList%, vsAssess%, Active
    const cVals = values.slice(9, 18);
    const [cNew, cVol, cSales, cAvg, cMed, cDom, cVsList, cVsAssess, cActive] = cVals;

    // Validate: if Volume > 10000, use current-year order (New, Vol, Sales, Avg, Med, DOM, vsList, vsAssess, Active)
    // Otherwise use same order as prev year (New, Active, Sales, Vol, Avg, Med, DOM, vsList, vsAssess)
    const volSalesValid = cSales > 0 && cAvg > 0 && Math.abs(cVol / cSales - cAvg) < cAvg * 0.1;

    if (volSalesValid || cVol > 10000) {
      if (cSales > 0 || cNew > 0 || cActive > 0) {
        rows.push({
          region, municipality, neighborhood, propertyType,
          periodYear: periodInfo.year,
          periodMonth: periodInfo.month,
          periodType: periodInfo.type,
          newListings: cNew, activeListings: cActive,
          numberOfSales: cSales, volumeOfSales: cVol,
          avgSalePrice: cAvg, medianSalePrice: cMed,
          dom: cDom, saleVsListPct: cVsList, saleVsAssessPct: cVsAssess,
          sourceFile,
        });
      }
    } else {
      // Fallback: same column order as prev year
      const [fNew, fActive, fSales, fVol, fAvg, fMed, fDom, fVsList, fVsAssess] = cVals;
      if (fSales > 0 || fNew > 0 || fActive > 0) {
        rows.push({
          region, municipality, neighborhood, propertyType,
          periodYear: periodInfo.year,
          periodMonth: periodInfo.month,
          periodType: periodInfo.type,
          newListings: fNew, activeListings: fActive,
          numberOfSales: fSales, volumeOfSales: fVol,
          avgSalePrice: fAvg, medianSalePrice: fMed,
          dom: fDom, saleVsListPct: fVsList, saleVsAssessPct: fVsAssess,
          sourceFile,
        });
      }
    }
  } else if (values.length >= 10) {
    // Municipality/category total (5+5): New, Active, Sales, Volume, DOM
    const prevYear = periodInfo.year - 1;
    const [pNew, pActive, pSales, pVol, pDom] = values;
    if (pSales > 0 || pNew > 0 || pActive > 0) {
      rows.push({
        region, municipality, neighborhood, propertyType,
        periodYear: prevYear, periodMonth: periodInfo.month,
        periodType: periodInfo.type,
        newListings: pNew, activeListings: pActive,
        numberOfSales: pSales, volumeOfSales: pVol, dom: pDom,
        sourceFile,
      });
    }

    const cOff = values.length >= 11 ? 5 : 5;
    const cVals = values.slice(cOff);
    if (cVals.length >= 5) {
      const [cNew, cActive, cSales, cVol, cDom] = cVals;
      if (cSales > 0 || cNew > 0 || cActive > 0) {
        rows.push({
          region, municipality, neighborhood, propertyType,
          periodYear: periodInfo.year, periodMonth: periodInfo.month,
          periodType: periodInfo.type,
          newListings: cNew, activeListings: cActive,
          numberOfSales: cSales, volumeOfSales: cVol, dom: cDom,
          sourceFile,
        });
      }
    }
  }

  return rows;
}

async function extractTextLines(filePath: string): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const allLines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    let lastY: number | null = null;
    let currentLine = '';

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = (item as { transform: number[] }).transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        allLines.push(currentLine);
        currentLine = '';
      }
      currentLine += (currentLine ? '\t' : '') + item.str;
      lastY = y;
    }
    if (currentLine) allLines.push(currentLine);
  }

  return allLines;
}

/**
 * Parse a single Centris QPAREB PDF and return structured market stats.
 */
export async function parseCentrisPdf(filePath: string): Promise<CentrisStatRow[]> {
  const filename = path.basename(filePath);
  const periodInfo = extractPeriod(filename);

  if (!periodInfo) {
    console.warn(`Cannot determine period from filename: ${filename}`);
    return [];
  }

  const lines = await extractTextLines(filePath);

  const results: CentrisStatRow[] = [];
  let currentRegion = '';
  let currentMunicipality = '';
  let currentNeighborhood: string | undefined;
  let insideDataSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (shouldSkipLine(trimmed)) continue;

    // Check for region header
    const regionMatch = isRegionLine(trimmed);
    if (regionMatch) {
      currentRegion = regionMatch;
      insideDataSection = false;
      continue;
    }

    if (!currentRegion) continue;

    // Extract numbers from the line
    const parts = trimmed.split(/\t+/);
    const label = parts[0]?.trim() || '';
    const numericParts = parts.slice(1).map(p => p.trim()).filter(p => p.length > 0);
    const numbers = numericParts.map(p => parseNumber(p)).filter(n => !isNaN(n));

    // If label matches a property type and has data
    if (isPropertyType(label) && numbers.length >= 8) {
      insideDataSection = true;
      const parsed = parseDetailRow(
        numbers, periodInfo, currentRegion, currentMunicipality,
        currentNeighborhood, label, filename
      );
      results.push(...parsed);
      continue;
    }

    // Check if this is a municipality/neighborhood name with summary data
    if (numbers.length >= 8 && !isPropertyType(label) && label.length > 1
        && !label.startsWith('$') && !isInvalidMunicipality(label)) {
      insideDataSection = true;
      // Lines ending with "area" indicate a neighborhood
      if (/\barea$/i.test(label)) {
        currentNeighborhood = label.replace(/\s*area$/i, '').trim();
      } else {
        currentMunicipality = label;
        currentNeighborhood = undefined;
      }

      // Municipality/neighborhood total row
      const parsed = parseDetailRow(
        numbers, periodInfo, currentRegion, currentMunicipality,
        currentNeighborhood, 'All Types', filename
      );
      results.push(...parsed);
      continue;
    }

    // If we have a label with no numbers that looks like a municipality name
    if (numbers.length === 0 && label.length > 1 && !shouldSkipLine(label) && !isPropertyType(label) && !isInvalidMunicipality(label)) {
      if (/\barea$/i.test(label)) {
        currentNeighborhood = label.replace(/\s*area$/i, '').trim();
      } else if (insideDataSection || /^[A-Z]/.test(label)) {
        currentMunicipality = label;
        currentNeighborhood = undefined;
      }
    }
  }

  return results;
}

/**
 * Parse all Centris PDFs in a directory.
 */
export async function parseAllCentrisPdfs(dirPath: string): Promise<CentrisStatRow[]> {
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.pdf') && f.includes('STATS_MUNGENRE'))
    .sort();

  const allResults: CentrisStatRow[] = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    console.log(`Parsing ${file}...`);
    try {
      const rows = await parseCentrisPdf(filePath);
      allResults.push(...rows);
      console.log(`  → ${rows.length} stat rows extracted`);
    } catch (err) {
      console.error(`  Error parsing ${file}:`, err);
    }
  }

  return allResults;
}
