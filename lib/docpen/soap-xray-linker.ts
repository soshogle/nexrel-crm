/**
 * DICOM + Notes Auto-Link
 * Parses tooth numbers from SOAP text and matches to DentalXRay.teethIncluded
 */

// Universal numbering system: 1-32
const TOOTH_NUMBER_REGEX = /\b(?:tooth|#|teeth|tooth\s*#?)\s*(\d{1,2}(?:\s*[-–]\s*\d{1,2})?)\b|\b(\d{1,2}(?:\s*[-–]\s*\d{1,2})?)\s*(?:tooth|teeth)\b|\b(?:universal|tooth)\s*(\d{1,2})\b/gi;

/**
 * Extract tooth numbers from SOAP text (Universal 1-32)
 */
export function parseToothNumbers(text: string): number[] {
  const teeth = new Set<number>();
  let m: RegExpExecArray | null;
  const re = new RegExp(TOOTH_NUMBER_REGEX.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    const raw = (m[1] || m[2] || m[3] || '').replace(/\s*[-–]\s*/g, '-');
    if (raw.includes('-')) {
      const [a, b] = raw.split('-').map((n) => parseInt(n.trim(), 10));
      if (!isNaN(a) && !isNaN(b) && a >= 1 && a <= 32 && b >= 1 && b <= 32) {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        for (let i = lo; i <= hi; i++) teeth.add(i);
      }
    } else {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 1 && n <= 32) teeth.add(n);
    }
  }
  return Array.from(teeth).sort((a, b) => a - b);
}

/**
 * Check if an X-ray's teethIncluded overlaps with parsed teeth
 */
function xrayMatchesTeeth(
  teethIncluded: string[],
  parsedTeeth: number[]
): boolean {
  const xraySet = new Set(teethIncluded.map((t) => parseInt(t, 10)).filter((n) => !isNaN(n) && n >= 1 && n <= 32));
  return parsedTeeth.some((t) => xraySet.has(t));
}

export interface XrayForLink {
  id: string;
  teethIncluded: string[];
}

/**
 * Return X-ray IDs that match the tooth numbers in the SOAP text
 */
export function findMatchingXrays(
  soapText: string,
  xrays: XrayForLink[]
): string[] {
  const teeth = parseToothNumbers(soapText);
  if (teeth.length === 0) return [];
  return xrays
    .filter((x) => xrayMatchesTeeth(x.teethIncluded, teeth))
    .map((x) => x.id);
}
