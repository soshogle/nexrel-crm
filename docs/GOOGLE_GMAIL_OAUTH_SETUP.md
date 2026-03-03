# Google Gmail OAuth Setup

If you see **"Error 400: redirect_uri_mismatch"** when connecting Gmail (e.g. during onboarding), the redirect URI must be added to your Google Cloud Console.

## Fix: Add Redirect URI to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **APIs & Services** → **Credentials**
4. Click your **OAuth 2.0 Client ID** (or create one: "Create Credentials" → "OAuth client ID")
5. Under **Authorized redirect URIs**, click **+ ADD URI**
6. Add this exact URI (replace with your actual domain from `NEXTAUTH_URL`):

   ```
   https://soshogle.com/api/gmail/oauth/callback
   ```

7. If your app uses `www` (e.g. `https://www.soshogle.com`), add that too:

   ```
   https://www.soshogle.com/api/gmail/oauth/callback
   ```

8. Click **Save**

## Verify Your Redirect URI

Your redirect URI is built from `NEXTAUTH_URL`:

- **Gmail**: `{NEXTAUTH_URL}/api/gmail/oauth/callback`

Example: If `NEXTAUTH_URL=https://soshogle.com`, the redirect URI is:
```
https://soshogle.com/api/gmail/oauth/callback
```

## Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console → Credentials |
| `NEXTAUTH_URL` | Yes | Your app URL (e.g. `https://soshogle.com`) |

## Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Gmail API**
3. Click **Enable**

## Common Issues

- **www vs non-www**: Add both redirect URIs if your domain serves both
- **Trailing slash**: Do NOT add a trailing slash to the redirect URI
- **HTTP vs HTTPS**: Use `https://` in production
- **Local development**: Add `http://localhost:3000/api/gmail/oauth/callback` for local testing
