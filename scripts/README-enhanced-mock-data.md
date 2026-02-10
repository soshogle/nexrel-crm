# Enhanced CRM Mock Data Script

This script creates comprehensive mock data for testing the conversation AI's ability to generate graphs and charts.

## What Data is Created

### 1. Sales Pipeline
- **1 Default Pipeline** with 7 stages:
  - Lead (10% probability)
  - Qualified (25% probability)
  - Consultation (50% probability)
  - Proposal (75% probability)
  - Negotiation (85% probability)
  - Won (100% probability)
  - Lost (0% probability)

### 2. Leads (50 total)
- Various statuses: NEW, CONTACTED, QUALIFIED, CONVERTED, LOST
- Different sources: Website, Referral, Social Media, Google Ads, etc.
- Spread across the past year

### 3. Deals (65 total)
- Distributed across pipeline stages:
  - Lead: 8 deals
  - Qualified: 10 deals
  - Consultation: 12 deals
  - Proposal: 8 deals
  - Negotiation: 6 deals
  - Won: 15 deals (with actualCloseDate set)
  - Lost: 6 deals (with actualCloseDate and lostReason)
- Deal values: $1,500 - $12,000
- Each deal has 2-6 activities (calls, emails, meetings, notes)

### 4. Payments (20+ total)
- **12-36 payments** linked to Won deals (1-3 payments per deal)
- **8 standalone payments** for services/appointments
- Payment statuses: Mostly SUCCEEDED, some PENDING/PROCESSING
- Payment types: DEAL, INVOICE, SERVICE, APPOINTMENT, OTHER
- Payment methods: card, ach, bank_transfer
- Includes receipt URLs and receipt numbers for successful payments

### 5. Campaigns (12 total)
- Various types: EMAIL, SMS, VOICE
- Different statuses: DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED
- Each campaign linked to multiple leads

### 6. Messages (75 total)
- Mix of EMAIL and SMS
- INBOUND and OUTBOUND
- Various statuses

### 7. Call Logs (60 total)
- Mix of INBOUND and OUTBOUND calls
- Various durations and statuses
- Some with recording URLs

## How to Run

```bash
# Using tsx (recommended)
npx tsx scripts/seed-enhanced-crm-mock-data.ts

# Or using ts-node
npx ts-node scripts/seed-enhanced-crm-mock-data.ts
```

## Testing Queries

After running the script, you can test the conversation AI with queries like:

- "Show me my sales pipeline"
- "What's my total revenue?"
- "How many deals do I have in each stage?"
- "Show me payment statistics"
- "Display my sales performance"
- "What's my conversion rate?"
- "Show me deals by stage"
- "How much revenue have I collected?"

## Notes

- This script **clears all existing data** for the user before creating new data
- Data is created for: `orthodontist@nexrel.com`
- All dates are randomized within the past 6-12 months
- Payment amounts are realistic for orthodontic treatments
- Deal values and payment amounts are properly linked
