-- Check Voice Agents in Neon Database
-- Run this directly in Neon SQL Editor

-- 1. Check if VoiceAgent table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'VoiceAgent'
) AS table_exists;

-- 2. Count total voice agents
SELECT COUNT(*) AS total_agents FROM "VoiceAgent";

-- 3. List all voice agents with their configuration
SELECT 
  id,
  name,
  status,
  type,
  "twilioPhoneNumber",
  "elevenLabsAgentId",
  "elevenLabsPhoneNumberId",
  "userId",
  "createdAt",
  "updatedAt"
FROM "VoiceAgent"
ORDER BY "createdAt" DESC;

-- 4. Check agents with phone numbers but missing ElevenLabs IDs
SELECT 
  id,
  name,
  status,
  "twilioPhoneNumber",
  "elevenLabsAgentId"
FROM "VoiceAgent"
WHERE "twilioPhoneNumber" IS NOT NULL
  AND "elevenLabsAgentId" IS NULL;

-- 5. Check agents that should be active but aren't
SELECT 
  id,
  name,
  status,
  "twilioPhoneNumber"
FROM "VoiceAgent"
WHERE "twilioPhoneNumber" IS NOT NULL
  AND status != 'ACTIVE';

-- 6. Check for phone number format issues
SELECT 
  id,
  name,
  "twilioPhoneNumber"
FROM "VoiceAgent"
WHERE "twilioPhoneNumber" IS NOT NULL
  AND (
    "twilioPhoneNumber" NOT LIKE '+%' 
    OR "twilioPhoneNumber" LIKE '% %'
    OR "twilioPhoneNumber" LIKE '%-%'
    OR "twilioPhoneNumber" LIKE '%(%'
  );
