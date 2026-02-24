/**
 * Parse X-ray AI findings text into structured toothData for odontogram
 */

import type { ToothData } from './odontogram-import';

const CONDITION_PATTERNS: { regex: RegExp; condition: string }[] = [
  { regex: /\b(implant|implants)\b/gi, condition: 'implant' },
  { regex: /\b(root canal|root canal treatment)\b/gi, condition: 'root_canal' },
  { regex: /\b(missing tooth|tooth missing|extracted)\b/gi, condition: 'missing' },
  { regex: /\b(extraction|extract)\b/gi, condition: 'extraction' },
  { regex: /\b(caries|carious|cavity|cavities|decay|decayed)\b/gi, condition: 'caries' },
  { regex: /\b(crown|crowned|full coverage)\b/gi, condition: 'crown' },
  { regex: /\b(filling|restoration|restored|amalgam|composite)\b/gi, condition: 'filling' },
];

/**
 * Extract tooth numbers from text - handles "tooth 14", "tooth #14", "teeth 14, 15", "14, 15, 16"
 */
function extractToothNumbers(text: string): number[] {
  const numbers = new Set<number>();

  // "tooth 14" or "tooth #14" or "tooth number 14"
  const toothPattern = /tooth\s*(?:#|number\s*)?(\d{1,2})\b/gi;
  let m;
  while ((m = toothPattern.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 32) numbers.add(n);
  }

  // "teeth 14, 15, 16" or "teeth 14-16"
  const teethPattern = /teeth\s+(\d{1,2}(?:\s*[,-]\s*\d{1,2})*)/gi;
  while ((m = teethPattern.exec(text)) !== null) {
    const part = m[1];
    part.split(/[,-]/).forEach((s) => {
      const n = parseInt(s.trim(), 10);
      if (n >= 1 && n <= 32) numbers.add(n);
    });
  }

  // "14 and 15" or "14, 15" in context of dental findings (near condition words)
  const contextPattern = /\b(\d{1,2})\s*(?:and|,|&)\s*(\d{1,2})\b/gi;
  while ((m = contextPattern.exec(text)) !== null) {
    [m[1], m[2]].forEach((s) => {
      const n = parseInt(s, 10);
      if (n >= 1 && n <= 32) numbers.add(n);
    });
  }

  return Array.from(numbers);
}

/**
 * Parse X-ray findings text into toothData. Merges with existing data.
 */
export function parseXrayFindingsToToothData(
  findingsText: string,
  existingToothData?: ToothData | null
): ToothData {
  const result: ToothData = existingToothData ? { ...existingToothData } : {};

  if (!findingsText || typeof findingsText !== 'string') return result;

  const text = findingsText.toLowerCase();
  const sentences = findingsText.split(/[.!?\n]/).filter((s) => s.trim().length > 0);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    for (const { regex, condition } of CONDITION_PATTERNS) {
      const regexCopy = new RegExp(regex.source, regex.flags);
      if (!regexCopy.test(lower)) continue;

      const toothNums = extractToothNumbers(sentence);
      if (toothNums.length === 0) {
        // Condition mentioned but no tooth - try nearby numbers
        const numMatch = sentence.match(/\b(\d{1,2})\b/);
        if (numMatch) {
          const n = parseInt(numMatch[1], 10);
          if (n >= 1 && n <= 32) toothNums.push(n);
        }
      }

      for (const toothNum of toothNums) {
        const key = String(toothNum);
        const treatment = condition === 'caries' ? 'Crown' : condition === 'filling' ? 'Filling' : condition.charAt(0).toUpperCase() + condition.slice(1).replace('_', ' ');
        result[key] = {
          ...result[key],
          condition: condition as any,
          treatment,
          completed: condition === 'implant' || condition === 'root_canal',
          date: new Date().toISOString().split('T')[0],
        };
      }
    }
  }

  return result;
}
