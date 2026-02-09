-- Mark Missing Migrations as Applied
-- Run this in Neon SQL Editor to sync migration state

-- Check current migration state
SELECT * FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20260208000000_add_crm_voice_agent_id',
  '20260208120000_add_crm_voice_agent_id'
)
ORDER BY started_at DESC;

-- If they don't exist, insert them as applied
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
)
SELECT 
  gen_random_uuid()::text,
  '',
  NOW(),
  '20260208000000_add_crm_voice_agent_id',
  NULL,
  NULL,
  NOW(),
  1
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" 
  WHERE migration_name = '20260208000000_add_crm_voice_agent_id'
);

INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
)
SELECT 
  gen_random_uuid()::text,
  '',
  NOW(),
  '20260208120000_add_crm_voice_agent_id',
  NULL,
  NULL,
  NOW(),
  1
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" 
  WHERE migration_name = '20260208120000_add_crm_voice_agent_id'
);

-- Verify they're marked as applied
SELECT migration_name, finished_at, applied_steps_count 
FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20260208000000_add_crm_voice_agent_id',
  '20260208120000_add_crm_voice_agent_id'
)
ORDER BY started_at DESC;
