# Google Calendar OAuth Setup

If you see **"Error 400: redirect_uri_mismatch"** when connecting Google Calendar, the redirect URI must be added to your Google Cloud Console.

## Fix: Add Redirect URI to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **APIs & Services** → **Credentials**
4. Click your **OAuth 2.0 Client ID** (or create one: "Create Credentials" → "OAuth client ID")
5. Under **Authorized redirect URIs**, click **+ ADD URI**
6. Add this exact URI (replace with your actual domain):

   ```
   https://www.nexrel.soshogle.com/api/calendar/google-oauth/callback
   ```

7. If your app uses a different domain (e.g. without `www`), add that too:

   ```
   https://nexrel.soshogle.com/api/calendar/google-oauth/callback
   ```

8. Click **Save**

## Verify Your Redirect URI

Your redirect URI is built from `NEXTAUTH_URL` or `GOOGLE_CALENDAR_REDIRECT_URI`:

- **Default**: `{NEXTAUTH_URL}/api/calendar/google-oauth/callback`
- **Override**: Set `GOOGLE_CALENDAR_REDIRECT_URI` in `.env` or Vercel

Example: If `NEXTAUTH_URL=https://www.nexrel.soshogle.com`, the redirect URI is:
```
https://www.nexrel.soshogle.com/api/calendar/google-oauth/callback
```

## Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console → Credentials |
| `NEXTAUTH_URL` | Yes | Your app URL (e.g. `https://www.nexrel.soshogle.com`) |
| `GOOGLE_CALENDAR_REDIRECT_URI` | No | Override if different from `{NEXTAUTH_URL}/api/calendar/google-oauth/callback` |

## Enable Google Calendar API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Google Calendar API**
3. Click **Enable**

## Common Issues

- **www vs non-www**: Add both redirect URIs if your domain serves both
- **Trailing slash**: Do NOT add a trailing slash to the redirect URI
- **HTTP vs HTTPS**: Use `https://` in production
- **Local development**: Add `http://localhost:3000/api/calendar/google-oauth/callback` for local testing
