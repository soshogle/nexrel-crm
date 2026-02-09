# ✅ Twilio Failover Migration Complete!

## What Just Happened

✅ **Migration Applied Successfully**
- All new tables created: `TwilioAccount`, `TwilioFailoverEvent`, `TwilioHealthCheck`, `TwilioBackupPhoneNumber`
- `VoiceAgent` table updated with new columns
- Prisma Client regenerated

---

## 🚀 Next Steps to Activate the System

### Step 1: Set Environment Variables (Required)

Add these to **Vercel Dashboard** → **Settings** → **Environment Variables**:

```bash
# Encryption key for storing Twilio auth tokens securely
ENCRYPTION_KEY=your-random-32-character-key-here

# Secret for cron job authentication
CRON_SECRET=your-random-secret-here
```

**How to generate secure keys:**
```bash
# Run this in your terminal to generate random keys:
openssl rand -hex 32  # Use this for ENCRYPTION_KEY
openssl rand -hex 32  # Use this for CRON_SECRET
```

**⚠️ Important:** 
- Use **different** random values for each
- Keep them secret (don't share)
- Set them in **Vercel** (not just `.env`)

---

### Step 2: Configure Cron Job (Required)

Add the cron job to `vercel.json`:

```json
{
  "version": 2,
  "buildCommand": "NODE_OPTIONS='--max-old-space-size=8192' npx next build",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/twilio-health-monitor",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

This runs health checks **every 2 minutes**.

---

### Step 3: Add Twilio Accounts (Required)

1. **Go to SuperAdmin Dashboard:**
   - Visit: `/platform-admin` (or your SuperAdmin URL)
   - Click the **"Account Management"** tab

2. **Add Primary Twilio Account:**
   - Click **"Add Twilio Account"**
   - Fill in:
     - **Name:** "Primary" (or your account name)
     - **Account SID:** Your Twilio Account SID (starts with `AC...`)
     - **Auth Token:** Your Twilio Auth Token
     - **Is Primary:** ✅ Check this box
   - Click **"Create Account"**

3. **Add Backup Twilio Account:**
   - Click **"Add Twilio Account"** again
   - Fill in:
     - **Name:** "Backup" (or your backup account name)
     - **Account SID:** Your backup Twilio Account SID
     - **Auth Token:** Your backup Twilio Auth Token
     - **Is Primary:** ❌ Leave unchecked
   - Click **"Create Account"**

---

### Step 4: Pre-Purchase Backup Phone Numbers (Required)

**In your Backup Twilio Account:**

1. Go to **Twilio Console** → **Phone Numbers** → **Buy a Number**
2. Purchase **one phone number per active voice agent**
   - Example: If you have 3 active voice agents, buy 3 backup numbers
3. **Important:** These numbers should be in the **backup Twilio account** (not primary)

**After purchasing:**
- The system will automatically assign them when failover happens
- You can also manually assign them via the SuperAdmin dashboard

---

### Step 5: Link Voice Agents to Twilio Account (Required)

**In SuperAdmin Dashboard** → **"Twilio Monitoring"** tab:

1. View your voice agents
2. Each agent should be linked to your **Primary** Twilio account
3. If agents aren't linked, you may need to update them manually (or they'll be linked automatically on next health check)

---

### Step 6: Test the System (Optional but Recommended)

1. **Manual Health Check:**
   - Go to **SuperAdmin Dashboard** → **"Twilio Monitoring"** tab
   - Click **"Run Health Check"** for your primary account
   - Verify all checks pass ✅

2. **Test Failover Detection:**
   - Go to **SuperAdmin Dashboard** → **"Failover Events"** tab
   - Click **"Detect Failover"** (if available)
   - This simulates checking if failover is needed

---

## 📊 How It Works

### Automatic Monitoring
- **Every 2 minutes:** System checks Twilio account health
- **Monitors:** Only active voice agents with ElevenLabs integration
- **Detects:** Account failures, phone number issues, API problems

### Failover Triggers

**Critical Failures** (Immediate Failover):
- Account hacked/suspended
- Account API completely down
- **Action:** Failover happens immediately, no approval needed

**Degraded Failures** (10-Minute Approval Window):
- Multiple agents failing (≥2 agents or ≥50% failure rate)
- Phone numbers not receiving calls
- **Action:** 
  - System starts 10-minute approval window
  - Continuously tests during window
  - If issue resolves → cancels failover
  - If still failing after 10 minutes → auto-approves and executes

**Manual Failover:**
- Admin can manually trigger failover from dashboard
- Immediate execution

---

## 🎯 What Happens During Failover

1. **System detects failure** (automatic or manual)
2. **Selects backup account** (first available non-primary account)
3. **Assigns backup phone numbers** (one per affected agent)
4. **Updates ElevenLabs** (reconfigures agents with new numbers)
5. **Updates Twilio webhooks** (points to your app's API)
6. **Sends notifications** (email to SuperAdmins)
7. **Logs event** (visible in "Failover Events" tab)

---

## 🔄 Rollback

If you need to switch back to primary account:

1. Go to **SuperAdmin Dashboard** → **"Failover Events"** tab
2. Find the completed failover event
3. Click **"Rollback"**
4. System will switch agents back to primary account

---

## 📧 Notifications

The system sends email notifications to SuperAdmins when:
- Failover is detected (approval window started)
- Failover is completed
- Failover is cancelled (issue resolved)

**Note:** Email notifications require SendGrid configuration (if not already set up).

---

## ✅ Checklist

- [ ] Set `ENCRYPTION_KEY` in Vercel
- [ ] Set `CRON_SECRET` in Vercel
- [ ] Add cron job to `vercel.json`
- [ ] Add Primary Twilio Account via dashboard
- [ ] Add Backup Twilio Account via dashboard
- [ ] Pre-purchase backup phone numbers (one per active agent)
- [ ] Run test health check
- [ ] Deploy to Vercel (to activate cron job)

---

## 🆘 Troubleshooting

**Cron job not running?**
- Check `vercel.json` has the cron configuration
- Verify `CRON_SECRET` is set in Vercel
- Check Vercel logs for cron execution

**Health checks failing?**
- Verify Twilio Account SID and Auth Token are correct
- Check that agents have `elevenLabsAgentId` set
- Ensure agents are `ACTIVE` status

**Failover not triggering?**
- System only monitors agents with `status = 'ACTIVE'` AND `elevenLabsAgentId IS NOT NULL`
- Requires ≥2 agents failing OR ≥50% failure rate
- Check "Twilio Monitoring" tab for detailed health status

---

## 📚 Dashboard Tabs

1. **Twilio Monitoring** - View account health, agent status, run manual checks
2. **Failover Events** - View history, approve/cancel pending failovers, rollback
3. **Account Management** - Add/edit Twilio accounts, set primary account

---

**🎉 You're all set!** The system is now ready to automatically protect your Twilio accounts.
