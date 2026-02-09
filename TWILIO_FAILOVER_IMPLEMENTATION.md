# Twilio Failover System - Implementation Complete ✅

## Overview

A comprehensive automatic failover system for Twilio accounts with:
- **10-minute admin approval window** for degraded failures
- **Immediate failover** for critical failures (account hacked, suspended)
- **Continuous testing** during approval window
- **Only monitors active ElevenLabs agents**
- **Multi-agent threshold** (requires ≥2 agents or ≥50% failure rate)
- **Full SuperAdmin dashboard integration**

## What Was Implemented

### 1. Database Schema ✅
- `TwilioAccount` - Store multiple Twilio accounts (primary + backups)
- `TwilioFailoverEvent` - Track all failover events
- `TwilioHealthCheck` - Store health check history
- `TwilioBackupPhoneNumber` - Manage backup phone number pool
- Updated `VoiceAgent` with `twilioAccountId`, `backupPhoneNumber`, `healthStatus`

### 2. Core Services ✅

#### Health Monitoring (`lib/twilio-failover/health-monitor.ts`)
- Filters agents: Only monitors active ElevenLabs agents
- Verifies agents exist in ElevenLabs API
- Checks Twilio account health
- Checks phone number status
- Calculates failure rates
- Detects critical vs degraded failures

#### Failover Service (`lib/twilio-failover/failover-service.ts`)
- Starts failover process with approval window
- Continuous testing during 10-minute window
- Auto-cancels if issue resolves
- Auto-approves after 10 minutes if still failing
- Executes failover (switches accounts, reconfigures agents)
- Updates ElevenLabs
- Updates Twilio webhooks
- Rollback capability

### 3. API Endpoints ✅
- `GET /api/admin/twilio-failover/health-check` - Run health check
- `POST /api/admin/twilio-failover/detect` - Detect if failover needed
- `POST /api/admin/twilio-failover/start` - Start failover process
- `POST /api/admin/twilio-failover/approve` - Approve pending failover
- `POST /api/admin/twilio-failover/rollback` - Rollback failover
- `GET/POST /api/admin/twilio-failover/accounts` - Manage accounts
- `GET /api/admin/twilio-failover/events` - Get failover events

### 4. SuperAdmin Dashboard Tabs ✅

#### Twilio Monitoring Tab
- View all Twilio accounts
- Run health checks
- See real-time health status
- View agent health details
- See failure rates and summaries

#### Failover Events Tab
- View all failover events
- See approval window countdown
- View test results during window
- Approve pending failovers
- Rollback completed failovers

#### Account Management Tab
- Add new Twilio accounts
- Set primary account
- View account details
- See agent and phone number counts

### 5. Background Monitoring ✅
- Cron job: `/api/cron/twilio-health-monitor`
- Runs every 2 minutes
- Automatically detects failures
- Starts failover process when needed

### 6. Notification System ✅
- Email notifications to all SUPER_ADMIN users
- Sent on failover start
- Sent on failover completion
- Includes event details and dashboard link

## How It Works

### Detection Flow

1. **Background Job** runs every 2 minutes
2. **Health Check** for all active Twilio accounts
3. **Agent Filtering**: Only checks agents that are:
   - `status = 'ACTIVE'` in database
   - Have `elevenLabsAgentId` set
   - Have `twilioPhoneNumber` set
   - Verified active in ElevenLabs API

4. **Failure Detection**:
   - **Critical**: Account hacked (401/403), suspended, all numbers deleted → Immediate failover
   - **Degraded**: ≥50% agents failing OR ≥2 agents failing → 10-minute approval window
   - **Minor**: Single agent/number issue → Alert only, no failover

### Approval Window Flow (Degraded Failures)

1. **Detection** triggers approval window
2. **Alert** sent to admins immediately
3. **Continuous Testing** every 30 seconds:
   - Test Twilio API
   - Test webhook delivery
   - Verify agent status
   - Check phone numbers

4. **Decision Points**:
   - If tests **PASS** during window → Cancel failover
   - If tests **CONTINUE FAILING** → Auto-approve after 10 minutes
   - Admin can **approve manually** at any time

### Failover Execution

1. **Lock system** (prevent new calls during transition)
2. **Switch active account** to backup
3. **Assign backup numbers** to agents
4. **Update database** records
5. **Reconfigure ElevenLabs**:
   - Import new phone numbers
   - Assign to existing agents
6. **Update Twilio webhooks** via API
7. **Test one agent** to verify
8. **Unlock system**
9. **Send notifications**

## Setup Instructions

### 1. Run Migration

```bash
npx prisma migrate dev --name add_twilio_failover
```

Or manually run the SQL in Neon SQL Editor:
- File: `prisma/migrations/20260209120000_add_twilio_failover/migration.sql`

### 2. Add Twilio Accounts

1. Go to SuperAdmin Dashboard → **Account Management** tab
2. Click **Add Account**
3. Enter:
   - Account Name (e.g., "Primary", "Backup 1")
   - Account SID
   - Auth Token
   - Check "Set as primary" if this is your main account

### 3. Add Backup Phone Numbers

You need to pre-purchase backup phone numbers in your backup Twilio account(s).

**Option A: Via Twilio Console**
1. Go to Twilio Console → Phone Numbers → Buy a Number
2. Purchase numbers for each active agent
3. They'll be automatically detected when you run health checks

**Option B: Via API** (Future enhancement)
- Create endpoint to sync phone numbers from Twilio

### 4. Configure Cron Job (Vercel)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/twilio-health-monitor",
    "schedule": "*/2 * * * *"
  }]
}
```

Set environment variable:
- `CRON_SECRET` - Random secret for cron authentication

### 5. Set Encryption Key

Set environment variable for token encryption:
- `ENCRYPTION_KEY` - 32-character key for AES-256 encryption

## Usage

### Monitor Health

1. Go to SuperAdmin Dashboard → **Twilio Monitoring** tab
2. Select an account
3. Click refresh icon to run health check
4. View health status and agent details

### View Failover Events

1. Go to SuperAdmin Dashboard → **Failover Events** tab
2. See all failover events
3. For pending events:
   - View countdown timer
   - See test results during approval window
   - Click "Approve Failover" to approve immediately
4. For completed events:
   - Click "Rollback" to switch back to primary account

### Manual Failover

1. Go to SuperAdmin Dashboard → **Twilio Monitoring** tab
2. Run health check
3. If failover is needed, click "Start Failover" (future enhancement)
4. Or use API: `POST /api/admin/twilio-failover/start`

## Safety Features

✅ **False Positive Prevention**
- Multiple detection methods must agree
- Continuous testing during approval window
- Minimum threshold: ≥2 agents or ≥50% affected
- Rate limiting: Max 1 failover per hour

✅ **Single Agent Protection**
- Single agent/number issues don't trigger failover
- Only system-wide failures trigger failover

✅ **Rollback Capability**
- One-click rollback to primary account
- Preserves all configurations
- Can switch back when primary restored

## Testing

### Test Health Check
```bash
curl -X GET "http://localhost:3000/api/admin/twilio-failover/health-check?accountId=ACCOUNT_ID" \
  -H "Cookie: YOUR_SESSION_COOKIE"
```

### Test Failover Detection
```bash
curl -X POST "http://localhost:3000/api/admin/twilio-failover/detect" \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"accountId": "ACCOUNT_ID"}'
```

### Test Manual Failover
```bash
curl -X POST "http://localhost:3000/api/admin/twilio-failover/start" \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"accountId": "ACCOUNT_ID", "triggerType": "MANUAL"}'
```

## Important Notes

1. **Token Encryption**: Auth tokens are encrypted using AES-256. Set `ENCRYPTION_KEY` environment variable.

2. **Backup Numbers**: You must pre-purchase backup phone numbers. The system will assign them automatically during failover.

3. **ElevenLabs Integration**: The system automatically reconfigures ElevenLabs agents with new phone numbers during failover.

4. **Webhook Updates**: Twilio webhooks are updated automatically via API during failover.

5. **Monitoring Frequency**: Background job runs every 2 minutes. Adjust in Vercel cron configuration.

6. **Approval Window**: 10 minutes for degraded failures. Critical failures execute immediately.

## Future Enhancements

- [ ] SMS notifications in addition to email
- [ ] In-app notification system
- [ ] Automatic phone number purchasing
- [ ] Phone number porting between accounts
- [ ] More granular health check options
- [ ] Health check history charts
- [ ] Failover event analytics

## Support

For issues or questions:
1. Check SuperAdmin Dashboard → Twilio Monitoring for health status
2. Check Failover Events tab for event history
3. Review server logs for detailed error messages
4. Check Vercel cron job logs for background monitoring status
