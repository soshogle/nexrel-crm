# Theodora Website — Full French Translation

## Summary

When a visitor selects French via the language switcher (EN | FR), the website should display 100% in French. This document describes what was implemented and what remains.

---

## ✅ Implemented

### 1. Navigation & Tab Menu
- **Layout.tsx**: `resolveNavLabel` now prefers i18n translations over CRM pageLabels, so nav items (Selling, Buying, Renting, About, etc.) display in French when FR is selected.
- **Videos & Podcasts**: Added to `HREF_TO_I18N_KEY` and translation files.

### 2. Secret Properties & Reports Page
- **SecretProperties.tsx**: All hardcoded strings replaced with `useTranslation()` and `secretReports.*` keys.
- **en.json / fr.json**: Added full `secretReports` namespace (page labels, form labels, report type labels, section headers, toasts, etc.).

### 3. Contact Form & Inquiries
- **Contact.tsx**: Passes `language` (from `nexrel-lang` localStorage) when submitting.
- **routers.ts**: `inquiries.submit` accepts `language` and forwards to CRM webhook.
- **website-inquiry webhook**: Stores `preferredLanguage` in lead `enrichedData` for use by campaigns/workflows.

### 4. Secret Report Unlock
- **SecretProperties.tsx**: Passes `language` when unlocking a report.
- **secret-reports/unlock API**: Stores `preferredLanguage` in lead `enrichedData`.

### 5. i18n Setup
- **i18n/index.ts**: Already uses `nexrel-lang` in localStorage; LanguageSwitcher and i18n stay in sync.

---

## 🔄 Campaigns & Workflows (Use preferredLanguage)

When sending emails or SMS **to the lead** (visitor), use their `preferredLanguage` from `enrichedData`:

```ts
const lang = lead.enrichedData?.preferredLanguage || 'en';
// Use lang when generating email/SMS content (e.g. AI prompts, template selection)
```

- **lib/website-triggers.ts**: Check if triggers pass language to email/SMS generation.
- **lib/campaign-triggers.ts**: Ensure campaign emails use lead's preferred language.
- **Email/SMS templates**: Consider French variants or AI translation based on `preferredLanguage`.

---

## 📋 Listings Descriptions

Property listings (title, description, etc.) come from Centris sync and are typically in the source language (often French for Québec). Options:

1. **Keep as-is**: If Centris returns French, listings are already in French.
2. **AI translation**: Add a step to translate descriptions when `lang=fr` is requested (or store both en/fr).
3. **Per-website language**: Store preferred display language per website and translate on fetch.

---

## 🚀 Deploy

1. **CRM (nexrel-crm)**: Deploy the updated `website-inquiry` and `secret-reports/unlock` routes.
2. **Template (nexrel-service-template)**: Run `SYNC=1 npx tsx scripts/deploy-theodora.ts` to sync template changes to Theodora-Stavropoulos-Remax, then push to GitHub for Vercel deploy.

---

## 📁 Files Changed

### nexrel-service-template (template)
- `client/src/components/Layout.tsx` — nav label resolution
- `client/src/i18n/en.json` — `secretReports`, `nav.videos`, `nav.podcasts`
- `client/src/i18n/fr.json` — same
- `client/src/pages/SecretProperties.tsx` — full i18n
- `client/src/pages/Contact.tsx` — pass language on submit
- `server/routers.ts` — inquiries.submit accepts language

### nexrel-crm (CRM)
- `app/api/webhooks/website-inquiry/route.ts` — store preferredLanguage
- `app/api/websites/[id]/secret-reports/unlock/route.ts` — store preferredLanguage
