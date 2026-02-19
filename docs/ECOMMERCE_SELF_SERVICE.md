# E-commerce Self-Service

Owners can edit content (products, pages, policies) in the website builder and see changes on the live site without redeploying. For products, they can update **prices**, **sizes**, **colors**, and **product definitions** (title, description, images, etc.).

## Architecture

1. **CRM** stores `Website.ecommerceContent` (products, pages, policies, videos)
2. **API** `GET /api/websites/[id]/ecommerce-content` serves content (auth: session or `x-website-secret`)
3. **Deployed site** fetches from CRM at runtime when `NEXREL_CRM_URL` + `NEXREL_WEBSITE_ID` are set
4. **Website builder** Content tab lets owners edit policy pages

## Setup

### 1. Run migration

```bash
npx prisma migrate deploy
```

### 2. Seed Darksword content

```bash
npm run seed:darksword-ecommerce
```

This exports products/pages from `owner-websites/eyal-darksword` and seeds **Eyal's** Darksword Armory website (eyal@darksword-armory.com).

### 2b. Link live site URL (one-time)

```bash
npx tsx scripts/set-darksword-armory-vercel-url.ts
```

Sets `vercelDeploymentUrl` to https://darksword-armory.vercel.app for Eyal's site.

### 3. Configure deployed site

In the e-commerce site `.env`:

```
NEXREL_CRM_URL=https://your-crm.nexrel.com
NEXREL_WEBSITE_ID=<website_id_from_seed>
WEBSITE_VOICE_CONFIG_SECRET=<same_as_crm>
```

### 4. Edit in dashboard

1. Go to Dashboard → Websites → [Your site]
2. Open the **Content** tab (PRODUCT template only)
3. Edit products (prices, sizes, colors, product definitions), Shipping, Privacy, Terms pages
4. Save — changes appear on the live site immediately

## API

- **GET** `/api/websites/[id]/ecommerce-content` — Returns `{ products, pages, videos, policies, siteConfig }`
- **PATCH** `/api/websites/[id]/ecommerce-content` — Update content (session auth)

## Data flow

```
[Website Builder] → PATCH ecommerce-content → [DB]
[Deployed Site]    → GET ecommerce-content  ← [DB] (via CRM API)
```
