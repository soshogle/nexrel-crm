# Vercel Environment Variables Setup

## Issue Fixed

The `vercel.json` file was referencing secrets that don't exist in Vercel. These have been removed.

## Setting Environment Variables in Vercel

Environment variables should be set directly in the Vercel dashboard, not referenced as secrets in `vercel.json`.

### Step 1: Go to Environment Variables Settings

```
https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/settings/environment-variables
```

### Step 2: Add Required Variables

Add these environment variables (if needed for your deployment):

**Orthanc DICOM Server (if using):**
- `ORTHANC_BASE_URL` - e.g., `http://localhost:8042` or your production URL
- `ORTHANC_USERNAME` - e.g., `orthanc`
- `ORTHANC_PASSWORD` - e.g., `orthanc`
- `ORTHANC_HOST` - e.g., `localhost` or your server IP
- `ORTHANC_PORT` - e.g., `8042`

**DICOM Configuration:**
- `DICOM_WEBHOOK_SECRET` - Secret for webhook validation
- `DICOM_AE_TITLE` - e.g., `NEXREL-CRM`

**Other Required Variables:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth
- `NEXTAUTH_URL` - Your app URL
- Any other variables your app needs

### Step 3: Set for Each Environment

For each variable:
- ✅ **Production** - Check if needed in production
- ✅ **Preview** - Check if needed in preview builds
- ✅ **Development** - Check if needed locally

### Step 4: Save and Redeploy

After adding variables:
1. Click **"Save"**
2. Go to Deployments
3. Redeploy your latest commit

---

## Note

These environment variables are only needed if you're actually using Orthanc DICOM server. If not, you can skip adding them - the app will work without them.

The deployment should now work without the secret reference errors!
