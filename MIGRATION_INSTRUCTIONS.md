# Database Migration Instructions

## What This Migration Does

This migration adds the missing database schema elements:
- ✅ `dateOfBirth` column to the `Lead` table (nullable DateTime)
- ✅ `FeedbackCollection` table (if it doesn't exist)

## How It Works

The migration will run automatically when you deploy to Vercel. The build process will:
1. Run `prisma db push` to sync the schema
2. Generate the Prisma client
3. Build your application

## Option 1: Automatic (Recommended)

**Just push your code to GitHub and Vercel will handle it!**

The migration will run automatically on the next deployment because we updated `vercel.json` to include `prisma db push` in the build command.

## Option 2: Manual Trigger (If Needed)

If you want to run the migration manually before deploying, you can:

1. **Visit this URL** (while logged into your app):
   ```
   https://your-app.vercel.app/api/admin/run-migration
   ```
   
   Or use curl:
   ```bash
   curl -X POST https://your-app.vercel.app/api/admin/run-migration \
     -H "Cookie: your-session-cookie"
   ```

2. The endpoint will:
   - Check that you're logged in
   - Run the migration
   - Return success/error status

## What Happens After Migration

Once the migration completes:
- ✅ All queries will work without schema errors
- ✅ AI Brain will show real numbers
- ✅ Contacts page will work correctly
- ✅ No more "column doesn't exist" errors

## Safety

- ✅ The migration only **adds** columns/tables - it won't delete anything
- ✅ Your existing data is safe
- ✅ The migration is idempotent (safe to run multiple times)

## Troubleshooting

If the migration fails:
1. Check Vercel build logs for errors
2. Ensure `DATABASE_URL` is set in Vercel environment variables
3. Check that your Neon database is accessible from Vercel

## Need Help?

The migration will run automatically on your next deployment. Just push the code and Vercel will handle it!
