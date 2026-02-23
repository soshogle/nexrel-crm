/**
 * Docpen - Industry-specific profession/specialty filtering
 *
 * When creating a new consultation session, the Specialty/Profession dropdown
 * should only show specialties relevant to the user's industry, unless the
 * business is a hospital or multi-specialty health clinic where multiple
 * specialists may practice.
 */

import type { Industry } from '@/lib/industry-menu-config';

export type DocpenProfessionValue =
  | 'GENERAL_PRACTICE'
  | 'DENTIST'
  | 'ORTHODONTIC'
  | 'OPTOMETRIST'
  | 'DERMATOLOGIST'
  | 'CARDIOLOGIST'
  | 'PSYCHIATRIST'
  | 'PEDIATRICIAN'
  | 'ORTHOPEDIC'
  | 'PHYSIOTHERAPIST'
  | 'CHIROPRACTOR'
  | 'CUSTOM';

export const ALL_PROFESSIONS: { value: DocpenProfessionValue; label: string }[] = [
  { value: 'GENERAL_PRACTICE', label: 'General Practice / Family Medicine' },
  { value: 'DENTIST', label: 'Dentistry' },
  { value: 'ORTHODONTIC', label: 'Orthodontics' },
  { value: 'OPTOMETRIST', label: 'Optometry' },
  { value: 'DERMATOLOGIST', label: 'Dermatology' },
  { value: 'CARDIOLOGIST', label: 'Cardiology' },
  { value: 'PSYCHIATRIST', label: 'Psychiatry' },
  { value: 'PEDIATRICIAN', label: 'Pediatrics' },
  { value: 'ORTHOPEDIC', label: 'Orthopedics' },
  { value: 'PHYSIOTHERAPIST', label: 'Physical Therapy' },
  { value: 'CHIROPRACTOR', label: 'Chiropractic' },
  { value: 'CUSTOM', label: 'Custom Specialty' },
];

/**
 * Professions that can work in an orthodontist clinic:
 * - Orthodontist (primary)
 * - General dentist (many ortho clinics have both)
 * - Pediatric dentist (orthodontists work extensively with children)
 * - General practice (for referrals)
 */
const ORTHODONTIST_PROFESSIONS: DocpenProfessionValue[] = [
  'ORTHODONTIC',
  'DENTIST',
  'PEDIATRICIAN',
  'GENERAL_PRACTICE',
  'CUSTOM',
];

/**
 * Professions that can work in a dentist clinic:
 * - General dentist, orthodontist, pediatric dentist
 */
const DENTIST_PROFESSIONS: DocpenProfessionValue[] = [
  'DENTIST',
  'ORTHODONTIC',
  'PEDIATRICIAN',
  'GENERAL_PRACTICE',
  'CUSTOM',
];

/**
 * Professions that can work in an optometry practice:
 * - Optometrist, general practice (referrals)
 */
const OPTOMETRIST_PROFESSIONS: DocpenProfessionValue[] = [
  'OPTOMETRIST',
  'GENERAL_PRACTICE',
  'CUSTOM',
];

/**
 * Professions that can work in a medical spa:
 * - Dermatologist, general practice, physical therapy (body treatments)
 */
const MEDICAL_SPA_PROFESSIONS: DocpenProfessionValue[] = [
  'DERMATOLOGIST',
  'GENERAL_PRACTICE',
  'PHYSIOTHERAPIST',
  'CUSTOM',
];

/**
 * Professions for general medical practices:
 * - Family medicine and common specialties that may share a practice
 */
const MEDICAL_PROFESSIONS: DocpenProfessionValue[] = [
  'GENERAL_PRACTICE',
  'DERMATOLOGIST',
  'CARDIOLOGIST',
  'PSYCHIATRIST',
  'PEDIATRICIAN',
  'ORTHOPEDIC',
  'PHYSIOTHERAPIST',
  'CHIROPRACTOR',
  'CUSTOM',
];

/**
 * Hospital and Health Clinic: show ALL specialties (multi-specialty facilities)
 */
const MULTI_SPECIALTY_PROFESSIONS: DocpenProfessionValue[] = ALL_PROFESSIONS.map((p) => p.value);

const INDUSTRY_PROFESSIONS_MAP: Partial<Record<Industry, DocpenProfessionValue[]>> = {
  ORTHODONTIST: ORTHODONTIST_PROFESSIONS,
  DENTIST: DENTIST_PROFESSIONS,
  OPTOMETRIST: OPTOMETRIST_PROFESSIONS,
  MEDICAL_SPA: MEDICAL_SPA_PROFESSIONS,
  MEDICAL: MEDICAL_PROFESSIONS,
  HOSPITAL: MULTI_SPECIALTY_PROFESSIONS,
  HEALTH_CLINIC: MULTI_SPECIALTY_PROFESSIONS,
};

/**
 * Get the list of professions to show in the Docpen session creation dropdown
 * for a given industry. Returns all professions for hospital/health clinic,
 * or industry-relevant subset for single-specialty practices.
 */
export function getProfessionsForIndustry(
  industry: Industry | null | undefined
): { value: DocpenProfessionValue; label: string }[] {
  if (!industry) {
    return ALL_PROFESSIONS;
  }

  const allowedValues = INDUSTRY_PROFESSIONS_MAP[industry];
  if (!allowedValues) {
    return ALL_PROFESSIONS;
  }

  return ALL_PROFESSIONS.filter((p) => allowedValues.includes(p.value));
}
