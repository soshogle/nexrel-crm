# Run Migration From Your Local Terminal

## ✅ Easiest Method: Copy & Paste in Neon

**This is the safest and simplest method:**

1. **Open the file:** `APPLY_TWILIO_FAILOVER_MIGRATION.sql`
2. **Select all** (Cmd+A) and **copy** (Cmd+C)
3. **Go to:** https://console.neon.tech
4. **Click:** "SQL Editor" (left sidebar)
5. **Paste** the SQL and click **"Run"**
6. **Done!** ✅

---

## 🔧 Alternative: Try Prisma from Your Terminal

If you want to try automated migration, run this in **your local terminal** (not in Cursor):

```bash
cd /Users/cyclerun/Desktop/nexrel-crm

# Try with direct connection (not pooler)
export DATABASE_URL="postgresql://neondb_owner:npg_MFCmq14EUpng@ep-noisy-meadow-ahhrsg4f.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Try the migration
npx prisma migrate deploy
```

**Note:** Remove `-pooler` from the hostname (use direct connection instead of pooler).

---

## 🎯 Recommended: Manual Copy/Paste

The manual method is:
- ✅ **Safest** (you see exactly what runs)
- ✅ **Fastest** (2 minutes)
- ✅ **No technical knowledge needed** (just copy/paste)
- ✅ **Works 100% of the time** (bypasses all connection issues)

**File to copy from:** `APPLY_TWILIO_FAILOVER_MIGRATION.sql`
