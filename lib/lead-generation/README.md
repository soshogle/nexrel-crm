# AI Lead Generation System

Cost-optimized, fully automated lead generation system with multilingual Voice AI.

## Week 1: Foundation (Completed)

### ✅ Database Schema

Added to existing `Lead` model:
- `enrichedData` (JSON) - Company research, decision-makers
- `leadScore` (Int) - 0-100 weighted score
- `engagementHistory` (JSON) - Email opens, SMS replies, calls
- `nextAction` (String) - call, email, sms, manual_followup
- `nextActionDate` (DateTime) - When to execute next action
- `validationScore` (Int) - Data quality score
- `qualityFlag` (String) - low_quality, high_quality
- `mergeHistory` (JSON) - Track lead merges

New tables:
- `EnrichmentCache` - Cache API responses (90-day expiration)
- `LeadScore` - Track scoring history for analytics
- `OutreachLog` - Track all outreach attempts

### ✅ Lead Scoring Engine

**Rule-based scoring (0-100 scale):**

#### Firmographics (40%)
- Company size: 1-10 (10pts), 10-50 (15pts), 50+ (20pts)
- Industry match: High-value industries (10pts), Others (5pts)
- Business age: <1yr (10pts), 1-3yr (7pts), 3+yr (5pts)

#### Intent Signals (30%)
- Source: Inbound (15pts), Referral (13pts), Voice AI (12pts), LinkedIn (8pts), Google Maps (7pts), Scraped (5pts)
- Website behavior: Demo request (10pts), Pricing visit (7pts), Content download (5pts)
- Recency: Last 7 days (5pts), Last 30 days (3pts), Older (1pt)

#### Engagement (20%)
- Email: Replied (10pts), 3+ clicks (8pts), 1 click (5pts), 3+ opens (3pts), 1 open (1pt)
- SMS: Replied (5pts)
- Call: Answered (5pts)

#### Fit (10%)
- Budget: High (5pts), Medium (3pts), Low (1pt)
- Timeline: Immediate (5pts), 30-60 days (3pts), 90+ days (1pt)

#### Routing Logic
- **Score 80-100 (Hot):** Voice AI call within 1 hour
- **Score 60-79 (Warm):** Email + SMS sequence within 4 hours
- **Score 40-59 (Cool):** Email nurture within 24 hours
- **Score 0-39 (Cold):** Monthly check-in

### API Endpoints

#### Score a single lead
```bash
POST /api/lead-generation/score
{
  "leadId": "lead_id_here"
}
```

#### Batch score leads
```bash
POST /api/lead-generation/score
{
  "batch": true,
  "filter": {
    "source": "google_maps",
    "status": "NEW"
  }
}
```

#### Update score on event
```bash
POST /api/lead-generation/score/event
{
  "leadId": "lead_id_here",
  "eventType": "email_opened"
}
```

#### Get score history
```bash
GET /api/lead-generation/score?leadId=lead_id_here
```

## Usage Example

```typescript
import { calculateLeadScore } from '@/lib/lead-generation/lead-scoring';
import { scoreAndSaveLead } from '@/lib/lead-generation/lead-scoring-db';

// Calculate score (without saving)
const leadData = {
  companySize: '10-50',
  industry: 'technology',
  source: 'inbound',
  emailOpens: 3,
  emailClicks: 1
};

const result = calculateLeadScore(leadData);
console.log(result);
// {
//   score: 67,
//   breakdown: { firmographics: 25, intent: 15, engagement: 5, fit: 0, total: 67 },
//   routing: { action: 'email_sms', priority: 'warm', nextActionDate: ... }
// }

// Score and save to database
const result = await scoreAndSaveLead('lead_id_here');
```

## Cost Optimization

1. **Batch Processing**: Score 100 leads at once
2. **No LLM Calls**: Pure mathematical calculation
3. **Caching**: Store scores in database
4. **Real-time Updates**: Incremental score adjustments on events

## Next Steps

- [ ] Google Maps Scraper
- [ ] Lead Deduplication
- [ ] LinkedIn Scraper
- [ ] ElevenLabs Voice AI
- [ ] Data Enrichment Pipeline

### ✅ Google Maps Scraper

**Features:**
- Playwright-based web scraper for Google Maps
- Extracts: name, phone, address, website, rating, reviews
- Daily cron job at 2 AM (off-peak)
- Volume: 100-200 leads/day per user
- Automatic scoring after scraping
- Duplicate detection

**API Endpoints:**
```bash
# Scrape Google Maps
POST /api/lead-generation/scrape/google-maps
{
  "queries": [
    { "query": "restaurants in New York", "maxResults": 50 }
  ]
}

# Get stats
GET /api/lead-generation/scrape/google-maps

# Daily cron job (manual trigger for testing)
GET /api/lead-generation/cron/scrape-daily?test=true
```

**Predefined Queries:**
- Restaurants in New York, NY
- Plumbers in Austin, TX
- Real estate agents in Miami, FL
- Dentists in San Francisco, CA
- Lawyers in Chicago, IL
- Auto repair shops in Los Angeles, CA
- HVAC contractors in Dallas, TX
- Fitness centers in Seattle, WA
