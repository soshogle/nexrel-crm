# Verify Google Search Console Migration Status

## Quick Check: Run This SQL in Neon SQL Editor

Copy and paste this query into Neon SQL Editor to check if the migration was applied:

```sql
-- Check if Google Search Console columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'Website' 
AND column_name IN (
  'googleSearchConsoleAccessToken',
  'googleSearchConsoleRefreshToken',
  'googleSearchConsoleTokenExpiry',
  'googleSearchConsoleSiteUrl',
  'googleSearchConsoleVerified'
)
ORDER BY column_name;
```

### Expected Results

If migration was applied successfully, you should see **5 rows**:
- ✅ `googleSearchConsoleAccessToken` (TEXT, nullable)
- ✅ `googleSearchConsoleRefreshToken` (TEXT, nullable)
- ✅ `googleSearchConsoleTokenExpiry` (TIMESTAMP, nullable)
- ✅ `googleSearchConsoleSiteUrl` (TEXT, nullable)
- ✅ `googleSearchConsoleVerified` (BOOLEAN, NOT NULL, default: false)

### If Migration Was NOT Applied

If you see **0 rows** or fewer than 5 rows, you need to run the migration SQL:

1. Go to Neon SQL Editor: https://console.neon.tech
2. Open the file: `prisma/migrations/add_google_search_console_columns.sql`
3. Copy ALL the SQL content
4. Paste into Neon SQL Editor
5. Click "Run"

## Test Website Creation

After verifying the columns exist, test if website creation works:

1. Go to: `/dashboard/websites/new`
2. Try creating a new website
3. If you see the error: `The column 'googleSearchConsoleVerified' does not exist`, the migration hasn't been applied yet.

## Migration File Location

The migration SQL is located at:
- `prisma/migrations/add_google_search_console_columns.sql`

This migration adds all 5 Google Search Console columns safely using `IF NOT EXISTS` checks, so it's safe to run multiple times.
