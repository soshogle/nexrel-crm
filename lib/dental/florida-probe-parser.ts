/**
 * Florida Probe CSV Parser
 *
 * Converts CSV exports from Florida Probe (6-site perio probe system) into
 * the JSON format expected by POST /api/dental/periodontal/import.
 *
 * Florida Probe CSV columns:
 *   ExamDate, PatientID, PatientLastName, PatientFirstName, ToothNumber,
 *   Surface, ProbingDepth, GingivalMargin, CAL, Bleeding, Suppuration,
 *   Plaque, Calculus, Furcation, Mobility, MGJ, Examiner
 *
 * Surfaces: MB, B, DB, ML, L, DL  →  collapsed to our 4-site model (M, B, D, L)
 *   MB + ML → mesial (max PD, OR of BOP)
 *   B       → buccal
 *   DB + DL → distal (max PD, OR of BOP)
 *   L       → lingual
 */

interface FloridaProbeSiteRow {
  toothNumber: number;
  surface: string;
  probingDepth: number;
  gingivalMargin: number;
  cal: number;
  bleeding: boolean;
  suppuration: boolean;
  plaque: boolean;
  calculus: boolean;
  furcation?: number;
  mobility?: number;
  mgj?: number;
}

interface FourSiteMeasurement {
  pd: number;
  bop: boolean;
  recession: number;
  mobility?: number;
}

interface PerioImportPayload {
  userId: string;
  patientName?: string;
  patientId?: string;
  leadId?: string;
  measurements: Record<string, {
    mesial: FourSiteMeasurement;
    buccal: FourSiteMeasurement;
    distal: FourSiteMeasurement;
    lingual: FourSiteMeasurement;
  }>;
  notes?: string;
  chartDate?: string;
  source: string;
}

export function parseFloridaProbeCSV(csvContent: string): FloridaProbeSiteRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim());
  const rows: FloridaProbeSiteRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 10) continue;

    const toothNumber = parseInt(cols[header.indexOf('ToothNumber')], 10);
    if (isNaN(toothNumber) || toothNumber < 1 || toothNumber > 32) continue;

    rows.push({
      toothNumber,
      surface: cols[header.indexOf('Surface')] || '',
      probingDepth: parseInt(cols[header.indexOf('ProbingDepth')], 10) || 0,
      gingivalMargin: parseInt(cols[header.indexOf('GingivalMargin')], 10) || 0,
      cal: parseInt(cols[header.indexOf('CAL')], 10) || 0,
      bleeding: cols[header.indexOf('Bleeding')] === '1' || cols[header.indexOf('Bleeding')]?.toLowerCase() === 'true',
      suppuration: cols[header.indexOf('Suppuration')] === '1' || cols[header.indexOf('Suppuration')]?.toLowerCase() === 'true',
      plaque: cols[header.indexOf('Plaque')] === '1' || cols[header.indexOf('Plaque')]?.toLowerCase() === 'true',
      calculus: cols[header.indexOf('Calculus')] === '1' || cols[header.indexOf('Calculus')]?.toLowerCase() === 'true',
      furcation: cols[header.indexOf('Furcation')] ? parseInt(cols[header.indexOf('Furcation')], 10) || undefined : undefined,
      mobility: cols[header.indexOf('Mobility')] ? parseInt(cols[header.indexOf('Mobility')], 10) || undefined : undefined,
      mgj: cols[header.indexOf('MGJ')] ? parseInt(cols[header.indexOf('MGJ')], 10) || undefined : undefined,
    });
  }

  return rows;
}

/**
 * Collapse 6-site Florida Probe data into our 4-site model
 */
export function collapseTo4Sites(rows: FloridaProbeSiteRow[]): PerioImportPayload['measurements'] {
  const measurements: PerioImportPayload['measurements'] = {};

  const byTooth = new Map<number, FloridaProbeSiteRow[]>();
  for (const row of rows) {
    if (!byTooth.has(row.toothNumber)) byTooth.set(row.toothNumber, []);
    byTooth.get(row.toothNumber)!.push(row);
  }

  for (const [toothNum, siteRows] of byTooth) {
    const find = (surfaces: string[]) =>
      siteRows.filter(r => surfaces.includes(r.surface));

    const collapse = (surfaces: string[]): FourSiteMeasurement => {
      const matching = find(surfaces);
      if (matching.length === 0) return { pd: 0, bop: false, recession: 0 };
      const maxPd = Math.max(...matching.map(r => r.probingDepth));
      const maxRecession = Math.max(...matching.map(r => r.gingivalMargin));
      const anyBop = matching.some(r => r.bleeding);
      const maxMobility = Math.max(...matching.map(r => r.mobility ?? 0));
      return {
        pd: maxPd,
        bop: anyBop,
        recession: maxRecession,
        ...(maxMobility > 0 ? { mobility: maxMobility } : {}),
      };
    };

    measurements[String(toothNum)] = {
      mesial: collapse(['MB', 'ML']),
      buccal: collapse(['B']),
      distal: collapse(['DB', 'DL']),
      lingual: collapse(['L']),
    };
  }

  return measurements;
}

/**
 * Convert full Florida Probe CSV into a ready-to-POST import payload
 */
export function floridaProbeToImportPayload(
  csvContent: string,
  options: {
    userId: string;
    patientName?: string;
    patientId?: string;
    leadId?: string;
  }
): PerioImportPayload {
  const rows = parseFloridaProbeCSV(csvContent);
  const measurements = collapseTo4Sites(rows);

  const firstRow = rows[0];
  const examDate = firstRow
    ? new Date(csvContent.split('\n')[1].split(',')[0]).toISOString()
    : new Date().toISOString();

  return {
    userId: options.userId,
    patientName: options.patientName || (firstRow ? `${firstRow}` : undefined),
    patientId: options.patientId,
    leadId: options.leadId,
    measurements,
    chartDate: examDate,
    source: 'florida_probe',
    notes: `Imported from Florida Probe CSV — ${rows.length} site measurements across ${Object.keys(measurements).length} teeth`,
  };
}
