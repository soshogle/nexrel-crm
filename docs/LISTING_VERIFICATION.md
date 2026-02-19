# Listing Verification

When listings disappear from Realtor.ca or Centris.ca scrape results, we verify them by fetching the property detail page directly before updating the database. We only mark a listing as sold/rented when the source page confirms it.

## Flow

1. **Sync runs** — Fetches current listings from Apify (Realtor/Centris).
2. **Import** — Upserts listings into broker DB.
3. **Identify candidates** — Listings in DB with `slug LIKE 'realtor-%'` or `centris-%` that are NOT in the scrape results.
4. **Verify** — For each candidate, fetch `original_url` (the property detail page).
5. **Parse** — Look for status indicators in the HTML (Sold, Rented, No longer available, 404).
6. **Update** — Only when we get a clear status, update the listing in the DB.

## Status detection

### Realtor.ca

- **Sold:** "Sold Over Asking", "Sold Under Asking", "Listing no longer available", "Listing not found", etc.
- **Rented:** "Rented", "No longer available for rent"
- **404:** Page not found → treated as sold (sale) or rented (rent)

### Centris.ca

- **Sold:** "Vendu", "Sold", "Cette annonce n'est plus disponible"
- **Rented:** "Loué", "Rented"
- **404:** Same as Realtor

## Rate limiting

- 1.5 second delay between fetches to avoid rate limits.
- 15 second timeout per request.
- 2 retries on failure.

## Unknown status

If we can't fetch the page (timeout, block) or can't parse a clear status, we leave the listing as `active`. No update is made.

## Apify fallback (future)

If direct fetch is blocked by Realtor.ca or Centris.ca, we could add an Apify actor (e.g. `mtrunkat/url-list-download-html`) to fetch the URLs via proxy and parse the HTML.
