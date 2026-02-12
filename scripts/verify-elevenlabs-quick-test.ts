/**
 * Quick test - run this first to verify the script can execute at all.
 * Usage: npx tsx scripts/verify-elevenlabs-quick-test.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

const root = process.cwd();
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

console.log('1. Script started');
console.log('2. ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'set' : 'MISSING');
console.log('3. DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'MISSING');
console.log('4. Done');
