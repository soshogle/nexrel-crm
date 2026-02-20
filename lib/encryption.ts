import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    'fallback-dev-key-32-chars-long!!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: `iv:authTag:ciphertext` (all hex-encoded).
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a string produced by {@link encrypt}.
 * Supports legacy formats (base64, AES-256-CBC iv:ciphertext) for backward
 * compatibility — values are transparently decrypted but should be
 * re-encrypted on next write.
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');

  // AES-256-GCM format: iv:authTag:ciphertext (3 parts, each hex)
  if (parts.length === 3 && parts[0].length === 32) {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(parts[2], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Legacy AES-256-CBC format: iv:ciphertext (2 parts, hex)
  if (parts.length === 2 && parts[0].length === 32) {
    try {
      const legacyKey =
        process.env.ENCRYPTION_KEY ||
        process.env.ENCRYPTION_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        'fallback-dev-key-32-chars-long!!';
      const keyBuf = Buffer.from(legacyKey.slice(0, 32).padEnd(32, '0'));
      const iv = Buffer.from(parts[0], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
      let decrypted = decipher.update(parts[1], 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // Fall through to base64
    }
  }

  // Legacy base64 fallback
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString('utf-8');
    if (decoded && decoded !== encrypted) return decoded;
  } catch {
    // not base64
  }

  // Legacy deprecated createCipher (passphrase-based) — can't reliably
  // decrypt without original key; return as-is.
  return encrypted;
}

/** Encrypt a JSON-serializable object and return the ciphertext string. */
export function encryptJSON(data: unknown): string {
  return encrypt(JSON.stringify(data));
}

/** Decrypt a ciphertext string and parse as JSON. */
export function decryptJSON<T = unknown>(encrypted: string): T {
  return JSON.parse(decrypt(encrypted));
}
