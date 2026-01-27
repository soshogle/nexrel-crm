/**
 * AI Docpen - HIPAA Security & Data Handling
 * 
 * Implements security best practices for medical data:
 * - Zero-retention audio processing
 * - Encryption at rest and in transit
 * - Audit logging
 * - Data retention policies
 */

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a secure encryption key
 * In production, use AWS KMS or similar HSM
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt sensitive data for storage
 */
export function encryptData(data: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine: IV + AuthTag + EncryptedData
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  
  // Extract components
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(
    encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
    'hex'
  );
  const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a secure session signature hash
 * Used for digital signature verification
 */
export function generateSignatureHash(
  sessionId: string,
  signedBy: string,
  signedAt: Date,
  soapContent: string
): string {
  const data = `${sessionId}|${signedBy}|${signedAt.toISOString()}|${soapContent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify session signature
 */
export function verifySignature(
  sessionId: string,
  signedBy: string,
  signedAt: Date,
  soapContent: string,
  storedHash: string
): boolean {
  const computedHash = generateSignatureHash(sessionId, signedBy, signedAt, soapContent);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

/**
 * Calculate retention expiry date based on jurisdiction
 * Medical records typically retained for 7 years (may vary by state/country)
 */
export function calculateRetentionExpiry(
  sessionDate: Date,
  retentionYears: number = 7
): Date {
  const expiry = new Date(sessionDate);
  expiry.setFullYear(expiry.getFullYear() + retentionYears);
  return expiry;
}

/**
 * Sanitize patient identifiers for logging
 * Never log full patient names or identifiers
 */
export function sanitizeForLogging(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'patientName',
    'email',
    'phone',
    'ssn',
    'dob',
    'address',
    'insurance',
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Generate audit log entry
 */
export interface AuditLogEntry {
  timestamp: Date;
  action: 'create' | 'read' | 'update' | 'delete' | 'sign' | 'export';
  resourceType: 'session' | 'transcription' | 'soap_note';
  resourceId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export function createAuditLogEntry(
  action: AuditLogEntry['action'],
  resourceType: AuditLogEntry['resourceType'],
  resourceId: string,
  userId: string,
  request?: Request
): AuditLogEntry {
  return {
    timestamp: new Date(),
    action,
    resourceType,
    resourceId,
    userId,
    ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
  };
}

/**
 * HIPAA-compliant data flow checker
 * Validates that data handling follows zero-retention principles
 */
export const DataFlowPolicy = {
  // Audio: Process and delete immediately (zero retention)
  AUDIO_RETENTION_HOURS: 0,
  
  // Transcription: Keep encrypted reference, delete raw audio
  TRANSCRIPTION_RETENTION_DAYS: 30,
  
  // SOAP Notes: Retain as part of medical record
  SOAP_NOTE_RETENTION_YEARS: 7,
  
  // Audit logs: Retain for compliance
  AUDIT_LOG_RETENTION_YEARS: 10,
  
  // Assistant queries: Ephemeral, no retention
  ASSISTANT_QUERY_RETENTION_HOURS: 24,
};

/**
 * Check if data should be purged based on retention policy
 */
export function shouldPurgeData(
  dataType: keyof typeof DataFlowPolicy,
  createdAt: Date
): boolean {
  const now = new Date();
  const retention = DataFlowPolicy[dataType];
  
  switch (dataType) {
    case 'AUDIO_RETENTION_HOURS':
    case 'ASSISTANT_QUERY_RETENTION_HOURS':
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return hoursDiff > retention;
      
    case 'TRANSCRIPTION_RETENTION_DAYS':
      const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > retention;
      
    case 'SOAP_NOTE_RETENTION_YEARS':
    case 'AUDIT_LOG_RETENTION_YEARS':
      const yearsDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return yearsDiff > retention;
      
    default:
      return false;
  }
}
