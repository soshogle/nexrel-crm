# Mock Data Seed Script for orthodontist@nexrel.com

This script creates comprehensive mock CRM data for testing the voice agent visualization features.

## What it creates:

- **30 Leads** - Various statuses (NEW, CONTACTED, QUALIFIED, CONVERTED, LOST)
- **15 Deals** - With activities, values ranging from $2,000-$8,000
- **8 Campaigns** - Email/SMS/Voice campaigns with leads and messages
- **50 Messages** - Email and SMS messages (inbound/outbound)
- **40 Call Logs** - Call history with various statuses

## How to run:

```bash
npx tsx scripts/seed-orthodontist-mock-data.ts
```

Or if tsx doesn't work:

```bash
npm run seed
```

Then modify `scripts/seed.ts` to call the orthodontist script, or run directly:

```bash
node --loader tsx scripts/seed-orthodontist-mock-data.ts
```

## Notes:

- The script will **delete existing data** for orthodontist@nexrel.com before creating new data
- All data is created with realistic dates spanning the last 6 months
- The script includes proper error handling and summary output

## After running:

1. Log in as orthodontist@nexrel.com
2. Go to the AI Brain page
3. Click "Show CRM Statistics" button
4. Or ask the voice agent: "What are my CRM statistics?"
5. You should see charts and graphs displaying the mock data
