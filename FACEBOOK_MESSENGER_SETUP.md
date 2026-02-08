# Facebook Messenger Setup Guide

This guide will walk you through getting your Facebook App ID and Secret, and configuring them in Vercel for Messenger integration.

## Step 1: Create a Facebook App

1. **Go to Meta for Developers**
   - Visit: https://developers.facebook.com/
   - Log in with your Facebook account

2. **Create a New App**
   - Click "My Apps" in the top right
   - Click "Create App"
   - Select **"Business"** as the app type
   - Click "Next"

3. **Fill in App Details**
   - **App Name**: Enter a name (e.g., "Nexrel CRM")
   - **App Contact Email**: Your business email
   - **Business Account**: Select or create a Meta Business account
   - Click "Create App"

## Step 2: Add Messenger Product

1. **In your app dashboard**, find "Messenger" in the products list
2. Click "Set Up"
3. Follow the setup wizard

## Step 3: Get Your App ID and Secret

1. **Go to Settings → Basic** in your app dashboard
2. You'll see:
   - **App ID**: A numeric ID (e.g., `123456789012345`)
   - **App Secret**: Click "Show" to reveal it (e.g., `abcdef1234567890abcdef1234567890`)
3. **Copy both values** - you'll need them for Vercel

## Step 4: Configure OAuth Redirect URIs

1. **Go to Facebook Login → Settings** (in the left sidebar)
2. **Add Valid OAuth Redirect URIs**:
   ```
   https://yourdomain.com/api/soshogle/oauth/facebook/callback
   https://yourdomain.com/api/soshogle/facebook/oauth/callback
   https://yourdomain.com/api/messaging/connections/facebook/callback
   ```
   Replace `yourdomain.com` with your actual Vercel domain (e.g., `nexrel.soshogleagents.com`)

3. **For local development**, also add:
   ```
   http://localhost:3000/api/soshogle/oauth/facebook/callback
   http://localhost:3000/api/soshogle/facebook/oauth/callback
   http://localhost:3000/api/messaging/connections/facebook/callback
   ```

4. Click "Save Changes"

## Step 5: Request Required Permissions

1. **Go to App Review → Permissions and Features**
2. **Request the following permissions**:
   - `pages_messaging` - Send and receive messages
   - `pages_manage_metadata` - Manage page metadata
   - `pages_read_engagement` - Read page engagement data
   - `pages_manage_engagement` - Manage page engagement

3. **Note**: Some permissions require App Review if your app is in Live mode. For Development mode, you can use them immediately with test users.

## Step 6: Configure Webhook (Optional but Recommended)

1. **Go to Messenger → Settings** in your app dashboard
2. **Under Webhooks**, click "Add Callback URL"
3. **Callback URL**: `https://yourdomain.com/api/facebook/messenger-webhook`
4. **Verify Token**: Create a secure random string (e.g., `soshogle_messenger_verify_token_2024`)
5. **Subscription Fields**: Select:
   - `messages`
   - `messaging_postbacks`
   - `messaging_optins`
   - `message_deliveries`
   - `message_reads`
6. Click "Verify and Save"

## Step 7: Add Environment Variables in Vercel

1. **Go to your Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Go to Settings → Environment Variables**

3. **Add the following variables**:

   | Variable Name | Value | Description |
   |--------------|-------|-------------|
   | `FACEBOOK_APP_ID` | Your App ID from Step 3 | The Facebook App ID (numeric) |
   | `FACEBOOK_APP_SECRET` | Your App Secret from Step 3 | The Facebook App Secret (keep this secret!) |
   | `FACEBOOK_VERIFY_TOKEN` | Your webhook verify token | The token you set in Step 6 (optional, defaults to `soshogle_messenger_verify_token`) |
   | `NEXTAUTH_URL` | Your production URL | e.g., `https://nexrel.soshogleagents.com` |

4. **For each variable**:
   - Click "Add New"
   - Enter the variable name
   - Enter the value
   - Select environments: **Production**, **Preview**, and **Development** (if needed)
   - Click "Save"

5. **Alternative Variable Names** (also supported):
   - `FACEBOOK_CLIENT_ID` (instead of `FACEBOOK_APP_ID`)
   - `FACEBOOK_CLIENT_SECRET` (instead of `FACEBOOK_APP_SECRET`)

## Step 8: Redeploy Your Application

After adding environment variables:

1. **Go to Deployments** in Vercel
2. Click the **three dots** (⋯) on your latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger automatic deployment

## Step 9: Test the Integration

1. **Go to your CRM dashboard**
2. **Navigate to Settings → Messaging Connections** (or wherever you connect Facebook)
3. **Click "Connect Facebook"**
4. **Authorize the app** when redirected to Facebook
5. **Select the Facebook Page** you want to connect
6. **Grant permissions** (pages_messaging, etc.)
7. **Verify** that the connection appears as "Connected"

## Troubleshooting

### Error: "Facebook OAuth not configured"
- **Solution**: Make sure `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` are set in Vercel
- **Check**: Go to Vercel → Settings → Environment Variables

### Error: "Invalid redirect_uri"
- **Solution**: Make sure your callback URLs are added in Facebook App → Facebook Login → Settings
- **Check**: The redirect URI must match exactly (including `https://`)

### Error: "Webhook verification failed"
- **Solution**: Make sure `FACEBOOK_VERIFY_TOKEN` matches what you set in Facebook App → Messenger → Webhooks
- **Check**: Both values must be identical

### Messages not being received
- **Solution**: 
  1. Verify webhook is configured correctly
  2. Check that your Facebook Page is connected
  3. Ensure the page has messaging enabled
  4. Check Vercel logs for webhook errors

## Security Notes

⚠️ **IMPORTANT**:
- Never commit your `FACEBOOK_APP_SECRET` to Git
- Keep your App Secret confidential
- Use different App IDs/Secrets for development and production if possible
- Regularly rotate your App Secret for security

## Additional Resources

- [Facebook Developer Documentation](https://developers.facebook.com/docs/messenger-platform)
- [Meta for Developers](https://developers.facebook.com/)
- [Facebook App Dashboard](https://developers.facebook.com/apps/)
