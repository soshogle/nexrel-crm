# Deploy Owner Website to Vercel (Darksword Armory)

This guide walks you through deploying the Darksword Armory clone using the monorepo structure.

---

## Prerequisites

- [x] Neon database created and seeded (367 products, 62 categories, etc.)
- [x] GitHub repo: `soshogle/nexrel-crm`
- [x] Site code at: `owner-websites/eyal-darksword/`

---

## Step 1: Push to GitHub

Ensure your latest changes are pushed:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
git add owner-websites/
git status   # Verify eyal-darksword is included
git commit -m "Add owner-websites structure, Darksword Armory"
git push origin main
```

---

## Step 2: Import to Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Click **Import** next to your `nexrel-crm` repository (or paste `https://github.com/soshogle/nexrel-crm`)
3. Click **Import**

---

## Step 3: Configure Project Settings

Before deploying, set these:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Other |
| **Root Directory** | `owner-websites/eyal-darksword` ← **Important** |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install --legacy-peer-deps` |

To set Root Directory: click **Edit** next to it, then enter `owner-websites/eyal-darksword`.

---

## Step 4: Add Environment Variables

Click **Environment Variables** and add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_bwZPRS9fOvU0@ep-empty-sea-aikfkq4m-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | `e9b5cc5df9f4271eec260aa1b61ed09249c128d8b9ed3afdd84714d7ba601d7e` |
| `VITE_APP_TITLE` | `Darksword Armory` |
| `VITE_APP_LOGO` | `/darksword-logo.svg` |

Select **Production**, **Preview**, and **Development** for each.

---

## Step 5: Deploy

1. Click **Deploy**
2. Wait for the build to complete (~2–3 minutes)
3. Your site will be live at `https://your-project.vercel.app`

---

## Step 6: Verify

- [ ] Homepage loads with hero and product carousel
- [ ] Shop page shows products with images and prices
- [ ] Category navigation works (Medieval Swords, Armors, etc.)
- [ ] Product detail page shows variation selector
- [ ] Add to cart works
- [ ] Checkout form submits

---

## Custom Domain (Optional)

1. In Vercel: **Settings** → **Domains**
2. Add your domain (e.g. `darksword-armory.com`)
3. Follow DNS instructions to point to Vercel

---

## Future Owners

To add another owner site:

1. Copy `owner-websites/eyal-darksword` to `owner-websites/owner2-site`
2. Replace `data/` with new owner's product data
3. Create a new Neon database for the owner
4. Run `db:push` and `seed-db.mjs` in the new folder
5. Create a **new Vercel project** for the same repo, Root Directory = `owner-websites/owner2-site`
6. Add the new owner's env vars (different DATABASE_URL, branding)
