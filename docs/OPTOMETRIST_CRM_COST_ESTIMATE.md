# Optometrist CRM — Monthly Cost Estimate (All Third-Party Services)

Ballpark figures for supporting an optometry practice in Nexrel CRM, including **all** APIs, infrastructure, and third-party services. Based on typical usage patterns and current pricing (2024–2025).

---

## Assumptions

| Scenario | Total Patients | Active (60%) | Inactive (40%) |
|----------|----------------|--------------|----------------|
| **Large** | 10,000 | 6,000 | 4,000 |
| **Medium** | 5,000 | 3,000 | 2,000 |
| **Small** | 1,000 | 600 | 400 |

**Usage assumptions:**
- **Active patients**: ~1 exam/year → ~8% of active base per month (appointments, reminders, follow-ups)
- **AI employees**: Appointment Scheduler, Patient Coordinator, Treatment Follow-up, Billing Specialist (optometrist prompts)
- **Features**: SMS reminders, email confirmations, AI voice calls, AI assistant chat, call summaries, workflows

---

## Services Used in Nexrel CRM

| Category | Services |
|----------|----------|
| **AI / LLM** | OpenAI, ElevenLabs |
| **Communications** | Twilio (SMS, voice), SendGrid |
| **Maps / Search** | Google Maps, Google Places, Google Custom Search |
| **Infrastructure** | Vercel (hosting), Neon (Postgres), Vercel Blob, Upstash Redis |
| **Data / Scraping** | Apify |
| **Optional** | Tavus (AI avatar), Stripe (payments), Sentry (errors) |

---

## Cost Breakdown by Service

### 1. OpenAI (Tokens)

**Models used in Nexrel:** `gpt-4o-mini` (primary), `gpt-4o` (complex tasks)

| Use Case | Est. per Month | Tokens (avg) | gpt-4o-mini Cost |
|----------|----------------|--------------|------------------|
| AI Assistant chat | 50–200 msgs/day | ~500 in + 200 out per msg |  |
| AI suggestions / insights | 20–50/day | ~2K in + 500 out |  |
| Call summaries | 30–80/month | ~8K in + 500 out |  |
| Workflow suggestions | 20–50/month | ~3K in + 500 out |  |
| Campaign generation | 5–15/month | ~5K in + 2K out |  |

**Pricing (gpt-4o-mini):** $0.15/1M input, $0.60/1M output  
**Pricing (gpt-4o):** $2.50/1M input, $10.00/1M output (used sparingly)

| Patient Count | Est. Monthly Tokens (approx) | ~OpenAI Cost |
|---------------|-----------------------------|--------------|
| 10,000 | 6–8M input, 2–3M output | **$60–120** |
| 5,000 | 3–4M input, 1–1.5M output | **$30–60** |
| 1,000 | 600K–1M input, 200–500K output | **$8–25** |

---

### 2. Twilio (SMS + Voice)

**SMS:** ~$0.0079/message (US)  
**Voice (outbound):** ~$0.014/min

| Use Case | 10K Patients | 5K Patients | 1K Patients |
|----------|---------------|-------------|-------------|
| Appointment reminders | ~500/mo | ~250/mo | ~50/mo |
| New patient follow-ups | ~60/mo | ~30/mo | ~10/mo |
| Treatment follow-ups | ~100/mo | ~50/mo | ~15/mo |
| Billing reminders | ~40/mo | ~20/mo | ~8/mo |
| **Total SMS** | **~700** | **~350** | **~85** |
| **SMS Cost** | **~$5.50** | **~$2.80** | **~$0.70** |
| Voice (AI calls) | ~80 calls × 4 min | ~40 × 4 min | ~15 × 4 min |
| **Voice Cost** | **~$4.50** | **~$2.25** | **~$0.85** |

| Patient Count | Twilio Cost |
|---------------|-------------|
| 10,000 | **~$10–15** |
| 5,000 | **~$5–8** |
| 1,000 | **~$2–4** |

---

### 3. SendGrid (Email)

**Pricing:** ~$0.00133/email overage; plans start ~$15/mo for 5K emails

| Use Case | 10K Patients | 5K Patients | 1K Patients |
|----------|---------------|-------------|-------------|
| Appointment confirmations | ~500/mo | ~250/mo | ~50/mo |
| Reminders | ~800/mo | ~400/mo | ~100/mo |
| New patient welcome | ~60/mo | ~30/mo | ~10/mo |
| Treatment follow-ups | ~100/mo | ~50/mo | ~15/mo |
| Billing / invoices | ~50/mo | ~25/mo | ~10/mo |
| **Total Email** | **~1,500** | **~750** | **~185** |

| Patient Count | SendGrid Cost |
|---------------|---------------|
| 10,000 | **~$15–25** (plan + overage) |
| 5,000 | **~$15–20** |
| 1,000 | **~$15** (base plan) |

---

### 4. ElevenLabs (Voice AI)

**Conversational AI:** ~$0.10/min (voice calls)

| Patient Count | Est. Voice Minutes/mo | ElevenLabs Cost |
|---------------|-----------------------|-----------------|
| 10,000 | 300–400 min | **~$30–40** |
| 5,000 | 150–200 min | **~$15–20** |
| 1,000 | 50–80 min | **~$5–8** |

---

### 5. Google (Maps, Places, Custom Search)

**Place Autocomplete:** ~$2.83/1K sessions (Places API)  
**Google Custom Search:** $5/1K queries (100 free/day)  
**Free credit:** ~$200/mo (often covers Maps/Places usage)

| Patient Count | Est. Usage/mo | Google Cost |
|---------------|---------------|-------------|
| 10,000 | 300–500 Places + 500–1K search | **~$3–8** |
| 5,000 | 150–250 + 500 search | **~$2–5** |
| 1,000 | 50–100 + 200 search | **~$0–2** |

---

### 6. Vercel (Hosting)

**Pro plan:** $20/mo + usage (serverless, bandwidth, Edge)  
**Included:** $20 credit, 1TB Fast Data Transfer, 10M Edge Requests  
**Overage:** Serverless execution, bandwidth, Blob (separate)

| Scenario | Est. Cost |
|----------|-----------|
| Single tenant (shared platform) | **~$20–50** (amortized if multi-tenant) |
| Dedicated platform | **~$50–150** (higher traffic, more functions) |

---

### 7. Neon (Postgres Database)

**Launch plan:** ~$0.106/CU-hour, $0.35/GB-month storage  
**Per-tenant:** Optometrist uses `DATABASE_URL_OPTOMETRIST`; may share `DATABASE_URL_META` for user/session

| Scenario | Est. Cost |
|----------|-----------|
| 1 optometrist DB (~0.5 GB, 50 CU-hrs) | **~$5–15** |
| 10K patients, ~2 GB storage | **~$8–20** |
| Multi-DB platform (16+ DBs) | **~$100–300** (shared across all tenants) |

---

### 8. Apify (Web Scraping)

**Pricing:** ~$0.30/CU (compute unit); Free = $5 credit  
**Use cases:** Lead research (AI employee), brand scraping, social media, FSBO (real estate), Centris sync

| Patient Count | Est. Usage/mo | Apify Cost |
|---------------|---------------|------------|
| 10,000 | 10–30 runs (lead research, etc.) | **~$5–15** |
| 5,000 | 5–15 runs | **~$3–10** |
| 1,000 | 2–8 runs | **~$0–5** (often within free tier) |

*Note: Optometrist uses less Apify than real estate (no FSBO/Centris).*

---

### 9. Vercel Blob (Storage)

**Pricing:** Per GB-month, per operation, per transfer  
**Use cases:** Property images, blog images, uploads, website assets

| Patient Count | Est. Storage | Est. Cost |
|---------------|--------------|-----------|
| 10,000 | 2–5 GB | **~$2–8** |
| 5,000 | 1–3 GB | **~$1–5** |
| 1,000 | 0.5–1 GB | **~$0–3** |

---

### 10. Upstash Redis

**Free tier:** 500K commands/mo, 256MB  
**Pay-as-you-go:** $0.20/100K commands  
**Use cases:** Rate limiting, caching

| Scenario | Est. Cost |
|----------|-----------|
| Typical (within free tier) | **$0** |
| Higher traffic (1M+ commands) | **~$2–5** |

---

### 11. Tavus (AI Avatar Video)

**Optional** — only if AI avatar is enabled on website  
**Starter:** ~$59/mo; usage-based per minute

| Scenario | Est. Cost |
|----------|-----------|
| Not used | **$0** |
| Light usage (5–10 min/mo) | **~$0–59** |
| Active (30+ min/mo) | **~$59–150** |

---

### 12. Other Services (Optional / Usage-Based)

| Service | Use Case | Typical Cost |
|---------|----------|--------------|
| **Stripe** | Payments, subscriptions | % of transaction (2.9% + $0.30) — not infra |
| **Sentry** | Error tracking | Free tier or ~$26/mo |
| **GitHub** | Template repos, provisioning | Free tier typical |
| **AWS S3** | Alternative to Blob (if used) | ~$0.023/GB |

---

## Summary: Monthly Cost by Patient Count

### Variable Costs (API usage — scales with patient count)

| Service | 10,000 Patients | 5,000 Patients | 1,000 Patients |
|---------|-----------------|----------------|----------------|
| **OpenAI** | $60–120 | $30–60 | $8–25 |
| **Twilio** | $10–15 | $5–8 | $2–4 |
| **SendGrid** | $15–25 | $15–20 | $15 |
| **ElevenLabs** | $30–40 | $15–20 | $5–8 |
| **Google** | $3–8 | $2–5 | $0–2 |
| **Apify** | $5–15 | $3–10 | $0–5 |
| **Vercel Blob** | $2–8 | $1–5 | $0–3 |
| **Upstash** | $0–5 | $0–2 | $0 |
| **Subtotal (variable)** | **$125–226** | **$71–130** | **$30–52** |

### Platform / Infrastructure (shared or fixed)

| Service | Est. Monthly Cost |
|---------|-------------------|
| **Vercel** | $20–50 (Pro plan + usage) |
| **Neon** | $5–20 (single tenant) or $100–300 (multi-DB platform) |
| **Tavus** (optional) | $0–59 |
| **Subtotal (platform)** | **$25–70** (single tenant) or **$120–370** (full platform) |

### Total Monthly Cost (All-In)

| Patient Count | Variable | Platform (single) | **Total** |
|---------------|----------|-------------------|-----------|
| **10,000** | $125–226 | $25–70 | **~$150–296** |
| **5,000** | $71–130 | $25–70 | **~$96–200** |
| **1,000** | $30–52 | $25–70 | **~$55–122** |

*Platform cost assumes single tenant or amortized per tenant. Full multi-tenant platform adds ~$100–300 for Neon (16+ DBs).*

---

## Per-Patient Cost (Approximate)

| Patient Count | Est. Monthly Total | Per Patient/Month |
|---------------|--------------------|--------------------|
| 10,000 | **~$150–296** | **$0.015–0.03** |
| 5,000 | **~$96–200** | **$0.019–0.04** |
| 1,000 | **~$55–122** | **$0.055–0.12** |

---

## Notes

1. **Variable costs** (OpenAI, Twilio, SendGrid, ElevenLabs, Apify, etc.) scale with usage and patient count.
2. **Platform costs** (Vercel, Neon) are shared across tenants; per-tenant allocation depends on how many practices use the platform.
3. **SendGrid** has a fixed base (~$15/mo); per-patient cost drops as volume grows.
4. **OpenAI** is usually the largest variable cost; AI assistant chat and call summaries add up quickly.
5. **Apify** is lighter for optometry than real estate (no FSBO/Centris). Serper is not used in the codebase; Google Custom Search is used instead.
6. **Tavus** is optional and only applies if AI avatar is enabled on the website.

---

## Conservative vs. High-Usage Scenarios

| Scenario | 10K Patients | 5K Patients | 1K Patients |
|----------|--------------|-------------|-------------|
| **Conservative** (minimal AI, no Tavus) | ~$150 | ~$96 | ~$55 |
| **Typical** | ~$220 | ~$145 | ~$85 |
| **High** (heavy AI, Tavus, full platform) | ~$296 | ~$200 | ~$122 |

---

*Pricing sources: OpenAI, Twilio, SendGrid, ElevenLabs, Google, Vercel, Neon, Apify, Upstash, Tavus (2024–2025). Actual costs may vary.*
