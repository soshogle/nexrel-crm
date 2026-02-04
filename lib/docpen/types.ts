/**
 * AI Docpen - Type Definitions
 */

export type DocpenProfession = 
  | 'GENERAL_PRACTICE'
  | 'DENTIST'
  | 'OPTOMETRIST'
  | 'DERMATOLOGIST'
  | 'CARDIOLOGIST'
  | 'PSYCHIATRIST'
  | 'PEDIATRICIAN'
  | 'ORTHOPEDIC'
  | 'PHYSIOTHERAPIST'
  | 'CHIROPRACTOR'
  | 'CUSTOM';

export type DocpenSessionStatus = 
  | 'RECORDING'
  | 'PROCESSING'
  | 'REVIEW_PENDING'
  | 'SIGNED'
  | 'ARCHIVED'
  | 'CANCELLED';

export type DocpenSpeakerRole = 'PRACTITIONER' | 'PATIENT' | 'OTHER';

export type DocpenSOAPType = 
  | 'STANDARD_SOAP'
  | 'FOCUSED_SOAP'
  | 'PROGRESS_NOTE'
  | 'CONSULTATION_NOTE'
  | 'PROCEDURE_NOTE'
  | 'FOLLOW_UP_NOTE';

export interface DocpenSession {
  id: string;
  userId: string;
  leadId?: string;
  patientName?: string;
  profession: DocpenProfession;
  customProfession?: string;
  status: DocpenSessionStatus;
  sessionDate: Date;
  sessionDuration?: number;
  chiefComplaint?: string;
  consultantName?: string;
  audioStoragePath?: string;
  audioRetained: boolean;
  retentionExpiry?: Date;
  transcriptionComplete: boolean;
  soapNoteGenerated: boolean;
  reviewedAt?: Date;
  signedAt?: Date;
  signedBy?: string;
  signatureHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocpenTranscription {
  id: string;
  sessionId: string;
  speakerRole: DocpenSpeakerRole;
  speakerLabel?: string;
  content: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  isEdited: boolean;
  originalContent?: string;
}

export interface DocpenSOAPNote {
  id: string;
  sessionId: string;
  version: number;
  soapType?: DocpenSOAPType;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  additionalNotes?: string;
  aiModel?: string;
  processingTime?: number;
  promptVersion?: string;
  isCurrentVersion: boolean;
  editedByUser: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocpenAssistantQuery {
  id: string;
  sessionId: string;
  queryType: 'patient_history' | 'drug_interaction' | 'medical_lookup' | 'feedback';
  queryText: string;
  responseText?: string;
  triggerMethod?: 'voice' | 'text' | 'wake_word';
  timestamp?: number;
  sourcesCited?: any[];
  createdAt: Date;
}

// Client request/response types

export interface CreateSessionRequest {
  leadId?: string;
  patientName?: string;
  profession: DocpenProfession;
  customProfession?: string;
  chiefComplaint?: string;
  consultantName: string;
}

export interface ProcessTranscriptionRequest {
  sessionId: string;
  audioBuffer?: ArrayBuffer;
  audioUrl?: string;
  practitionerName?: string;
}

export interface GenerateSOAPRequest {
  sessionId: string;
  regenerate?: boolean;
}

export interface AssistantQueryRequest {
  sessionId: string;
  queryType: 'patient_history' | 'drug_interaction' | 'medical_lookup' | 'feedback';
  queryText: string;
  triggerMethod?: 'voice' | 'text' | 'wake_word';
  timestamp?: number;
}

export interface SignSessionRequest {
  sessionId: string;
  signedBy: string;
  attestation: string; // Legal attestation checkbox text
}

// UI component props

export interface DocpenRecorderProps {
  sessionId?: string;
  profession: DocpenProfession;
  onSessionCreated?: (session: DocpenSession) => void;
  onRecordingComplete?: (segments: DocpenTranscription[]) => void;
}

export interface DocpenSOAPEditorProps {
  sessionId: string;
  soapNote: DocpenSOAPNote;
  readOnly?: boolean;
  onUpdate?: (note: DocpenSOAPNote) => void;
  onSign?: () => void;
}

export interface DocpenAssistantProps {
  sessionId: string;
  isActive: boolean;
  onQuery?: (query: DocpenAssistantQuery) => void;
}
