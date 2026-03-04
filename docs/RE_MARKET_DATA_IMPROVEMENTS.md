# Real Estate Market Data — Where It Could Be Used Next

REMarketStats (Centris + JLR) and `getMarketContext()` are the source of truth for live market data. This document tracks where market data could be enhanced or added next.

## Current Uses

- **RE Dashboard** — Market insights
- **Market Insights** — Dedicated market stats views
- **CMA** — `getMarketContext()` for valuations
- **Listing Presentations** — Market context
- **Buyer/Seller Reports** — `computeLiveMarketStats()`, `getMarketContext()`
- **Compute Live Stats** — From actual listings

## Where It Could Be Used Next

| Feature | Status | Implementation |
|---------|--------|----------------|
| **Property Evaluation** | ✅ Done | Uses `getLiveRegionalMedian()` from REMarketStats; falls back to hardcoded `REGIONAL_MEDIANS` when no data |
| **Market Report Generator** | ✅ Done | Auto-fetches from `getMarketContext()` when `marketData` is missing |
| **Stale Listing Diagnostic** | ✅ Done | Adds market context (median price, DOM, inventory) to AI prompt |
| **Voice Agent / CRM Calls** | ✅ Done | Fetches market stats when `context.region`/`context.city` provided; adds to dynamic variables; `get_statistics` includes marketStats for REAL_ESTATE |
| **AI Brain / Analytics** | ✅ Done | Includes market stats summaries (median price, sales volume) in left hemisphere for REAL_ESTATE |
| **Attraction Engine** | Already wired | Uses `centrisContext`; JLR data enriches via `getMarketContext` |
| **Workflow Tasks** | Already wired | CMA generation uses `getMarketContext` |
