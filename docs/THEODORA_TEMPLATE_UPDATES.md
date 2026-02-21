# Theodora Template (Theodora-Stavropoulos-Remax) — Required Updates

This doc describes changes needed in the **Theodora-Stavropoulos-Remax** template repo so Theodora's live site works correctly. The template is a separate repo; these updates must be applied there.

---

## 1. Blog: Use Website-Scoped API (Not Nexrel Landing Content)

**Problem:** Theodora's blog page shows Nexrel CRM landing page posts. Those belong in the admin dashboard / landing page, not on broker sites.

**Fix:** Fetch blog from the website-scoped API instead of `/api/blog`.

The agency-config now returns `blogApiUrl`:
```json
{
  "blogApiUrl": "https://nexrel.soshogle.com/api/websites/cmlpuuy8a0001pu4gz4y97hrm/blog",
  ...
}
```

**Template change:**
- When rendering the blog page, fetch from `config.blogApiUrl` (from agency-config) instead of `${NEXREL_CRM_URL}/api/blog`
- Pass `x-website-secret: WEBSITE_VOICE_CONFIG_SECRET` in the request headers
- The website-scoped API returns only posts for that broker (empty until per-website posts are added)

---

## 2. Property Evaluation: Add /market-appraisal Route

**Problem:** Theodora's site shows 404 for Property Evaluation. The nav links to `/market-appraisal` but the template may not have that route.

**Fix:** Ensure the template has a route for `/market-appraisal` that renders the property evaluation form.

- The CRM's agency-config normalizes `/Evaluation`, `/evaluation`, `/property-evaluation` → `/market-appraisal` in nav links
- The template must implement the `/market-appraisal` page (form for address, beds, baths; submits to CRM property-evaluation API)

---

## 3. "Open Property Evaluation" Link (CRM Real Estate Hub)

The link in the CRM opens `{vercelDeploymentUrl}/market-appraisal`. Ensure:
- `vercelDeploymentUrl` is set correctly on Theodora's Website in the CRM (e.g. `https://theodora-stavropoulos-remax.vercel.app`)
- The template has the `/market-appraisal` route (see #2)

If you see `index-*.js` 404 or WebSocket to localhost when clicking the link:
- The WebSocket to localhost is from the CRM dev server (ignore)
- The 404 is from Theodora's site — the `/market-appraisal` route is missing in the template
