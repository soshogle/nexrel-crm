# Vercel Deployment Guide for Nexrel CRM

## Prerequisites
- **Vercel Pro Plan** ($20/month) - Required for 512+ serverless functions
- GitHub repository with your code
- PostgreSQL database (can use existing Abacus.AI database)

## Step 1: Push Code to GitHub

```bash
# If not already a git repo
git init
git add .
git commit -m "Prepare for Vercel deployment"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/nexrel-crm.git
git push -u origin main
```

## Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select "Next.js" as framework (should auto-detect)
5. Set **Root Directory** to: `nextjs_space`

## Step 3: Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Your Vercel domain (e.g., `https://nexrel-crm.vercel.app`) |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` to generate |

### Voice AI (Required for Voice Features)
| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | From Twilio Console |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number |
| `ELEVENLABS_API_KEY` | From ElevenLabs Dashboard |

### Optional
| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | For email notifications |
| `GOOGLE_CLIENT_ID` | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth |

## Step 4: Deploy

Click "Deploy" - Vercel will:
1. Install dependencies
2. Generate Prisma client
3. Build the Next.js app
4. Deploy to edge network

## Step 5: Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your domain (e.g., `crm.yourdomain.com`)
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to match

## Troubleshooting

### Build Fails
- Check build logs for specific errors
- Ensure all env vars are set
- Verify DATABASE_URL is accessible from Vercel

### 500 Errors on API Routes
- Check Function Logs in Vercel dashboard
- Verify database connection
- Check env vars are correct

### Auth Issues
- Ensure `NEXTAUTH_URL` matches your Vercel domain exactly
- Regenerate `NEXTAUTH_SECRET` if needed

## Database Note

You can continue using your existing Abacus.AI PostgreSQL database:
- The `DATABASE_URL` from your current `.env` works on Vercel
- No migration needed - same database, different frontend host
