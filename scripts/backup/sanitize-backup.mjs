import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sensitiveFields = [
  'access_token',
  'refresh_token',
  'id_token',
  'password',
  'apiKey',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'accountSid',
  'authToken',
  'twilioAccountSid',
  'twilioAuthToken',
  'sid',
  'credentials'
];

function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  } else if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = value ? '[REDACTED]' : value;
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  return obj;
}

const today = new Date().toISOString().split('T')[0];
const backupDir = path.join(__dirname, '../../backups', today);

console.log(`Sanitizing backup files in ${backupDir}...`);

const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(backupDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const sanitized = sanitizeObject(data);
  fs.writeFileSync(filePath, JSON.stringify(sanitized, null, 2));
  console.log(`✓ Sanitized ${file}`);
}

console.log('Sanitization complete!');
