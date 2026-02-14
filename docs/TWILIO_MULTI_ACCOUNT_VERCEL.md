# Twilio Multi-Account Setup (Vercel)

## Environment Variables

Add these to your Vercel project (Settings → Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_PRIMARY_ACCOUNT_SID` | Primary Twilio account (Account SID, starts with AC) | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_PRIMARY_AUTH_TOKEN` | Primary account auth token (from Twilio Console) | `your_auth_token` |
| `TWILIO_BACKUP_ACCOUNT_SID` | Backup Twilio account (for failover / when primary has no numbers) | `ACyyyyyyyy...` |
| `TWILIO_BACKUP_AUTH_TOKEN` | Backup account auth token | `your_backup_token` |

### Legacy (single account)

If you only have one account, you can still use:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

The system falls back to these when no TwilioAccount records exist.

## Updating Credentials After Compromise

If your primary account was compromised and you rotated the auth token:

1. In Twilio Console → Account → Auth Tokens: create a new token, revoke the old one
2. In Vercel: update `TWILIO_PRIMARY_AUTH_TOKEN` with the new value
3. Redeploy (or wait for next deploy)
4. Re-run the seed script if you use TwilioAccount records: `npx tsx scripts/seed-twilio-accounts.ts`

The Account SID typically does not change when rotating credentials.

## Running the Seed Script

After setting env vars locally or in Vercel, run:

```bash
npx tsx scripts/seed-twilio-accounts.ts
```

This creates/updates TwilioAccount records for primary and backup. Credentials are read from env at runtime—nothing is stored in the database.

## How It Works

- **Primary**: Used for search and purchase by default
- **Backup**: Used when primary returns no numbers, or during failover when primary is down
- **Search fallback**: If primary has no numbers for an area code, backup is searched automatically
- **Purchase**: Uses the account that had the search results
