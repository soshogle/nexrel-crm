/**
 * Field-level encryption helpers for sensitive DB columns (API keys, tokens, secrets).
 *
 * Uses the same AES-256-GCM implementation as lib/encryption.ts.
 * Transparently handles unencrypted legacy values — returns them as-is on decrypt.
 *
 * Usage:
 *   import { encryptField, decryptField } from '@/lib/crypto-fields';
 *
 *   // Before saving to DB:
 *   const record = await prisma.elevenLabsConfig.create({
 *     data: { ...data, apiKey: encryptField(data.apiKey) }
 *   });
 *
 *   // Before returning to client / using in an API call:
 *   const apiKey = decryptField(record.apiKey);
 */

import { encrypt, decrypt } from '@/lib/encryption';

const ENCRYPTED_PREFIX = 'enc:';

/**
 * Encrypt a sensitive string field before database storage.
 * Prepends 'enc:' so we can distinguish encrypted from legacy plaintext values.
 * Returns null/undefined as-is.
 */
export function encryptField(value: string | null | undefined): string | null | undefined {
    if (value == null || value === '') return value;
    // Don't double-encrypt
    if (value.startsWith(ENCRYPTED_PREFIX)) return value;
    return ENCRYPTED_PREFIX + encrypt(value);
}

/**
 * Decrypt a field that was encrypted with encryptField.
 * If the value doesn't have the 'enc:' prefix it's treated as legacy plaintext
 * and returned as-is for backward compatibility.
 */
export function decryptField(value: string | null | undefined): string | null | undefined {
    if (value == null || value === '') return value;
    if (!value.startsWith(ENCRYPTED_PREFIX)) {
        // Legacy plaintext — return as-is (will be re-encrypted on next write)
        return value;
    }
    try {
        return decrypt(value.slice(ENCRYPTED_PREFIX.length));
    } catch {
        // If decryption fails (wrong key, corrupted), return empty string
        // rather than crashing the whole request
        console.error('[crypto-fields] Failed to decrypt field — check ENCRYPTION_SECRET');
        return '';
    }
}

/**
 * Check whether a field value is already encrypted.
 */
export function isEncrypted(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypt all matching keys in an object (useful for encrypting a record before upsert).
 *
 * Usage:
 *   const encrypted = encryptFields(body, ['apiKey', 'authToken', 'webhookSecret']);
 */
export function encryptFields<T extends Record<string, unknown>>(
    record: T,
    fields: (keyof T)[],
): T {
    const result = { ...record };
    for (const field of fields) {
        const val = result[field];
        if (typeof val === 'string') {
            (result as Record<string, unknown>)[field as string] = encryptField(val);
        }
    }
    return result;
}

/**
 * Decrypt all matching keys in an object (useful for decrypting a record after DB read).
 */
export function decryptFields<T extends Record<string, unknown>>(
    record: T,
    fields: (keyof T)[],
): T {
    const result = { ...record };
    for (const field of fields) {
        const val = result[field];
        if (typeof val === 'string') {
            (result as Record<string, unknown>)[field as string] = decryptField(val);
        }
    }
    return result;
}
