# Deploy Owner Website to Vercel (Darksword Armory)

**Architecture:** Owner websites are **separate from nexrel-crm**. Each website has its own GitHub repo. Commits and deployments happen in the owner's repo, not in nexrel-crm.

- **nexrel-crm** = CRM only (do not touch for website changes)
- **Darksword Armory** = `https://github.com/soshogle/darksword-armory` (all website commits go here)

---

## Prerequisites

- [x] Neon database created and seeded (367 products, 62 categories, etc.)
- [x] GitHub repo: `soshogle/darksword-armory` (owner's repo, not nexrel-crm)
- [x] Site code: clone and work from the darksword-armory repo

---

## Step 1: Work in the Owner's Repo

All commits must go to the website owner's GitHub repo:

```bash
# Clone the owner's repo (if not already)
git clone https://github.com/soshogle/darksword-armory.git
cd darksword-armory

# Make changes, then commit and push
git add .
git commit -m "Your change description"
git push origin main
```

**Do NOT** commit website code to nexrel-crm. The website is separate.

---

## Step 2: Import to Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Click **Import** next to `soshogle/darksword-armory` (or paste the repo URL)
3. Click **Import**

---

## Step 3: Configure Project Settings

Before deploying, set these:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Other |
| **Root Directory** | (leave empty – repo root is the site) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install --legacy-peer-deps` |

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

1. Create a new GitHub repo for the owner (e.g. `soshogle/owner2-website`)
2. Clone/copy the darksword-armory template, replace `data/` with new owner's product data
3. Create a new Neon database for the owner
4. Run `db:push` and `seed-db.mjs` in the new repo
5. Create a **new Vercel project** connected to the owner's repo
6. Add the new owner's env vars (different DATABASE_URL, branding)
