/**
 * AI Employee Voice Mapping
 * Ensures agents with male names use male voices and female names use female voices.
 * Matches the Soshogle landing page voice AI quality - professional, multilingual-ready.
 */

/** ElevenLabs voice IDs - professional, multilingual-capable */
export const AI_EMPLOYEE_VOICE_IDS = {
  /** Female voices - calm, professional (Sarah, Laura, etc.) */
  female: 'EXAVITQu4vr4xnSDxMaL', // Sarah - default female
  /** Male voices - clear, professional (Arnold, Daniel, etc.) */
  male: 'VR6AewLTigWG4xSOukaG', // Arnold - authoritative, clear
} as const;

/** Common male first names - used to pick male voice */
const MALE_NAMES = new Set([
  'Michael', 'David', 'Chris', 'Alex', 'Mark', 'Daniel', 'James', 'Ryan',
  'William', 'Robert', 'John', 'Thomas', 'Matthew', 'Andrew', 'Kevin',
  'Brian', 'Steven', 'Jason', 'Eric', 'Adam', 'Nathan', 'Henry', 'Oliver',
]);

/** Common female first names - used to pick female voice */
const FEMALE_NAMES = new Set([
  'Sarah', 'Jessica', 'Emma', 'Rachel', 'Jennifer', 'Sophie', 'Nicole',
  'Emily', 'Laura', 'Amanda', 'Michelle', 'Stephanie', 'Ashley', 'Megan',
  'Samantha', 'Elizabeth', 'Katherine', 'Christina', 'Rebecca', 'Lauren',
  'Hannah', 'Olivia', 'Isabella', 'Ava', 'Mia', 'Charlotte', 'Amelia',
]);

/**
 * Returns the appropriate voice ID for an AI employee by their display name.
 * Male names → male voice, female names → female voice.
 * Unknown names default to female (Sarah) for backward compatibility.
 */
export function getVoiceIdForEmployeeName(name: string): string {
  const firstName = name.trim().split(/\s+/)[0] || '';
  if (MALE_NAMES.has(firstName)) return AI_EMPLOYEE_VOICE_IDS.male;
  if (FEMALE_NAMES.has(firstName)) return AI_EMPLOYEE_VOICE_IDS.female;
  // Default to female for ambiguous names (e.g. "Jordan", "Taylor")
  return AI_EMPLOYEE_VOICE_IDS.female;
}
