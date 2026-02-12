/**
 * EHR Field Mappings for DOM injection
 * Fetched by extension from API; fallback embedded in extension
 */

export type EHRType =
  | 'on_prem'
  | 'dentrix'
  | 'dentrix_ascend'
  | 'eaglesoft'
  | 'opendental'
  | 'dentitek'
  | 'orthonovo'
  | 'progident'
  | 'athena'
  | 'epic'
  | 'simplepractice'
  | 'tebra'
  | 'generic';

/** Read selectors for extracting patient/calendar data from DOM */
export interface EHRReadMapping {
  patientName?: string[];
  patientEmail?: string[];
  patientPhone?: string[];
  patientDob?: string[];
  patientAddress?: string[];
  patientId?: string[];
  priorNotes?: string[];
  lastVisitDate?: string[];
  /** Calendar */
  appointmentRows?: string[];
  appointmentTime?: string[];
  appointmentPatient?: string[];
  appointmentProvider?: string[];
}

export interface EHRMapping {
  ehrType: EHRType;
  displayName: string;
  /** SOAP/note field selectors - supports multiple per field for flexibility */
  fields: {
    subjective?: string[];
    objective?: string[];
    assessment?: string[];
    plan?: string[];
    /** Single combined note (e.g. Athena) */
    note?: string[];
    additionalNotes?: string[];
  };
  /** Read selectors for extracting patient/calendar data */
  read?: EHRReadMapping;
  /** URL patterns for detection */
  urlPatterns: string[];
}

export const EHR_MAPPINGS: EHRMapping[] = [
  {
    ehrType: 'dentrix',
    displayName: 'Dentrix',
    urlPatterns: ['dentrix.com', '*.dentrix.com'],
    read: {
      patientName: ['#PatientName', '.patient-name', '[data-field="patientName"]', 'input[name*="patientName" i]'],
      patientEmail: ['#PatientEmail', '.patient-email', '[data-field="email"]', 'input[name*="email" i]', 'input[type="email"]'],
      patientPhone: ['#PatientPhone', '.patient-phone', '[data-field="phone"]', 'input[name*="phone" i]', 'input[name*="Phone"]'],
      patientDob: ['#PatientDob', '.patient-dob', '[data-field="dob"]', 'input[name*="dob" i]', 'input[name*="birth" i]'],
      patientAddress: ['#PatientAddress', '.patient-address', '[data-field="address"]', 'textarea[name*="address" i]'],
      patientId: ['#PatientId', '[data-patient-id]', '.patient-id'],
      priorNotes: ['#PriorNotes', '.prior-notes', '.treatment-history', '.progress-notes'],
      appointmentRows: ['.appointment-row', '.schedule-item', '.appointment-card', '[data-appointment]'],
    },
    fields: {
      subjective: ['#ClinicalNote-Subjective', '.clinical-note-subjective', '[data-field="subjective"]'],
      objective: ['#ClinicalNote-Objective', '.clinical-note-objective', '[data-field="objective"]'],
      assessment: ['#ClinicalNote-Assessment', '.clinical-note-assessment', '[data-field="assessment"]'],
      plan: ['#ClinicalNote-Plan', '.clinical-note-plan', '[data-field="plan"]'],
    },
  },
  {
    ehrType: 'dentrix_ascend',
    displayName: 'Dentrix Ascend',
    urlPatterns: ['ascend.dentrix.com'],
    fields: {
      subjective: ['[data-testid="subjective"]', '.soap-subjective', 'textarea[name*="subjective"]'],
      objective: ['[data-testid="objective"]', '.soap-objective', 'textarea[name*="objective"]'],
      assessment: ['[data-testid="assessment"]', '.soap-assessment', 'textarea[name*="assessment"]'],
      plan: ['[data-testid="plan"]', '.soap-plan', 'textarea[name*="plan"]'],
    },
  },
  {
    ehrType: 'eaglesoft',
    displayName: 'Eaglesoft',
    urlPatterns: ['eaglesoft.net', '*.eaglesoft.net'],
    fields: {
      subjective: ['#Subjective', '.progress-note-subjective', 'textarea[id*="Subjective"]'],
      objective: ['#Objective', '.progress-note-objective', 'textarea[id*="Objective"]'],
      assessment: ['#Assessment', '.progress-note-assessment', 'textarea[id*="Assessment"]'],
      plan: ['#Plan', '.progress-note-plan', 'textarea[id*="Plan"]'],
    },
  },
  {
    ehrType: 'opendental',
    displayName: 'Open Dental',
    urlPatterns: ['opendental.com', '*.opendental.com'],
    fields: {
      subjective: ['textarea.progress-note', '[data-field="subjective"]', '#Subjective'],
      objective: ['[data-field="objective"]', '#Objective'],
      assessment: ['[data-field="assessment"]', '#Assessment'],
      plan: ['[data-field="plan"]', '#Plan'],
      note: ['textarea.progress-note', '.note-text'],
    },
  },
  {
    ehrType: 'dentitek',
    displayName: 'Dentitek',
    urlPatterns: ['dentitek.ca', '*.dentitek.ca', 'dentitek.info', 'dentitek.net', '*.dentitek.net'],
    read: {
      patientName: ['.patient-name', '#nom', '[data-field="patientName"]', 'input[name*="nom" i]'],
      patientEmail: ['.patient-email', '#courriel', '[data-field="email"]', 'input[name*="email" i]', 'input[type="email"]'],
      patientPhone: ['.patient-phone', '#telephone', '[data-field="phone"]', 'input[name*="phone" i]', 'input[name*="tel" i]'],
      patientDob: ['.patient-dob', '#dateNaissance', '[data-field="dob"]', 'input[name*="naissance" i]'],
      patientAddress: ['.patient-address', '#adresse', '[data-field="address"]', 'textarea[name*="adresse" i]'],
      appointmentRows: ['.rendez-vous', '.appointment', '.schedule-item', '[data-appointment]'],
    },
    fields: {
      subjective: ['#ClinicalNote-Subjective', '.clinical-note-subjective', '[data-field="subjective"]', 'textarea[name*="subjective" i]'],
      objective: ['#ClinicalNote-Objective', '.clinical-note-objective', '[data-field="objective"]', 'textarea[name*="objective" i]'],
      assessment: ['#ClinicalNote-Assessment', '.clinical-note-assessment', '[data-field="assessment"]', 'textarea[name*="assessment" i]'],
      plan: ['#ClinicalNote-Plan', '.clinical-note-plan', '[data-field="plan"]', 'textarea[name*="plan" i]'],
      note: ['textarea.clinical-note', 'textarea.progress-note', '.note-editor textarea'],
    },
  },
  {
    ehrType: 'orthonovo',
    displayName: 'OrthoNovo',
    urlPatterns: ['novologik.com', '*.novologik.com'],
    fields: {
      subjective: ['#Subjective', '.progress-note-subjective', 'textarea[name*="subjective" i]', '[data-field="subjective"]'],
      objective: ['#Objective', '.progress-note-objective', 'textarea[name*="objective" i]', '[data-field="objective"]'],
      assessment: ['#Assessment', '.progress-note-assessment', 'textarea[name*="assessment" i]', '[data-field="assessment"]'],
      plan: ['#Plan', '.progress-note-plan', 'textarea[name*="plan" i]', '[data-field="plan"]'],
      note: ['textarea.clinical-note', 'textarea.progress-note', '.note-editor textarea', '.novolet-editor'],
    },
  },
  {
    ehrType: 'progident',
    displayName: 'Progident',
    urlPatterns: ['progident.com', '*.progident.com'],
    fields: {
      subjective: ['textarea.progress-note', '[data-field="subjective"]', '#Subjective'],
      objective: ['[data-field="objective"]', '#Objective'],
      assessment: ['[data-field="assessment"]', '#Assessment'],
      plan: ['[data-field="plan"]', '#Plan'],
      note: ['textarea.progress-note', '.note-text'],
    },
  },
  {
    ehrType: 'athena',
    displayName: 'Athenahealth',
    urlPatterns: ['athenahealth.com', '*.athenahealth.com'],
    fields: {
      note: ['.am-encounter-note-body', '.encounter-note', '[data-cy="note-body"]', 'textarea.encounter-note'],
    },
  },
  {
    ehrType: 'epic',
    displayName: 'Epic',
    urlPatterns: ['epic.com', '*.epic.com', '*.epic.epic'],
    fields: {
      subjective: ['[data-testid="subjective"]', '.note-subjective', 'textarea[name*="subjective"]'],
      objective: ['[data-testid="objective"]', '.note-objective', 'textarea[name*="objective"]'],
      assessment: ['[data-testid="assessment"]', '.note-assessment', 'textarea[name*="assessment"]'],
      plan: ['[data-testid="plan"]', '.note-plan', 'textarea[name*="plan"]'],
      note: ['.clinical-note-editor', 'iframe[id*="note"]'],
    },
  },
  {
    ehrType: 'simplepractice',
    displayName: 'SimplePractice',
    urlPatterns: ['simplepractice.com', '*.simplepractice.com'],
    fields: {
      note: ['.note-editor', 'textarea.clinical-note', '[data-cy="note-content"]'],
    },
  },
  {
    ehrType: 'tebra',
    displayName: 'Tebra',
    urlPatterns: ['tebra.com', '*.tebra.com', 'patientfusion.com'],
    fields: {
      note: ['.clinical-note', 'textarea.note-body', '[data-field="progress-note"]'],
    },
  },
  {
    ehrType: 'generic',
    displayName: 'Generic EHR',
    urlPatterns: ['*'],
    read: {
      patientName: ['input[name*="name" i]', '[id*="name" i]', '[data-field="name"]', '.patient-name'],
      patientEmail: ['input[type="email"]', 'input[name*="email" i]', '[id*="email" i]', '[data-field="email"]'],
      patientPhone: ['input[type="tel"]', 'input[name*="phone" i]', 'input[name*="tel" i]', '[id*="phone" i]', '[data-field="phone"]'],
      patientDob: ['input[name*="dob" i]', 'input[name*="birth" i]', '[data-field="dob"]'],
      patientAddress: ['textarea[name*="address" i]', 'input[name*="address" i]', '[data-field="address"]'],
      appointmentRows: ['.appointment', '.schedule-item', '[data-appointment]', 'tr.appointment'],
    },
    fields: {
      subjective: ['textarea[name*="subjective" i]', '[id*="subjective" i]', '[data-field="subjective"]'],
      objective: ['textarea[name*="objective" i]', '[id*="objective" i]', '[data-field="objective"]'],
      assessment: ['textarea[name*="assessment" i]', '[id*="assessment" i]', '[data-field="assessment"]'],
      plan: ['textarea[name*="plan" i]', '[id*="plan" i]', '[data-field="plan"]'],
      note: ['textarea.clinical-note', 'textarea.progress-note', '.note-editor textarea'],
    },
  },
];

export function detectEHRFromUrl(url: string): EHRMapping | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const mapping of EHR_MAPPINGS) {
      if (mapping.ehrType === 'generic') continue;
      for (const pattern of mapping.urlPatterns) {
        const regexStr = pattern
          .replace(/\*\./g, '(.*\\.)?')
          .replace(/\*/g, '.*')
          .replace(/\./g, '\\.');
        if (new RegExp(`^${regexStr}$`).test(host)) {
          return mapping;
        }
      }
    }
    return EHR_MAPPINGS.find((m) => m.ehrType === 'generic') || null;
  } catch {
    return null;
  }
}
